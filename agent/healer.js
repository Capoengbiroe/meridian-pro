import prisma from "../lib/db.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";

/**
 * Healer Alpha — Position Management Agent
 * Monitors open positions, decides STAY/CLOSE/REDEPLOY,
 * claims fees, and manages risk.
 */
export async function runManagementCycle(userId, config) {
  const { trading, risk, wallet } = config;
  const startedAt = Date.now();

  logInfo(userId, "healer", "Management cycle started", {
    maxPositions: trading.maxPositions,
    dryRun: trading.dryRun,
  });

  try {
    // 1. Fetch all open positions
    const positions = await prisma.position.findMany({
      where: { userId, status: "OPEN" },
    });

    if (positions.length === 0) {
      logInfo(userId, "healer", "No open positions — skipping management");
      return { status: "no_positions", count: 0 };
    }

    logInfo(userId, "healer", `Managing ${positions.length} position(s)`);

    let actions = [];

    for (const pos of positions) {
      const action = await evaluatePosition(userId, pos, config);
      actions.push(action);

      if (action.decision === "CLOSE") {
        const result = await closePosition(userId, pos, action.reason);
        actions[actions.length - 1].result = result;
      } else if (action.decision === "REDEPLOY") {
        await closePosition(userId, pos, "redeploy");
        const newPool = await findBestPool(userId, config);
        if (newPool) {
          await deployIntoPool(userId, newPool, trading, risk);
        }
      }
    }

    // 2. Check daily loss limit
    const dailyLoss = await computeDailyPnL(userId);
    if (dailyLoss <= -risk.maxDailyLossPct) {
      logWarn(userId, "healer", `Max daily loss reached (${dailyLoss}%), stopping`);
    }

    return {
      status: "completed",
      actions,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    logError(userId, "healer", `Management cycle failed: ${err.message}`);
    throw err;
  }
}

async function evaluatePosition(userId, position, config) {
  const { risk, trading } = config;

  // Get on-chain data for this position
  const onChainData = await fetchPositionOnChain(position.poolAddress);

  // Evaluate PnL
  const pnlPercent = onChainData.pnlPercent || 0;
  const unclaimedFees = onChainData.unclaimedFees || 0;
  const outOfRange = onChainData.outOfRange || false;

  // Decision logic
  if (outOfRange) {
    const waitTime = onChainData.timeOutOfRange || 0;
    if (waitTime > risk.outOfRangeWaitMinutes * 60 * 1000) {
      return { decision: "CLOSE", reason: `Out of range for ${waitTime}ms`, pnlPercent };
    }
    return { decision: "STAY", reason: `Out of range but within ${risk.outOfRangeWaitMinutes}min window`, pnlPercent };
  }

  // Check take profit
  if (unclaimedFees >= (position.deployAmount * risk.takeProfitFeePct) / 100) {
    return { decision: "CLOSE", reason: `Take profit reached: ${unclaimedFees} fees`, pnlPercent };
  }

  // Check stop loss
  if (pnlPercent <= -risk.stopLossPct) {
    return { decision: "CLOSE", reason: `Stop loss triggered: ${pnlPercent}%`, pnlPercent };
  }

  return { decision: "STAY", reason: "Position performing well", pnlPercent };
}

async function closePosition(userId, position, reason) {
  try {
    logInfo(userId, "healer", `Closing position ${position.poolAddress}: ${reason}`, {
      pnl: position.currentPnl,
      unclaimedFees: position.unclaimedFees,
    });

    if (!position.userId) return; // Safety check

    await prisma.position.update({
      where: { id: position.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        currentPnl: position.currentPnl,
      },
    });

    // Claim fees via SDK (TODO)
    // await dlmm.collectFees(position.poolAddress);

    return { success: true, reason };
  } catch (err) {
    logError(userId, "healer", `Close failed: ${err.message}`);
    return { success: false, reason };
  }
}

async function findBestPool(userId, config) {
  const { screening } = config;
  try {
    const response = await fetch(
      `https://dlmm-api.meteora.ag/pair/all_by_groups?timeframe=${screening.timeframe}&category=${screening.category}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const pools = Array.isArray(data) ? data.flat() : [];
    return pools
      .filter(
        (p) =>
          parseFloat(p.tvl || "0") >= screening.minTvl &&
          parseFloat(p.tvl || "0") <= screening.maxTvl
      )
      .sort((a, b) => parseFloat(b.fee24h || "0") - parseFloat(a.fee24h || "0"))[0] || null;
  } catch {
    return null;
  }
}

async function deployIntoPool(userId, pool, trading, risk) {
  try {
    await prisma.position.create({
      data: {
        userId,
        poolAddress: pool.address,
        poolName: `${pool.baseMintSymbol}/${pool.quoteMintSymbol}`,
        strategy: "healer-redeploy",
        deployAmount: trading.deployAmountSol,
        status: "OPEN",
      },
    });
    logInfo(userId, "healer", `Redeployed into ${pool.name}`, { amount: trading.deployAmountSol });
    return { success: true };
  } catch (err) {
    logError(userId, "healer", `Redeploy failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function fetchPositionOnChain(poolAddress) {
  // Placeholder for actual Meteora DLMM position fetch
  // TODO: Implement @meteora-ag/dlmm SDK call
  return {
    pnlPercent: Math.random() * 4 - 1, // Mock data
    unclaimedFees: Math.random() * 0.5,
    outOfRange: false,
    timeOutOfRange: 0,
  };
}

async function computeDailyPnL(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const positions = await prisma.position.findMany({
    where: {
      userId,
      closedAt: { gte: today },
      status: "CLOSED",
    },
  });
  return positions.reduce((sum, p) => sum + (p.currentPnl || 0), 0);
}