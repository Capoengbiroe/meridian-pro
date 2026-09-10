import { NextResponse } from "next/server";
import { runCycle } from "../../../scripts/core.js";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  await runCycle();
  return NextResponse.json({ success: true, durationMs: Date.now() - started });
}