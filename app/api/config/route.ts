export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { loadUserConfig, updateTradingParams, updateScreeningThresholds, updateRiskParams } from "../../../lib/config.js";
import { prisma } from "../../../lib/db.js";

const USER_ID = process.env.AGENT_USER_ID || "default";

export async function GET() {
  try {
    const config = await loadUserConfig(USER_ID);
    return NextResponse.json(config);
  } catch (err) {
    console.error("Config GET error:", err);
    return NextResponse.json({ error: "Failed to load configuration" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trading, screening, risk } = body;

    if (trading) {
      await updateTradingParams(USER_ID, {
        deployAmountSol: Number(trading.deployAmountSol) || 0.5,
        maxPositions: Number(trading.maxPositions) || 3,
        minSolToOpen: Number(trading.minSolToOpen) || 0.07,
        managementIntervalMin: Number(trading.managementIntervalMin) || 10,
        screeningIntervalMin: Number(trading.screeningIntervalMin) || 30,
        dryRun: Boolean(trading.dryRun),
        rpcUrl: String(trading.rpcUrl || "https://pump.helius-rpc.com"),
      });
    }

    if (screening) {
      await updateScreeningThresholds(USER_ID, {
        minFeeActiveTvlRatio: Number(screening.minFeeActiveTvlRatio) || 0.05,
        minTvl: Number(screening.minTvl) || 10000,
        maxTvl: Number(screening.maxTvl) || 150000,
        minOrganic: Number(screening.minOrganic) || 65,
        minHolders: Number(screening.minHolders) || 500,
        timeframe: String(screening.timeframe || "5m"),
        category: String(screening.category || "trending"),
      });
    }

    if (risk) {
      await updateRiskParams(USER_ID, {
        takeProfitFeePct: Number(risk.takeProfitFeePct) || 5,
        stopLossPct: Number(risk.stopLossPct) || 8,
        outOfRangeWaitMinutes: Number(risk.outOfRangeWaitMinutes) || 30,
        maxDailyLossPct: Number(risk.maxDailyLossPct) || 10,
      });
    }

    const updated = await loadUserConfig(USER_ID);
    return NextResponse.json({ success: true, config: updated });
  } catch (err) {
    console.error("Config POST error:", err);
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}