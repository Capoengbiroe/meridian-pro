import "dotenv/config";
import prisma from "./lib/db.js";
import { loadUserConfig } from "./lib/config.js";
import { runScreeningCycle } from "./agent/hunter.js";
import { runManagementCycle } from "./agent/healer.js";
import { logInfo, logError } from "./lib/logger.js";

const USER_ID = process.env.AGENT_USER_ID || "default-user";

async function main() {
  logInfo(USER_ID, "orchestrator", "=== Meridian Pro Cycle Started ===");

  try {
    const config = await loadUserConfig(USER_ID);
    logInfo(USER_ID, "orchestrator", "Config loaded", {
      trading: config.trading,
      risk: config.risk,
      screening: config.screening,
    });

    // Run screening (Hunter Alpha)
    logInfo(USER_ID, "hunter", "Starting Hunter Alpha screening...");
    const screeningResult = await runScreeningCycle(USER_ID, config);
    logInfo(USER_ID, "hunter", "Hunter Alpha complete", screeningResult);

    // Run management (Healer Alpha)
    logInfo(USER_ID, "healer", "Starting Healer Alpha management...");
    const mgmtResult = await runManagementCycle(USER_ID, config);
    logInfo(USER_ID, "healer", "Healer Alpha complete", mgmtResult);

    logInfo(USER_ID, "orchestrator", "=== Meridian Pro Cycle Complete ===");
    process.exit(0);
  } catch (err) {
    logError(USER_ID, "orchestrator", `Cycle failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();