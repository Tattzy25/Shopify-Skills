import { NextRequest, NextResponse } from "next/server";
import { getRecentEvents, pushEvent } from "@/lib/redis";

// GET /api/events?merchantId=xxx&count=50 — SSE stream of real-time events
export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");
  const count = parseInt(req.nextUrl.searchParams.get("count") || "50");

  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const events = await getRecentEvents(merchantId, count);
  return NextResponse.json({ events });
}

// POST /api/events — push event (from storefront pixel or webhook)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { merchantId, type, data } = body;

  if (!merchantId || !type) {
    return NextResponse.json({ error: "merchantId and type required" }, { status: 400 });
  }

  await pushEvent(merchantId, { type, data });
  return NextResponse.json({ success: true });
}
