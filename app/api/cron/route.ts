import { NextResponse } from "next/server";
import { runCycle } from "../../../scripts/core.js";

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  await runCycle();
  return NextResponse.json({ success: true });
}