import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";
import { deployIntoPool } from "./deployer.js";

export async function runScreeningCycle(userId, config) {
  const { screening, trading, risk, wallet, llm } = config;
  const startedAt = Date.now();

  logInfo(userId, "hunter", "Screening cycle started", { thresholds: screening });

  try {
    // 1. Fetch pools dengan fallback ke volume
    let pools = await fetchPoolCandidates(screening);
    if (pools.length === 0) {
      logWarn(userId, "hunter", "Fallback ke pool volume tertinggi...");
      pools = await fetchAllPoolsByVolume(screening);
    }

    if (pools.length === 0) {
      logWarn(userId, "hunter", "Tetap tidak ada kandidat, siklus berhenti");
      return { status: "no_candidates" };
    }

    const topPool = pools[0];
    logInfo(userId, "hunter", `Pool terbaik ditemukan: ${topPool.name || topPool.address}`);

    // 2. Simulasi/Eksekusi
    if (!trading.dryRun) {
      const result = await deployIntoPool(userId, topPool, trading, risk);
      if (result.success) {
        await prisma.position.create({
          data: { userId, poolAddress: topPool.address, poolName: topPool.name, strategy: "hunt-alpha", deployAmount: trading.deployAmountSol, status: "OPEN" }
        });
        logInfo(userId, "hunter", `BERHASIL DEPLOY ke ${topPool.address}`);
      }
    } else {
      logInfo(userId, "hunter", `[DRY RUN] Kandidat terpilih: ${topPool.address}`);
    }

    return { status: "completed", pool: topPool.address };
  } catch (err) {
    logError(userId, "hunter", `Screening error: ${err.message}`);
    throw err;
  }
}

async function fetchPoolCandidates(screening) {
  try {
    const res = await fetch(`https://dlmm-api.meteora.ag/pair/all_by_groups?category=${screening.category}`);
    const data = await res.json();
    return data.filter(p => p.tvl >= screening.minTvl).slice(0, 5);
  } catch { return []; }
}

async function fetchAllPoolsByVolume(screening) {
  try {
    const res = await fetch('https://dlmm-api.meteora.ag/pair/all');
    const data = await res.json();
    return data.sort((a, b) => b.volume24h - a.volume24h).filter(p => p.tvl >= screening.minTvl).slice(0, 5);
  } catch { return []; }
}