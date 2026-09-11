import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";
import { deployIntoPool } from "./deployer.js";

export async function runScreeningCycle(userId, config) {
  const { screening, trading, risk, wallet } = config;
  logInfo(userId, "hunter", "Screening cycle started...");

  try {
    // 1. Ambil semua token populer dari Meteora (Top tokens by volume)
    const tokens = await fetchTopTokens();
    logInfo(userId, "hunter", `Memeriksa ${tokens.length} token populer...`);

    let bestPool = null;
    let bestLiquidity = 0;

    for (const token of tokens) {
      const poolAddress = await findPoolForToken(token.mint);
      if (!poolAddress) continue;

      const poolInfo = await getPoolInfo(poolAddress);
      if (!poolInfo || !poolInfo.liquidity) continue;

      if (poolInfo.liquidity > bestLiquidity) {
        bestLiquidity = poolInfo.liquidity;
        bestPool = { address: poolAddress, ...poolInfo };
      }
    }

    if (!bestPool) {
      logWarn(userId, "hunter", "Tidak ada pool ditemukan");
      return { status: "no_candidates" };
    }

    logInfo(userId, "hunter", `Pool terpilih: ${bestPool.address} (Liquidity: ${bestLiquidity})`);

    // Eksekusi / Dry Run
    if (!trading.dryRun) {
      logInfo(userId, "hunter", "LIVE MODE: Mencoba buka posisi...");
      const result = await deployIntoPool(userId, bestPool, trading, risk);
      if (result.success) {
        await prisma.position.create({
          data: {
            userId,
            poolAddress: bestPool.address,
            poolName: bestPool.name,
            strategy: "hunter-auto",
            deployAmount: trading.deployAmountSol,
            status: "OPEN"
          }
        });
        logInfo(userId, "hunter", `✅ LIVE: Posisi dibuka di ${bestPool.address}`);
      } else {
        logError(userId, "hunter", `Gagal eksekusi: ${result.error}`);
      }
    } else {
      logInfo(userId, "hunter", `[DRY RUN] Kandidat: ${bestPool.address} (Liquidity: ${bestLiquidity})`);
    }

    return { status: "completed", pool: bestPool.address };
  } catch (err) {
    logError(userId, "hunter", `Error sistem: ${err.message}`);
    return { status: "error", message: err.message };
  }
}

async function fetchTopTokens() {
  try {
    // Daftar token populer yang biasanya ada di Meteora
    return [
      { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTt1v", name: "USDC" },
      { mint: "Es9vMFrzaCERmJfrFG4H2FYD4KCoNkY11McCe8BenwNY", name: "USDT" },
      { mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", name: "mSOL" },
      { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFjSYbKJZnnQ3L4V", name: "JUP" },
      { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xrnbyf4T3WpxrR", name: "BONK" },
      { mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", name: "stSOL" },
      { mint: "7vfCXTUXx5WJV5JADk17DUJ4kszg7utN175e1QkP1D", name: "JITOSOL" },
      { mint: "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGzHt1s93e", name: "WIF" },
    ];
  } catch {
    return [];
  }
}

const SOL_MINT = "So11111111111111111111111111111111111111112";

async function findPoolForToken(tokenMint) {
  try {
    // Endpoint BENAR dari CloddsBot: pair/all_by_groups?token_mints=...
    const url = `https://dlmm-api.meteora.ag/pair/all_by_groups?token_mints=${tokenMint},So11111111111111111111111111111111111111112`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const pools = await res.json();
    if (!pools || pools.length === 0) return null;
    
    // Ambil pool dengan liquidity tertinggi
    const sorted = pools.sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0));
    return sorted[0]?.address || null;
  } catch {
    return null;
  }
}

async function getPoolInfo(poolAddress) {
  try {
    const res = await fetch(`https://dlmm-api.meteora.ag/pair/${poolAddress}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}