import prisma from "./db.js";

export async function logAgent(userId, { level = "info", agentType, message, meta }) {
  try {
    await prisma.agentLog.create({
      data: { userId, level, agentType, message, meta },
    });
  } catch (e) {
    // don't let logging break the agent
    console.error("Log failed:", e.message);
  }
}

export async function logInfo(userId, agentType, message, meta) {
  return logAgent(userId, { level: "info", agentType, message, meta });
}

export async function logWarn(userId, agentType, message, meta) {
  return logAgent(userId, { level: "warn", agentType, message, meta });
}

export async function logError(userId, agentType, message, meta) {
  return logAgent(userId, { level: "error", agentType, message, meta });
}