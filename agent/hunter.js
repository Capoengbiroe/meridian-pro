import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";
import { deployIntoPool } from "./deployer.js";

export async function runScreeningCycle(userId, config) {
  const { screening, trading, risk, wallet } = config;
  logInfo(userId, "hunter", "Screening cycle started (on-chain)...");

  try {
    // Dynamic import untuk hindari error ESM (pola CloddsBot)
    const { Connection } = await import("@solana/web3.js");
    const dlmmLib = await import("@meteora-ag/dlmm");
    const DLMM = dlmmLib.default || dlmmLib.DLMM;

    if (!DLMM) {
      logError(userId, "hunter", "DLMM SDK tidak tersedia");
      return { status: "error" };
    }

    const connection = new Connection(trading.rpcUrl || "https://api.mainnet-beta.solana.com");

    // 1. Ambil semua pool DLMM dari on-chain
    logInfo(userId, "hunter", "Menanyakan pool Meteora DLMM dari on-chain...");
    const pairs = await DLMM.getLbPairs(connection);

    if (!pairs || pairs.length === 0) {
      logWarn(userId, "hunter", "Tidak ada pool ditemukan on-chain");
      return { status: "no_candidates" };
    }

    // 2. Filter pool yang menarik (punya SOL sebagai salah satu token)
    const minTvl = screening && screening.minTvl ? screening.minTvl : 0;
    const viablePools = [];

    for (const pair of pairs) {
      const acct = pair.account || {};
      const tokenXMint = acct.tokenXMint?.toBase58?.() || "";
      const tokenYMint = acct.tokenYMint?.toBase58?.() || "";

      // Prioritaskan pool SOL/XYZ
      const solMint = "So11111111111111111111111111111111111111112";
      if (tokenXMint !== solMint && tokenYMint !== solMint) continue;
      if (minTvl > 0) {
        try {
          const liquidity = acct.liquidity?.liquidity?.valueOf?.() || 0;
          if (liquidity < minTvl * 1e6) continue;
        } catch {}
      }

      viablePools.push({
        address: pair.publicKey?.toBase58?.() || pair.publicKey?.toString?.() || "",
        tokenXMint,
        tokenYMint,
        binStep: acct.binStep?.toNumber?.() ?? acct.binStep,
        activeId: acct.activeId?.number?.() ?? acct.activeId,
      });
    }

    logInfo(userId, "hunter", `Ditemukan ${viablePools.length} pool SOL viable`);

    if (viablePools.length === 0) {
      logWarn(userId, "hunter", "Tidak ada pool SOL viable");
      return { status: "no_candidates" };
    }

    const bestPool = viablePools[0];

    if (!trading.dryRun) {
      logInfo(userId, "hunter", `LIVE: Membuka posisi di ${bestPool.address}...`);
      const result = await deployIntoPool(userId, bestPool, trading, risk);
      if (result.success) {
        await prisma.position.create({
          data: {
            userId,
            poolAddress: bestPool.address,
            poolName: `${bestPool.tokenXMint.slice(0,4)}/${bestPool.tokenYMint.slice(0,4)}`,
            strategy: "hunter-auto",
            deployAmount: trading.deployAmountSol,
            status: "OPEN"
          }
        });
        logInfo(userId, "hunter", `LIVE: Posisi dibuka ${bestPool.address}`);
      } else {
        logError(userId, "hunter", `Gagal: ${result.error}`);
      }
    } else {
      logInfo(userId, "hunter", `[DRY RUN] Kandidat: ${bestPool.address}`);
    }

    return { status: "completed", pool: bestPool.address };
  } catch (err) {
    logError(userId, "hunter", `Error: ${err.message}`);
    return { status: "error", message: err.message };
  }
}
