import { deployIntoPool } from "./deployer.js";
import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";

/**
 * Hunter Alpha — Pool Screening Agent
 * Scans Meteora DLMM pools, evaluates them against user-configured thresholds,
 * and deploys into the best candidate.
 */
export async function runScreeningCycle(userId, config) {
  const { screening, trading, risk, wallet, llm } = config;
  const startedAt = Date.now();

  logInfo(userId, "hunter", "Screening cycle started", {
    thresholds: screening,
  });

  try {
    // 1. Fetch pool candidates from Meteora
    const pools = await fetchPoolCandidates(screening);

    if (!pools || pools.length === 0) {
      logWarn(userId, "hunter", "No pool candidates found");
      return { status: "no_candidates", pools: [] };
    }

    logInfo(userId, "hunter", `Found ${pools.length} pool candidates`);

    // 2. Open positions count
    const openCount = await prisma.position.count({
      where: { userId, status: "OPEN" },
    });

    if (openCount >= trading.maxPositions) {
      logInfo(userId, "hunter", `Max positions reached (${openCount}/${trading.maxPositions}), skipping deployment`);
      return { status: "max_positions", pools, openCount };
    }

    // 3. Load past lessons for context
    const lessons = await prisma.lesson.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 4. Use LLM to evaluate top pools
    const topPool = pools[0]; // Best candidate after filtering
    const poolContext = {
      pool: topPool,
      lessons: lessons.map((l) => l.content),
      openPositions: openCount,
      maxPositions: trading.maxPositions,
      riskParameters: risk,
    };

    // 5. Deploy into the best pool
    if (!trading.dryRun && wallet && llm) {
      const result = await deployIntoPool(userId, topPool, trading, risk);
      if (result.success) {
        await prisma.position.create({
          data: {
            userId,
            poolAddress: topPool.address,
            poolName: topPool.name || topPool.address,
            strategy: "hunt-alpha",
            deployAmount: trading.deployAmountSol,
            status: "OPEN",
          },
        });

        logInfo(userId, "hunter", `Deployed ${trading.deployAmountSol} SOL into ${topPool.address}`, {
          txHash: result.txHash,
        });
      }
    } else {
      // Dry run mode
      logInfo(userId, "hunter", `[DRY RUN] Would deploy into ${topPool.address}`, {
        pool: topPool,
      });
    }

    return {
      status: "completed",
      pools,
      deployed: !trading.dryRun,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    logError(userId, "hunter", `Screening cycle failed: ${err.message}`, { stack: err.stack });
    throw err;
  }
}

async function fetchPoolCandidates(screening) {
  try {
    const response = await fetch(
      `https://dlmm-api.meteora.ag/pair/all_by_groups?timeframe=${screening.timeframe}&category=${screening.category}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      logWarn("system", "hunter", `Meteora API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const pairs = Array.isArray(data) ? data.flat() : [];

    // Filter by thresholds
    return pairs
      .filter((p) => {
        const tvl = parseFloat(p.tvl || "0");
        const feeRatio = parseFloat(p.fee24h || "0") / Math.max(tvl, 1);
        return (
          tvl >= screening.minTvl &&
          tvl <= screening.maxTvl &&
          feeRatio >= screening.minFeeActiveTvlRatio
        );
      })
      .map((p) => ({
        address: p.address,
        name: `${p.baseMintSymbol}/${p.quoteMintSymbol}`,
        tvl: parseFloat(p.tvl || "0"),
        fee24h: parseFloat(p.fee24h || "0"),
        feeRatio: parseFloat(p.fee24h || "0") / Math.max(parseFloat(p.tvl || "1"), 1),
        volume24h: parseFloat(p.volume24h || "0"),
        baseMint: p.baseMint,
        quoteMint: p.quoteMint,
        binStep: p.binStep,
      }))
      .sort((a, b) => b.feeRatio - a.feeRatio)
      .slice(0, 10);
  } catch (err) {
    logWarn("system", "hunter", `Pool fetch failed: ${err.message}`);
    return [];
  }
}

/* deployIntoPool dipindahkan ke deployer.js */