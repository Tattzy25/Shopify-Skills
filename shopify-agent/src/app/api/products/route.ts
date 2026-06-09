import { NextRequest, NextResponse } from "next/server";
import { getMerchant } from "@/lib/redis";
import { ShopifyAdminClient, PRODUCTS_QUERY } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");
  const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  const client = new ShopifyAdminClient({
    shopDomain: merchant.shopDomain,
    accessToken: merchant.accessToken,
  });

  const data = await client.query<{ products: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: unknown[] } }>(
    PRODUCTS_QUERY,
    { first: limit, after: cursor }
  );

  return NextResponse.json(data.products);
}
