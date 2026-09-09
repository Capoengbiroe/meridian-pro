import prisma from "../lib/db.js";
import { encrypt } from "../lib/crypto.js";
import { randomUUID } from "crypto";

async function main() {
  // Prompt user to set email & password via env (or generate a random one)
  const email = process.env.SEED_USER_EMAIL || `user-${randomUUID().slice(0, 6)}@example.com`;
  const passwordHash = encrypt("temporary-password"); // In production replace with proper bcrypt

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
    },
  });

  console.log("Seed user created:", { id: user.id, email });

  // Default empty config rows (will be filled via dashboard)
  await prisma.tradingParameter.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });
  await prisma.screeningThreshold.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
  await prisma.riskParameter.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
  await prisma.llmConfig.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, openRouterKeyEnc: encrypt(""), managementModel: "openrouter/healer-alpha", screeningModel: "openrouter/hunter-alpha" },
  });
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, publicKey: "", privateKeyEnc: encrypt("") },
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
