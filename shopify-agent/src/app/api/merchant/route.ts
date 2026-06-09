import { NextRequest, NextResponse } from "next/server";
import { getMerchant, saveMerchant, redis, keys } from "@/lib/redis";

// GET /api/merchant?merchantId=xxx
export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");
  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Don't expose access token
  const { accessToken, ...safe } = merchant;
  return NextResponse.json(safe);
}

// PATCH /api/merchant — update merchant settings
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { merchantId, updates } = body;

  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = { ...merchant, ...updates };
  await saveMerchant(updated);

  const { accessToken, ...safe } = updated;
  return NextResponse.json({ success: true, merchant: safe });
}

// DELETE /api/merchant — disconnect store
export async function DELETE(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");
  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  await redis.del(keys.merchant(merchantId));
  await redis.del(keys.merchantAnalytics(merchantId));
  await redis.del(keys.agentActions(merchantId));

  return NextResponse.json({ success: true });
}
