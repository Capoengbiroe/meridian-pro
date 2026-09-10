export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db.js";
import { Connection, PublicKey } from "@solana/web3.js";

const USER_ID = process.env.AGENT_USER_ID || "default";

export async function GET() {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: USER_ID } });
    if (!wallet || !wallet.publicKey) return NextResponse.json({ balance: 0 });

    const connection = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com");
    const balance = await connection.getBalance(new PublicKey(wallet.publicKey));

    return NextResponse.json({ balance: balance / 1e9 });
  } catch (err) {
    console.error("Wallet API error:", err);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}