import { NextRequest, NextResponse } from "next/server";
import { getMerchant } from "@/lib/redis";
import { ShopifyAdminClient, CUSTOMERS_QUERY } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");
  const query = req.nextUrl.searchParams.get("query") || undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  const client = new ShopifyAdminClient({
    shopDomain: merchant.shopDomain,
    accessToken: merchant.accessToken,
  });

  const data = await client.query<{ customers: { nodes: unknown[] } }>(
    CUSTOMERS_QUERY,
    { first: limit, query }
  );

  return NextResponse.json(data.customers);
}
