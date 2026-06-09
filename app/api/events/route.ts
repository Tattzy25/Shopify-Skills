import { NextRequest, NextResponse } from "next/server";
import { createMerchantRedis } from "@/lib/upstash";
import { buildSnapshot } from "@/lib/metrics";

type EventBody = {
  merchantId: string;
  redisUrl: string;
  redisToken: string;
  cartsCreated: number;
  checkoutsStarted: number;
  ordersPaid: number;
  revenue: number;
  recoveredCarts: number;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EventBody;
  const redis = createMerchantRedis(body.redisUrl, body.redisToken);

  const snapshot = buildSnapshot({
    merchantId: body.merchantId,
    cartsCreated: body.cartsCreated,
    checkoutsStarted: body.checkoutsStarted,
    ordersPaid: body.ordersPaid,
    revenue: body.revenue,
    recoveredCarts: body.recoveredCarts
  });

  const streamKey = `merchant:${body.merchantId}:stream`;
  const latestKey = `merchant:${body.merchantId}:latest`;

  await redis.lpush(streamKey, JSON.stringify(snapshot));
  await redis.ltrim(streamKey, 0, 499);
  await redis.set(latestKey, JSON.stringify(snapshot));

  return NextResponse.json({ ok: true, snapshot });
}

export async function GET(request: NextRequest) {
  const merchantId = request.nextUrl.searchParams.get("merchantId");
  const redisUrl = request.nextUrl.searchParams.get("redisUrl");
  const redisToken = request.nextUrl.searchParams.get("redisToken");

  if (!merchantId || !redisUrl || !redisToken) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const redis = createMerchantRedis(redisUrl, redisToken);
  const latest = await redis.get<string>(`merchant:${merchantId}:latest`);
  const history = await redis.lrange<string>(`merchant:${merchantId}:stream`, 0, 49);

  return NextResponse.json({
    ok: true,
    latest: latest ? JSON.parse(latest) : null,
    history: history.map((item) => JSON.parse(item))
  });
}
