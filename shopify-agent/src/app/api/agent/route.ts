import { NextRequest, NextResponse } from "next/server";
import { redis, keys, getMerchant } from "@/lib/redis";
import { runConversionAgent } from "@/lib/agent";

// GET /api/agent?merchantId=xxx — run the conversion agent and get report
export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");
  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  try {
    const report = await runConversionAgent(merchant);
    return NextResponse.json(report);
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/agent — update agent config
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { merchantId, agentConfig } = body;

  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  const updated = { ...merchant, agentConfig: { ...merchant.agentConfig, ...agentConfig } };
  await redis.set(keys.merchant(merchantId), updated);

  return NextResponse.json({ success: true, agentConfig: updated.agentConfig });
}
