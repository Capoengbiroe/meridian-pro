var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// scripts/core.js
var core_exports = {};
__export(core_exports, {
  runCycle: () => runCycle
});
module.exports = __toCommonJS(core_exports);
var import_config = require("dotenv/config");

// lib/db.js
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
var db_default = prisma;

// lib/crypto.js
var import_node_crypto = __toESM(require("node:crypto"), 1);
var ALGO = "aes-256-gcm";
function keyBytes(key) {
  return import_node_crypto.default.createHash("sha256").update(key).digest("hex").slice(0, 64);
}
function decrypt(payload, masterKey = process.env.ENCRYPTION_KEY) {
  if (!payload) return "";
  const [ver, ivB64, tagB64, dataB64] = String(payload).split(":");
  if (ver === "v1") {
    const decipher = import_node_crypto.default.createDecipheriv(
      ALGO,
      Buffer.from(keyBytes(masterKey), "hex"),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  }
  throw new Error("Unsupported encryption version: " + ver);
}

// lib/config.js
async function loadUserConfig(userId) {
  const user = await db_default.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      tradingParameters: true,
      screeningThreshold: true,
      riskParameter: true,
      llmConfig: true,
      telegramSetting: true,
      hiveMindSetting: true
    }
  });
  if (!user) throw new Error(`User ${userId} not found`);
  return {
    // identity
    userId: user.id,
    email: user.email,
    // wallet
    wallet: user.wallet ? {
      publicKey: user.wallet.publicKey,
      privateKey: decrypt(user.wallet.privateKeyEnc)
    } : null,
    // trading parameters
    trading: user.tradingParameters ? {
      deployAmountSol: user.tradingParameters.deployAmountSol,
      maxPositions: user.tradingParameters.maxPositions,
      minSolToOpen: user.tradingParameters.minSolToOpen,
      managementIntervalMin: user.tradingParameters.managementIntervalMin,
      screeningIntervalMin: user.tradingParameters.screeningIntervalMin,
      dryRun: user.tradingParameters.dryRun,
      rpcUrl: user.tradingParameters.rpcUrl
    } : null,
    // screening thresholds
    screening: user.screeningThreshold ? {
      minFeeActiveTvlRatio: user.screeningThreshold.minFeeActiveTvlRatio,
      minTvl: user.screeningThreshold.minTvl,
      maxTvl: user.screeningThreshold.maxTvl,
      minOrganic: user.screeningThreshold.minOrganic,
      minHolders: user.screeningThreshold.minHolders,
      timeframe: user.screeningThreshold.timeframe,
      category: user.screeningThreshold.category
    } : null,
    // risk management
    risk: user.riskParameter ? {
      takeProfitFeePct: user.riskParameter.takeProfitFeePct,
      stopLossPct: user.riskParameter.stopLossPct,
      outOfRangeWaitMinutes: user.riskParameter.outOfRangeWaitMinutes,
      maxDailyLossPct: user.riskParameter.maxDailyLossPct
    } : null,
    // llm
    llm: user.llmConfig ? {
      openRouterKey: decrypt(user.llmConfig.openRouterKeyEnc),
      managementModel: user.llmConfig.managementModel,
      screeningModel: user.llmConfig.screeningModel,
      generalModel: user.llmConfig.generalModel
    } : null,
    // telegram
    telegram: user.telegramSetting ? {
      botToken: decrypt(user.telegramSetting.botTokenEnc),
      chatId: user.telegramSetting.chatId,
      enabled: user.telegramSetting.enabled
    } : null,
    // hive mind
    hiveMind: user.hiveMindSetting ? {
      url: user.hiveMindSetting.hiveMindUrl,
      apiKey: decrypt(user.hiveMindSetting.hiveMindApiKeyEnc),
      enabled: user.hiveMindSetting.enabled
    } : null
  };
}

// lib/logger.js
async function logAgent(userId, { level = "info", agentType, message, meta }) {
  try {
    await db_default.agentLog.create({
      data: { userId, level, agentType, message, meta }
    });
  } catch (e) {
    console.error("Log failed:", e.message);
  }
}
async function logInfo(userId, agentType, message, meta) {
  return logAgent(userId, { level: "info", agentType, message, meta });
}
async function logWarn(userId, agentType, message, meta) {
  return logAgent(userId, { level: "warn", agentType, message, meta });
}
async function logError(userId, agentType, message, meta) {
  return logAgent(userId, { level: "error", agentType, message, meta });
}

// agent/hunter.js
async function runScreeningCycle(userId, config) {
  const { screening, trading, risk, wallet, llm } = config;
  const startedAt = Date.now();
  logInfo(userId, "hunter", "Screening cycle started", {
    thresholds: screening
  });
  try {
    const pools = await fetchPoolCandidates(screening);
    if (!pools || pools.length === 0) {
      logWarn(userId, "hunter", "No pool candidates found");
      return { status: "no_candidates", pools: [] };
    }
    logInfo(userId, "hunter", `Found ${pools.length} pool candidates`);
    const openCount = await db_default.position.count({
      where: { userId, status: "OPEN" }
    });
    if (openCount >= trading.maxPositions) {
      logInfo(userId, "hunter", `Max positions reached (${openCount}/${trading.maxPositions}), skipping deployment`);
      return { status: "max_positions", pools, openCount };
    }
    const lessons = await db_default.lesson.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    const topPool = pools[0];
    const poolContext = {
      pool: topPool,
      lessons: lessons.map((l) => l.content),
      openPositions: openCount,
      maxPositions: trading.maxPositions,
      riskParameters: risk
    };
    if (!trading.dryRun && wallet && llm) {
      const result = await deployIntoPool(userId, topPool, trading, risk);
      if (result.success) {
        await db_default.position.create({
          data: {
            userId,
            poolAddress: topPool.address,
            poolName: topPool.name || topPool.address,
            strategy: "hunt-alpha",
            deployAmount: trading.deployAmountSol,
            status: "OPEN"
          }
        });
        logInfo(userId, "hunter", `Deployed ${trading.deployAmountSol} SOL into ${topPool.address}`, {
          txHash: result.txHash
        });
      }
    } else {
      logInfo(userId, "hunter", `[DRY RUN] Would deploy into ${topPool.address}`, {
        pool: topPool
      });
    }
    return {
      status: "completed",
      pools,
      deployed: !trading.dryRun,
      durationMs: Date.now() - startedAt
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
      { signal: AbortSignal.timeout(15e3) }
    );
    if (!response.ok) {
      logWarn("system", "hunter", `Meteora API returned ${response.status}`);
      return [];
    }
    const data = await response.json();
    const pairs = Array.isArray(data) ? data.flat() : [];
    return pairs.filter((p) => {
      const tvl = parseFloat(p.tvl || "0");
      const feeRatio = parseFloat(p.fee24h || "0") / Math.max(tvl, 1);
      return tvl >= screening.minTvl && tvl <= screening.maxTvl && feeRatio >= screening.minFeeActiveTvlRatio;
    }).map((p) => ({
      address: p.address,
      name: `${p.baseMintSymbol}/${p.quoteMintSymbol}`,
      tvl: parseFloat(p.tvl || "0"),
      fee24h: parseFloat(p.fee24h || "0"),
      feeRatio: parseFloat(p.fee24h || "0") / Math.max(parseFloat(p.tvl || "1"), 1),
      volume24h: parseFloat(p.volume24h || "0"),
      baseMint: p.baseMint,
      quoteMint: p.quoteMint,
      binStep: p.binStep
    })).sort((a, b) => b.feeRatio - a.feeRatio).slice(0, 10);
  } catch (err) {
    logWarn("system", "hunter", `Pool fetch failed: ${err.message}`);
    return [];
  }
}
async function deployIntoPool(userId, pool, trading, risk) {
  try {
    logInfo(userId, "hunter", `Deploying into pool ${pool.name}...`, {
      amountSol: trading.deployAmountSol,
      poolAddress: pool.address
    });
    return { success: true, txHash: "dry-run-tx-hash" };
  } catch (err) {
    logError(userId, "hunter", `Deploy failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// agent/healer.js
async function runManagementCycle(userId, config) {
  const { trading, risk, wallet } = config;
  const startedAt = Date.now();
  logInfo(userId, "healer", "Management cycle started", {
    maxPositions: trading.maxPositions,
    dryRun: trading.dryRun
  });
  try {
    const positions = await db_default.position.findMany({
      where: { userId, status: "OPEN" }
    });
    if (positions.length === 0) {
      logInfo(userId, "healer", "No open positions \u2014 skipping management");
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
          await deployIntoPool2(userId, newPool, trading, risk);
        }
      }
    }
    const dailyLoss = await computeDailyPnL(userId);
    if (dailyLoss <= -risk.maxDailyLossPct) {
      logWarn(userId, "healer", `Max daily loss reached (${dailyLoss}%), stopping`);
    }
    return {
      status: "completed",
      actions,
      durationMs: Date.now() - startedAt
    };
  } catch (err) {
    logError(userId, "healer", `Management cycle failed: ${err.message}`);
    throw err;
  }
}
async function evaluatePosition(userId, position, config) {
  const { risk, trading } = config;
  const onChainData = await fetchPositionOnChain(position.poolAddress);
  const pnlPercent = onChainData.pnlPercent || 0;
  const unclaimedFees = onChainData.unclaimedFees || 0;
  const outOfRange = onChainData.outOfRange || false;
  if (outOfRange) {
    const waitTime = onChainData.timeOutOfRange || 0;
    if (waitTime > risk.outOfRangeWaitMinutes * 60 * 1e3) {
      return { decision: "CLOSE", reason: `Out of range for ${waitTime}ms`, pnlPercent };
    }
    return { decision: "STAY", reason: `Out of range but within ${risk.outOfRangeWaitMinutes}min window`, pnlPercent };
  }
  if (unclaimedFees >= position.deployAmount * risk.takeProfitFeePct / 100) {
    return { decision: "CLOSE", reason: `Take profit reached: ${unclaimedFees} fees`, pnlPercent };
  }
  if (pnlPercent <= -risk.stopLossPct) {
    return { decision: "CLOSE", reason: `Stop loss triggered: ${pnlPercent}%`, pnlPercent };
  }
  return { decision: "STAY", reason: "Position performing well", pnlPercent };
}
async function closePosition(userId, position, reason) {
  try {
    logInfo(userId, "healer", `Closing position ${position.poolAddress}: ${reason}`, {
      pnl: position.currentPnl,
      unclaimedFees: position.unclaimedFees
    });
    if (!position.userId) return;
    await db_default.position.update({
      where: { id: position.id },
      data: {
        status: "CLOSED",
        closedAt: /* @__PURE__ */ new Date(),
        currentPnl: position.currentPnl
      }
    });
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
      { signal: AbortSignal.timeout(15e3) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const pools = Array.isArray(data) ? data.flat() : [];
    return pools.filter(
      (p) => parseFloat(p.tvl || "0") >= screening.minTvl && parseFloat(p.tvl || "0") <= screening.maxTvl
    ).sort((a, b) => parseFloat(b.fee24h || "0") - parseFloat(a.fee24h || "0"))[0] || null;
  } catch {
    return null;
  }
}
async function deployIntoPool2(userId, pool, trading, risk) {
  try {
    await db_default.position.create({
      data: {
        userId,
        poolAddress: pool.address,
        poolName: `${pool.baseMintSymbol}/${pool.quoteMintSymbol}`,
        strategy: "healer-redeploy",
        deployAmount: trading.deployAmountSol,
        status: "OPEN"
      }
    });
    logInfo(userId, "healer", `Redeployed into ${pool.name}`, { amount: trading.deployAmountSol });
    return { success: true };
  } catch (err) {
    logError(userId, "healer", `Redeploy failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}
async function fetchPositionOnChain(poolAddress) {
  return {
    pnlPercent: Math.random() * 4 - 1,
    // Mock data
    unclaimedFees: Math.random() * 0.5,
    outOfRange: false,
    timeOutOfRange: 0
  };
}
async function computeDailyPnL(userId) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const positions = await db_default.position.findMany({
    where: {
      userId,
      closedAt: { gte: today },
      status: "CLOSED"
    }
  });
  return positions.reduce((sum, p) => sum + (p.currentPnl || 0), 0);
}

// scripts/core.js
var USER_ID = process.env.AGENT_USER_ID || "default";
async function runCycle() {
  logInfo(USER_ID, "orchestrator", "=== Meridian Pro Cycle Started ===");
  try {
    const config = await loadUserConfig(USER_ID);
    await runScreeningCycle(USER_ID, config);
    await runManagementCycle(USER_ID, config);
    logInfo(USER_ID, "orchestrator", "=== Meridian Pro Cycle Complete ===");
  } catch (err) {
    logError(USER_ID, "orchestrator", `Cycle failed: ${err.message}`);
    console.error(err);
  } finally {
    await db_default.$disconnect();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runCycle
});
