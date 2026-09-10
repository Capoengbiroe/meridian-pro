export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db.js";

const USER_ID = process.env.AGENT_USER_ID || "default";

export async function GET() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await prisma.agentLog.findMany({
      where: { userId: USER_ID, createdAt: { gte: since } },
      select: { createdAt: true, level: true },
    });

    const hourly = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 60 * 60 * 1000);
      hourly[d.getHours()] = 0;
    }
    logs.forEach((l) => {
      const h = l.createdAt.getHours();
      if (hourly[h] !== undefined) hourly[h]++;
    });

    const lastLog = logs.sort((a, b) => b.createdAt - a.createdAt)[0] || null;

    return NextResponse.json({
      lastActivity: lastLog?.createdAt || null,
      total24h: logs.length,
      hourly: Object.entries(hourly).map(([hour, count]) => ({ hour: Number(hour), count })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}