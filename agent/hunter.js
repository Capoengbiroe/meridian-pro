import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";
import { deployIntoPool } from "./deployer.js";

export async function runScreeningCycle(userId, config) {
  const { screening, trading, risk, wallet, llm } = config;
  logInfo(userId, "hunter", "Screening cycle started...");

  try {
    const response = await fetch('https://dlmm-api.meteora.ag/pair/all');
    const data = await response.json();
    
    // Fallback: ambil pool dengan volume tertinggi TANPA filter TVL ketat
    const sortedPools = data.sort((a, b) => b.volume24h - a.volume24h);
    const topPool = sortedPools[0];

    if (!topPool) {
      logWarn(userId, "hunter", "Tidak ada pool ditemukan di Meteora API");
      return { status: "no_candidates" };
    }

    logInfo(userId, "hunter", `Kandidat pool ditemukan: ${topPool.address}`);

    // Eksekusi (Jika tidak Dry Run)
    if (!trading.dryRun) {
      logInfo(userId, "hunter", "Mencoba eksekusi trade...");
      const result = await deployIntoPool(userId, topPool, trading, risk);
      if (result.success) {
        await prisma.position.create({
          data: { 
            userId, 
            poolAddress: topPool.address, 
            poolName: `${topPool.baseMintSymbol}/${topPool.quoteMintSymbol}`,
            strategy: "hunter-auto",
            deployAmount: trading.deployAmountSol,
            status: "OPEN" 
          }
        });
        logInfo(userId, "hunter", `BERHASIL: Open position di ${topPool.address}`);
      } else {
        logError(userId, "hunter", `Gagal eksekusi: ${result.error}`);
      }
    } else {
      logInfo(userId, "hunter", `[DRY RUN] Kandidat terpilih: ${topPool.address}`);
    }

    return { status: "completed", pool: topPool.address };
  } catch (err) {
    logError(userId, "hunter", `Error sistem: ${err.message}`);
    return { status: "error", message: err.message };
  }
}