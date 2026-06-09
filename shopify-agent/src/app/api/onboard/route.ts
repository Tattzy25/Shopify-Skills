import { NextRequest, NextResponse } from "next/server";
import { redis, keys, saveMerchant, type MerchantData } from "@/lib/redis";
import { ShopifyAdminClient, SHOP_INFO_QUERY } from "@/lib/shopify";
import { nanoid } from "nanoid";

// POST /api/onboard — merchant connects their Shopify store
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopDomain, accessToken, storefrontToken } = body;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { error: "shopDomain and accessToken are required" },
        { status: 400 }
      );
    }

    // Validate credentials by hitting the Shopify Admin API
    const client = new ShopifyAdminClient({ shopDomain, accessToken });
    let shopInfo: {
      shop: {
        id: string;
        name: string;
        email: string;
        myshopifyDomain: string;
        plan: { displayName: string };
        currencyCode: string;
      };
    };

    try {
      shopInfo = await client.query(SHOP_INFO_QUERY);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid Shopify credentials. Check your shop domain and access token." },
        { status: 401 }
      );
    }

    const shop = shopInfo.shop;
    const merchantId = nanoid();

    const merchant: MerchantData = {
      id: merchantId,
      shopDomain: shop.myshopifyDomain,
      accessToken,
      shopName: shop.name,
      email: shop.email,
      plan: shop.plan?.displayName || "Unknown",
      currency: shop.currencyCode,
      createdAt: new Date().toISOString(),
      agentEnabled: true,
      agentConfig: {
        autoCartRecovery: true,
        checkoutOptimization: true,
        dynamicPricing: false,
        upsellEnabled: true,
        crossSellEnabled: true,
        abandonedCartEmails: true,
        conversionGoal: 104,
        ucpEnabled: true,
      },
    };

    await saveMerchant(merchant);

    // Store session token
    const sessionToken = nanoid(32);
    await redis.set(keys.session(sessionToken), merchantId, { ex: 86400 * 30 }); // 30 days

    return NextResponse.json({
      success: true,
      merchantId,
      sessionToken,
      shop: {
        name: shop.name,
        domain: shop.myshopifyDomain,
        email: shop.email,
        plan: shop.plan?.displayName,
        currency: shop.currencyCode,
      },
    });
  } catch (err) {
    console.error("Onboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/onboard?token=xxx — verify session
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const merchantId = await redis.get<string>(keys.session(token));
  if (!merchantId) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const merchant = await redis.get<MerchantData>(keys.merchant(merchantId));
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  return NextResponse.json({
    merchantId: merchant.id,
    shopName: merchant.shopName,
    shopDomain: merchant.shopDomain,
    email: merchant.email,
    plan: merchant.plan,
    currency: merchant.currency,
    agentEnabled: merchant.agentEnabled,
    agentConfig: merchant.agentConfig,
  });
}
