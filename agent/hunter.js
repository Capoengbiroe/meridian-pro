import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";
import { deployIntoPool } from "./deployer.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function runScreeningCycle(userId, config) {
  const { screening, trading, risk } = config;
  logInfo(userId, "hunter", "Screening: GeckoTerminal + on-chain SOL filter...");

  try {
    const geckoPools = await fetchGeckoPools();
    if (!geckoPools.length) {
      logWarn(userId, "hunter", "Tidak ada pool dari GeckoTerminal");
      return { status: "no_candidates" };
    }
    logInfo(userId, "hunter", `${geckoPools.length} pool dari GeckoTerminal`);

    const { Connection, PublicKey } = await import("@solana/web3.js");
    const dlmmLib = await import("@meteora-ag/dlmm");
    const DLMM = dlmmLib.default || dlmmLib.DLMM;
    const connection = new Connection(
      process.env.HELIUS_API_KEY
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : "https://api.mainnet-beta.solana.com"
    );

    const solPools = [];
    const results = await Promise.allSettled(
      geckoPools.slice(0, 15).map(async (p) => {
        const inst = await DLMM.create(connection, new PublicKey(p.address));
        const tx = inst.tokenX.publicKey.toBase58();
        const ty = inst.tokenY.publicKey.toBase58();
        if (tx === SOL_MINT || ty === SOL_MINT) {
          return { address: p.address, tokenX: tx, tokenY: ty, reserve: p.reserveInUsd };
        }
        return null;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) solPools.push(r.value);
    }

    if (!solPools.length) {
      logWarn(userId, "hunter", "Tidak ada pool SOL viable");
      return { status: "no_candidates" };
    }

    solPools.sort((a, b) => b.reserve - a.reserve);
    const best = solPools[0];
    logInfo(userId, "hunter", `Terpilih: ${best.address} (TVL $${best.reserve.toFixed(0)})`);

    if (!trading.dryRun) {
      logInfo(userId, "hunter", `LIVE: Buka posisi ${best.address}...`);
      const result = await deployIntoPool(userId, best, trading, risk);
      if (result.success) {
        await prisma.position.create({
          data: { userId, poolAddress: best.address, poolName: "SOL/XYZ", strategy: "hunter-auto", deployAmount: trading.deployAmountSol, status: "OPEN" }
        });
        logInfo(userId, "hunter", `LIVE: Posisi dibuka ${best.address}`);
      } else {
        logError(userId, "hunter", `Gagal: ${result.error}`);
      }
    } else {
      logInfo(userId, "hunter", `[DRY RUN] Kandidat: ${best.address}`);
    }

    return { status: "completed", pool: best.address };
  } catch (err) {
    logError(userId, "hunter", `Error: ${err.message}`);
    return { status: "error", message: err.message };
  }
}

async function fetchGeckoPools() {
  try {
    const res = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/solana/dexes/meteora/pools?page=1&sort=h24_volume_usd_desc",
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || [])
      .map((item) => {
        const a = item.attributes || {};
        if (!a.address) return null;
        return { address: a.address, reserveInUsd: parseFloat(a.reserve_in_usd || "0") };
      })
      .filter(Boolean)
      .sort((a, b) => b.reserveInUsd - a.reserveInUsd);
  } catch {
    return [];
  }
}
