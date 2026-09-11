export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db.js";

const USER_ID = process.env.AGENT_USER_ID || "default";

async function enrichPoolDetail(address) {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${address}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const a = json.data?.attributes || {};
    return {
      name: a.name,
      baseSymbol: a.base_token?.symbol,
      quoteSymbol: a.quote_token?.symbol,
      basePriceUsd: a.base_token_price_usd,
      quotePriceUsd: a.quote_token_price_usd,
      h24VolumeUsd: parseFloat(a.h24_volume_usd || "0"),
      reserveInUsd: parseFloat(a.reserve_in_usd || "0"),
      priceChange24h: parseFloat(a.price_change_percentage?.h24 || "0"),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const positions = await prisma.position.findMany({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });

    const enriched = await Promise.all(
      positions.map(async (pos) => {
        const detail = await enrichPoolDetail(pos.poolAddress);
        if (detail) {
          return {
            ...pos,
            poolName: detail.name || pos.poolName,
            poolDetail: detail,
          };
        }
        return pos;
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}