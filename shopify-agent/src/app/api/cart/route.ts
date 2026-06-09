import { NextRequest, NextResponse } from "next/server";
import { getMerchant, redis, keys } from "@/lib/redis";
import { ShopifyStorefrontClient, CART_CREATE_MUTATION, CART_ADD_LINES } from "@/lib/shopify";
import { nanoid } from "nanoid";

// POST /api/cart — create or update a cart
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { merchantId, storefrontToken, action, cartId, lines, buyerIdentity } = body;

  if (!merchantId || !storefrontToken) {
    return NextResponse.json({ error: "merchantId and storefrontToken required" }, { status: 400 });
  }

  const merchant = await getMerchant(merchantId);
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  const client = new ShopifyStorefrontClient(merchant.shopDomain, storefrontToken);

  if (action === "create" || !cartId) {
    const data = await client.query<{ cartCreate: { cart: Cart; userErrors: UserError[] } }>(
      CART_CREATE_MUTATION,
      {
        input: {
          lines: lines || [],
          buyerIdentity: buyerIdentity || {},
        },
      }
    );

    if (data.cartCreate.userErrors.length > 0) {
      return NextResponse.json({ errors: data.cartCreate.userErrors }, { status: 422 });
    }

    const cart = data.cartCreate.cart;

    // Cache cart in Redis for recovery
    await redis.set(
      keys.cart(cart.id),
      { ...cart, merchantId, createdAt: Date.now() },
      { ex: 86400 * 7 } // 7 days
    );

    return NextResponse.json({ cart });
  }

  if (action === "add_lines" && cartId) {
    const data = await client.query<{ cartLinesAdd: { cart: Cart; userErrors: UserError[] } }>(
      CART_ADD_LINES,
      { cartId, lines }
    );

    if (data.cartLinesAdd.userErrors.length > 0) {
      return NextResponse.json({ errors: data.cartLinesAdd.userErrors }, { status: 422 });
    }

    return NextResponse.json({ cart: data.cartLinesAdd.cart });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/cart?cartId=xxx — get cart from Redis cache
export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cartId");
  if (!cartId) return NextResponse.json({ error: "cartId required" }, { status: 400 });

  const cart = await redis.get(keys.cart(cartId));
  if (!cart) return NextResponse.json({ error: "Cart not found or expired" }, { status: 404 });

  return NextResponse.json({ cart });
}

type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
};

type UserError = { field: string; message: string };
