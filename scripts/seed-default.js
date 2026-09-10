import { PrismaClient } from "@prisma/client";
import encrypt from "../lib/crypto.js";

const USER_ID = process.env.AGENT_USER_ID || "default";

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.user.upsert({
      where: { id: USER_ID },
      update: {},
      create: { 
        id: USER_ID,
        email: "default@meridian.local",
        passwordHash: encrypt("temporary_password"),
      },
    });
    console.log("User ready:", user.id);

    await prisma.tradingParameter.upsert({
      where: { userId: USER_ID },
      update: {},
      create: { userId: USER_ID, dryRun: true },
    });
    
    await prisma.screeningThreshold.upsert({
      where: { userId: USER_ID },
      update: {},
      create: { userId: USER_ID },
    });
    
    await prisma.riskParameter.upsert({
      where: { userId: USER_ID },
      update: {},
      create: { userId: USER_ID },
    });
    
    await prisma.lLMConfig.upsert({
      where: { userId: USER_ID },
      update: {},
      create: { userId: USER_ID, openRouterKeyEnc: encrypt("") },
    });
    
    await prisma.wallet.upsert({
      where: { userId: USER_ID },
      update: {},
      create: { userId: USER_ID, publicKey: "", privateKeyEnc: encrypt(process.env.WALLET_PRIVATE_KEY || "") },
    });
    
    console.log("Seed complete for", USER_ID);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error("Seed failed:", e);
  process.exit(1);
});