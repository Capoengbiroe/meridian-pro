import "dotenv/config";
import prisma from "../lib/db.js";
import { loadUserConfig } from "../lib/config.js";
import { runScreeningCycle } from "../agent/hunter.js";
import { runManagementCycle } from "../agent/healer.js";
import { logInfo, logError } from "../lib/logger.js";

const USER_ID = process.env.AGENT_USER_ID || "default";

export async function runCycle() {
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
    await prisma.$disconnect();
  }
}