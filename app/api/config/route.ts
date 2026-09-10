export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { loadUserConfig } from "../../../lib/config.js";
import { prisma } from "../../../lib/db.js";
import { z } from "zod";
import { parse } from "date-fns";
import { v4 as uuidv4 } from "uuid";

const schema = z.object({
  deployAmountSol: z.number().min(0.01).max(1000),
  maxPositions: z.number().int().min(1).max(10),
  minSolToOpen: z.number().min(0.01).max(1000),
  managementIntervalMin: z.number().int().min(5).max(60),
  screeningIntervalMin: z.number().int().min(5).max(60),
  dryRun: z.boolean(),
  rpcUrl: z.string().min(10).max(200),
  minFeeActiveTvlRatio: z.number().min(0).max(1),
  minTvl: z.number().min(100),
  maxTvl: z.number().min(1000),
  minOrganic: z.number().min(0).max(100),
  minHolders: z.number().min(100).max(1000000),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]),
  category: z.enum(["trending", "new", "stable", "high-volume"]),
  takeProfitFeePct: z.number().min(0).max(100),
  outOfRangeWaitMinutes: z.number().min(5).max(1440)
});

export async function GET() {
  try {
    const config = await loadUserConfig(process.env.AGENT_USER_ID || "default");
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load configuration" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validated = schema.safeParse(data);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid configuration data", details: validated.error.errors },
        { status: 400 }
      );
    }

    await prisma.tradingParameter.upsert({
      where: { userId: "default" },
      update: validated.data,
      create: { userId: "default", ...validated.data },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Config update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}