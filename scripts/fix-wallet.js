import { PrismaClient } from "@prisma/client";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { decrypt, encrypt } from "../lib/crypto.js";

const prisma = new PrismaClient();
const USER_ID = process.env.AGENT_USER_ID || "default";

async function main() {
  const wallet = await prisma.wallet.findUnique({ where: { userId: USER_ID } });
  if (!wallet) {
    console.error("Wallet tidak ditemukan");
    return;
  }

  const privateKey = decrypt(wallet.privateKeyEnc);
  if (!privateKey) {
    console.error("Private key belum diset");
    return;
  }

  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    const publicKey = keypair.publicKey.toBase58();
    
    await prisma.wallet.update({
      where: { userId: USER_ID },
      data: { publicKey },
    });
    console.log("Wallet updated with public key:", publicKey);
  } catch (e) {
    console.error("Gagal derivasi keypair:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
