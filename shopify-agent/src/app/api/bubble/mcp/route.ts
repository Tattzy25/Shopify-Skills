import { NextRequest, NextResponse } from "next/server";
import { getMerchant, getAnalytics, getRecentEvents } from "@/lib/redis";

// GET /api/bubble/mcp?merchantId=xxx — Model Context Protocol data endpoint
// Returns structured store context for MCP-compatible AI models
export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId");

  if (!merchantId) {
    return NextResponse.json({ error: "merchantId required" }, { status: 400 });
  }

  try {
    const [merchant, analytics, events] = await Promise.allSettled([
      getMerchant(merchantId),
      getAnalytics(merchantId),
      getRecentEvents(merchantId, 20),
    ]);

    const merchantData = merchant.status === "fulfilled" ? merchant.value : null;
    const analyticsData = analytics.status === "fulfilled" ? analytics.value : null;
    const eventsData = events.status === "fulfilled" ? events.value : [];

    if (!merchantData) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // MCP-structured context payload
    const mcpContext = {
      protocol: "MCP",
      version: "1.0",
      timestamp: Date.now(),
      merchant: {
        id: merchantData.id,
        name: merchantData.shopName,
        domain: merchantData.shopDomain,
        currency: merchantData.currency,
        plan: merchantData.plan,
      },
      analytics: analyticsData
        ? {
            revenue: analyticsData.revenue,
            orders: analyticsData.checkoutCompleted,
            conversionRate: analyticsData.conversionRate,
            cartAbandonmentRate: analyticsData.cartAbandonmentRate,
            avgOrderValue: analyticsData.avgOrderValue,
            sessions: analyticsData.sessions,
            topProducts: analyticsData.topProducts?.slice(0, 5) || [],
          }
        : null,
      recentEvents: eventsData.slice(0, 10),
      agentConfig: {
        autoCartRecovery: merchantData.agentConfig?.autoCartRecovery,
        upsellEnabled: merchantData.agentConfig?.upsellEnabled,
        ucpEnabled: merchantData.agentConfig?.ucpEnabled,
      },
      capabilities: [
        "cart_recovery",
        "product_search",
        "checkout_optimization",
        "upsell",
        "cross_sell",
        "ucp_discovery",
        "customer_intelligence",
      ],
    };

    return NextResponse.json(mcpContext);
  } catch (err) {
    console.error("MCP context error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/bubble/mcp — Execute MCP tool call
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { merchantId, tool, params } = body;

  if (!merchantId || !tool) {
    return NextResponse.json({ error: "merchantId and tool required" }, { status: 400 });
  }

  const merchant = await getMerchant(merchantId);
  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  // MCP tool execution
  switch (tool) {
    case "get_analytics":
      const analytics = await getAnalytics(merchantId);
      return NextResponse.json({ tool, result: analytics });

    case "get_events":
      const events = await getRecentEvents(merchantId, params?.count || 20);
      return NextResponse.json({ tool, result: events });

    case "search_products":
      // Proxy to Shopify Storefront API for product search
      return NextResponse.json({
        tool,
        result: { message: "Product search via Storefront API", query: params?.query },
      });

    case "ucp_discover":
      // UCP discovery for cross-merchant products
      return NextResponse.json({
        tool,
        result: {
          protocol: "UCP",
          business: params?.business || merchant.shopDomain,
          capabilities: ["catalog_search", "cart", "checkout", "orders"],
        },
      });

    default:
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  }
}
