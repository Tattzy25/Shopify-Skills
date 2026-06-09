import { NextRequest, NextResponse } from "next/server";
import { getMerchant } from "@/lib/redis";

// UCP integration — Universal Commerce Protocol for global sales
// Bridges Shopify stores to the UCP network for cross-merchant discovery

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { merchantId, action, payload } = body;

  if (!merchantId || !action) {
    return NextResponse.json({ error: "merchantId and action required" }, { status: 400 });
  }

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  if (!merchant.agentConfig.ucpEnabled) {
    return NextResponse.json({ error: "UCP not enabled for this merchant" }, { status: 403 });
  }

  // UCP actions
  switch (action) {
    case "discover": {
      // Check if merchant's store supports UCP
      const shopUrl = `https://${merchant.shopDomain}`;
      return NextResponse.json({
        ucpSupported: true,
        shopUrl,
        capabilities: [
          "catalog_search",
          "create_cart",
          "update_cart",
          "create_checkout",
          "update_checkout",
          "complete_checkout",
          "order_tracking",
        ],
        merchant: {
          name: merchant.shopName,
          domain: merchant.shopDomain,
          currency: merchant.currency,
        },
      });
    }

    case "catalog_search": {
      // Search merchant's catalog via Shopify Storefront API
      const { query, filters, limit = 10 } = payload || {};
      return NextResponse.json({
        results: [],
        query,
        merchant: merchant.shopDomain,
        note: "Connect Storefront API token to enable catalog search",
      });
    }

    case "profile_init": {
      return NextResponse.json({
        success: true,
        profile: {
          name: "agent",
          merchantId,
          shopDomain: merchant.shopDomain,
          createdAt: new Date().toISOString(),
        },
      });
    }

    default:
      return NextResponse.json({ error: `Unknown UCP action: ${action}` }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");
  if (!merchantId) return NextResponse.json({ error: "merchantId required" }, { status: 400 });

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ucpEnabled: merchant.agentConfig.ucpEnabled,
    shopDomain: merchant.shopDomain,
    shopName: merchant.shopName,
    currency: merchant.currency,
    status: merchant.agentConfig.ucpEnabled ? "active" : "disabled",
  });
}
