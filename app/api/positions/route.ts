export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db.js";

export async function GET() {
  try {
    const positions = await prisma.position.findMany({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });
    return NextResponse.json(positions);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}