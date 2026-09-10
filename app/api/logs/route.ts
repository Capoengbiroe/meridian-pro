export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db.js";

const USER_ID = process.env.AGENT_USER_ID || "default";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const agentType = searchParams.get("agentType");

    const logs = await prisma.agentLog.findMany({
      where: { userId: USER_ID, ...(agentType ? { agentType } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("Logs API error:", err);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}