import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";
import { deployIntoPool } from "./deployer.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function runScreeningCycle(userId, config) {
  const { screening, trading, risk } = config;
  logInfo(userId, "hunter", "Screening cycle mulai (GeckoTerminal + on-chain)...");

  try {
    // 1. Ambil pool Meteora dari GeckoTerminal (API live)
    const pools = await fetchMeteoraPools();
    if (!pools || pools.length === 0) {
      logWarn(userId, "hunter", "Tidak ada pool ditemukan dari GeckoTerminal");
      return { status: "no_candidates" };
    }

    logInfo(userId, "hunter", `Ditemukan ${pools.length} pool Meteora`);

    // 2. Filter: prioritas SOL pairs + liquidity minimum
    const minReserve = screening?.minTvl || 1000; // USD
    const viable = pools
      .filter((p) =>
        (p.baseToken === SOL_MINT || p.quoteToken === SOL_MINT) &&
        p.reserveInUsd >= minReserve
      )
      .sort((a, b) => b.reserveInUsd - a.reserveInUsd);

    logInfo(userId, "hunter", `Pool viable (SOL + TVL>=${minReserve}): ${viable.length}`);

    if (viable.length === 0) {
      logWarn(userId, "hunter", "Tidak ada pool SOL viable dengan TVL cukup");
      return { status: "no_candidates" };
    }

    const bestPool = viable[0];
    logInfo(userId, "hunter", `Kandidat terpilih: ${bestPool.address} (TVL: $${bestPool.reserveInUsd})`);

    // 3. Eksekusi / Dry Run
    if (!trading.dryRun) {
      logInfo(userId, "hunter", `LIVE MODE: Membuka posisi di ${bestPool.address}...`);
      const result = await deployIntoPool(userId, bestPool, trading, risk);
      if (result.success) {
        await prisma.position.create({
          data: {
            userId,
            poolAddress: bestPool.address,
            poolName: `${bestPool.baseSymbol}/${bestPool.quoteSymbol}`,
            strategy: "hunter-auto",
            deployAmount: trading.deployAmountSol,
            status: "OPEN"
          }
        });
        logInfo(userId, "hunter", `LIVE: Posisi dibuka di ${bestPool.address}`);
      } else {
        logError(userId, "hunter", `Gagal eksekusi: ${result.error}`);
      }
    } else {
      logInfo(userId, "hunter", `[DRY RUN] Kandidat: ${bestPool.address} (${bestPool.baseSymbol}/${bestPool.quoteSymbol})`);
    }

    return { status: "completed", pool: bestPool.address };
  } catch (err) {
    logError(userId, "hunter", `Error screening: ${err.message}`);
    return { status: "error", message: err.message };
  }
}

async function fetchMeteoraPools() {
  try {
    const responses = await Promise.all([1, 2, 3].map((page) =>
      fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/dexes/meteora/pools?page=${page}&sort=h24_volume_usd_desc`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) }
      )
    ));

    const all = [];
    for (const res of responses) {
      if (!res.ok) continue;
      const json = await res.json();
      for (const item of json.data || []) {
        const attrs = item.attributes || {};
        const base = attrs.base_token || {};
        const quote = attrs.quote_token || {};
        if (!attrs.address) continue;
        all.push({
          address: attrs.address,
          baseToken: base.address || "",
          quoteToken: quote.address || "",
          baseSymbol: base.symbol || "",
          quoteSymbol: quote.symbol || "",
          reserveInUsd: parseFloat(attrs.reserve_in_usd || "0"),
          volume24h: parseFloat(attrs.h24_volume_usd || "0"),
        });
      }
    }
    return all;
  } catch (err) {
    logWarn("system", "hunter", `Fetch pool gagal: ${err.message}`);
    return [];
  }
}
