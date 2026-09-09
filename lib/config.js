import prisma from "./db.js";
import { decrypt } from "./crypto.js";

export async function loadUserConfig(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      tradingParameters: true,
      screeningThreshold: true,
      riskParameter: true,
      llmConfig: true,
      telegramSetting: true,
      hiveMindSetting: true,
    },
  });

  if (!user) throw new Error(`User ${userId} not found`);

  return {
    // identity
    userId: user.id,
    email: user.email,

    // wallet
    wallet: user.wallet
      ? {
          publicKey: user.wallet.publicKey,
          privateKey: decrypt(user.wallet.privateKeyEnc),
        }
      : null,

    // trading parameters
    trading: user.tradingParameters
      ? {
          deployAmountSol: user.tradingParameters.deployAmountSol,
          maxPositions: user.tradingParameters.maxPositions,
          minSolToOpen: user.tradingParameters.minSolToOpen,
          managementIntervalMin: user.tradingParameters.managementIntervalMin,
          screeningIntervalMin: user.tradingParameters.screeningIntervalMin,
          dryRun: user.tradingParameters.dryRun,
          rpcUrl: user.tradingParameters.rpcUrl,
        }
      : null,

    // screening thresholds
    screening: user.screeningThreshold
      ? {
          minFeeActiveTvlRatio: user.screeningThreshold.minFeeActiveTvlRatio,
          minTvl: user.screeningThreshold.minTvl,
          maxTvl: user.screeningThreshold.maxTvl,
          minOrganic: user.screeningThreshold.minOrganic,
          minHolders: user.screeningThreshold.minHolders,
          timeframe: user.screeningThreshold.timeframe,
          category: user.screeningThreshold.category,
        }
      : null,

    // risk management
    risk: user.riskParameter
      ? {
          takeProfitFeePct: user.riskParameter.takeProfitFeePct,
          stopLossPct: user.riskParameter.stopLossPct,
          outOfRangeWaitMinutes: user.riskParameter.outOfRangeWaitMinutes,
          maxDailyLossPct: user.riskParameter.maxDailyLossPct,
        }
      : null,

    // llm
    llm: user.llmConfig
      ? {
          openRouterKey: decrypt(user.llmConfig.openRouterKeyEnc),
          managementModel: user.llmConfig.managementModel,
          screeningModel: user.llmConfig.screeningModel,
          generalModel: user.llmConfig.generalModel,
        }
      : null,

    // telegram
    telegram: user.telegramSetting
      ? {
          botToken: decrypt(user.telegramSetting.botTokenEnc),
          chatId: user.telegramSetting.chatId,
          enabled: user.telegramSetting.enabled,
        }
      : null,

    // hive mind
    hiveMind: user.hiveMindSetting
      ? {
          url: user.hiveMindSetting.hiveMindUrl,
          apiKey: decrypt(user.hiveMindSetting.hiveMindApiKeyEnc),
          enabled: user.hiveMindSetting.enabled,
        }
      : null,
  };
}

export async function updateTradingParams(userId, data) {
  return prisma.tradingParameter.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function updateScreeningThresholds(userId, data) {
  return prisma.screeningThreshold.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function updateRiskParams(userId, data) {
  return prisma.riskParameter.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function updateLLMConfig(userId, data) {
  const { openRouterKey, ...rest } = data;
  return prisma.llmConfig.upsert({
    where: { userId },
    update: {
      ...rest,
      ...(openRouterKey ? { openRouterKeyEnc: encrypt(openRouterKey) } : {}),
    },
    create: {
      userId,
      openRouterKeyEnc: encrypt(openRouterKey || ""),
      ...rest,
    },
  });
}

export async function updateWallet(userId, data) {
  const { privateKey, ...rest } = data;
  return prisma.wallet.upsert({
    where: { userId },
    update: {
      ...rest,
      ...(privateKey ? { privateKeyEnc: encrypt(privateKey) } : {}),
    },
    create: {
      userId,
      privateKeyEnc: encrypt(privateKey || ""),
      ...rest,
    },
  });
}

export async function updateTelegram(userId, data) {
  const { botToken, ...rest } = data;
  return prisma.telegramSetting.upsert({
    where: { userId },
    update: {
      ...rest,
      ...(botToken ? { botTokenEnc: encrypt(botToken) } : {}),
    },
    create: {
      userId,
      botTokenEnc: encrypt(botToken || ""),
      ...rest,
    },
  });
}

export async function updateHiveMind(userId, data) {
  const { apiKey, ...rest } = data;
  return prisma.hiveMindSetting.upsert({
    where: { userId },
    update: {
      ...rest,
      ...(apiKey ? { hiveMindApiKeyEnc: encrypt(apiKey) } : {}),
    },
    create: {
      userId,
      hiveMindApiKeyEnc: encrypt(apiKey || ""),
      ...rest,
    },
  });
}

import { encrypt } from "./crypto.js";