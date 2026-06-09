import { NextRequest, NextResponse } from "next/server";
import { createMerchantRedis, sanitizeSettingsPayload } from "@/lib/upstash";
import { MerchantSettings } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as MerchantSettings;

  const redis = createMerchantRedis(body.apiKeys.upstashRedisUrl, body.apiKeys.upstashRedisToken);
  const merchantKey = `merchant:${body.merchantId}:settings`;

  await redis.set(merchantKey, JSON.stringify({ ...body, updatedAt: new Date().toISOString() }));

  return NextResponse.json({
    ok: true,
    merchantId: body.merchantId,
    settings: sanitizeSettingsPayload(body as unknown as Record<string, unknown>)
  });
}
