// The Conversion Agent — core intelligence layer
// Analyzes store data, identifies conversion opportunities, executes actions

import { redis, keys, type MerchantData, type AgentConfig } from "./redis";
import { ShopifyAdminClient, ORDERS_QUERY, PRODUCTS_QUERY, CUSTOMERS_QUERY } from "./shopify";

export type AgentAction = {
  id: string;
  type: ActionType;
  status: "pending" | "running" | "completed" | "failed";
  description: string;
  impact: "high" | "medium" | "low";
  estimatedRevenue?: number;
  executedAt?: number;
  result?: string;
};

export type ActionType =
  | "cart_recovery"
  | "checkout_optimization"
  | "upsell_trigger"
  | "cross_sell"
  | "price_optimization"
  | "inventory_alert"
  | "customer_win_back"
  | "abandoned_checkout"
  | "product_boost"
  | "discount_deploy";

export type ConversionInsight = {
  metric: string;
  current: number;
  benchmark: number;
  gap: number;
  priority: "critical" | "high" | "medium" | "low";
  action: string;
};

export type AgentReport = {
  merchantId: string;
  generatedAt: number;
  conversionScore: number; // 0-104 (we go beyond 100%)
  insights: ConversionInsight[];
  pendingActions: AgentAction[];
  completedActions: AgentAction[];
  projectedRevenueLift: number;
  storeHealth: "dead" | "struggling" | "growing" | "thriving" | "dominating";
};

// ─── Agent Core ───────────────────────────────────────────────────────────────

export async function runConversionAgent(merchant: MerchantData): Promise<AgentReport> {
  const client = new ShopifyAdminClient({
    shopDomain: merchant.shopDomain,
    accessToken: merchant.accessToken,
  });

  // Fetch live store data
  const [ordersData, productsData, customersData] = await Promise.allSettled([
    client.query<{ orders: { nodes: Order[] } }>(ORDERS_QUERY, {
      first: 50,
      query: "created_at:>2024-01-01",
    }),
    client.query<{ products: { nodes: Product[] } }>(PRODUCTS_QUERY, { first: 50 }),
    client.query<{ customers: { nodes: Customer[] } }>(CUSTOMERS_QUERY, { first: 50 }),
  ]);

  const orders = ordersData.status === "fulfilled" ? ordersData.value.orders.nodes : [];
  const products = productsData.status === "fulfilled" ? productsData.value.products.nodes : [];
  const customers = customersData.status === "fulfilled" ? customersData.value.customers.nodes : [];

  // Compute metrics
  const metrics = computeMetrics(orders, products, customers);
  const insights = generateInsights(metrics, merchant.agentConfig);
  const actions = generateActions(insights, merchant.agentConfig);
  const conversionScore = computeConversionScore(metrics);
  const storeHealth = getStoreHealth(conversionScore, metrics);

  // Persist actions to Redis
  const actionsKey = keys.agentActions(merchant.id);
  await redis.set(actionsKey, JSON.stringify(actions), { ex: 3600 });

  // Persist analytics snapshot
  await redis.set(
    keys.merchantAnalytics(merchant.id),
    {
      timestamp: Date.now(),
      sessions: metrics.estimatedSessions,
      addToCart: metrics.addToCartCount,
      checkoutStarted: metrics.checkoutStarted,
      checkoutCompleted: orders.length,
      revenue: metrics.totalRevenue,
      conversionRate: metrics.conversionRate,
      cartAbandonmentRate: metrics.cartAbandonmentRate,
      avgOrderValue: metrics.avgOrderValue,
      topProducts: metrics.topProducts,
    },
    { ex: 3600 }
  );

  return {
    merchantId: merchant.id,
    generatedAt: Date.now(),
    conversionScore,
    insights,
    pendingActions: actions.filter((a) => a.status === "pending"),
    completedActions: actions.filter((a) => a.status === "completed"),
    projectedRevenueLift: computeRevenueLift(metrics, insights),
    storeHealth,
  };
}

// ─── Metrics Engine ───────────────────────────────────────────────────────────

type Order = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: { id: string; displayName: string; email: string } | null;
  lineItems: { nodes: { title: string; quantity: number }[] };
};

type Product = {
  id: string;
  title: string;
  status: string;
  totalInventory: number;
  priceRangeV2: {
    minVariantPrice: { amount: string };
    maxVariantPrice: { amount: string };
  };
};

type Customer = {
  id: string;
  displayName: string;
  email: string;
  ordersCount: number;
  totalSpentV2: { amount: string; currencyCode: string };
  createdAt: string;
};

function computeMetrics(orders: Order[], products: Product[], customers: Customer[]) {
  const totalRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalPriceSet?.shopMoney?.amount || "0"),
    0
  );
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const paidOrders = orders.filter((o) => o.displayFinancialStatus === "PAID");
  const conversionRate = orders.length > 0 ? (paidOrders.length / orders.length) * 100 : 0;

  // Estimate funnel (industry benchmarks applied)
  const estimatedSessions = Math.max(orders.length * 40, 100);
  const addToCartCount = Math.round(estimatedSessions * 0.08);
  const checkoutStarted = Math.round(addToCartCount * 0.6);
  const cartAbandonmentRate = checkoutStarted > 0
    ? ((checkoutStarted - orders.length) / checkoutStarted) * 100
    : 70;

  // Top products by order frequency
  const productFreq: Record<string, number> = {};
  orders.forEach((o) =>
    o.lineItems?.nodes?.forEach((li) => {
      productFreq[li.title] = (productFreq[li.title] || 0) + li.quantity;
    })
  );
  const topProducts = Object.entries(productFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([title, qty]) => ({ id: title, title, revenue: qty * avgOrderValue }));

  // Low inventory products
  const lowInventory = products.filter(
    (p) => p.status === "ACTIVE" && p.totalInventory < 5 && p.totalInventory >= 0
  );

  // Repeat customers
  const repeatCustomers = customers.filter((c) => c.ordersCount > 1);
  const repeatRate = customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0;

  // High-value customers (top 20%)
  const sortedBySpend = [...customers].sort(
    (a, b) => parseFloat(b.totalSpentV2?.amount || "0") - parseFloat(a.totalSpentV2?.amount || "0")
  );
  const topCustomers = sortedBySpend.slice(0, Math.ceil(customers.length * 0.2));

  return {
    totalRevenue,
    avgOrderValue,
    conversionRate,
    estimatedSessions,
    addToCartCount,
    checkoutStarted,
    cartAbandonmentRate,
    topProducts,
    lowInventory,
    repeatRate,
    topCustomers,
    totalOrders: orders.length,
    totalProducts: products.length,
    totalCustomers: customers.length,
    activeProducts: products.filter((p) => p.status === "ACTIVE").length,
  };
}

function generateInsights(
  metrics: ReturnType<typeof computeMetrics>,
  config: AgentConfig
): ConversionInsight[] {
  const insights: ConversionInsight[] = [];

  // Cart abandonment
  if (metrics.cartAbandonmentRate > 60) {
    insights.push({
      metric: "Cart Abandonment Rate",
      current: metrics.cartAbandonmentRate,
      benchmark: 45,
      gap: metrics.cartAbandonmentRate - 45,
      priority: metrics.cartAbandonmentRate > 80 ? "critical" : "high",
      action: "Deploy cart recovery sequences with time-sensitive discounts",
    });
  }

  // Conversion rate
  if (metrics.conversionRate < 3) {
    insights.push({
      metric: "Store Conversion Rate",
      current: metrics.conversionRate,
      benchmark: 3.5,
      gap: 3.5 - metrics.conversionRate,
      priority: metrics.conversionRate < 1 ? "critical" : "high",
      action: "Optimize checkout flow, add trust signals, enable one-click checkout",
    });
  }

  // AOV
  if (metrics.avgOrderValue < 50) {
    insights.push({
      metric: "Average Order Value",
      current: metrics.avgOrderValue,
      benchmark: 85,
      gap: 85 - metrics.avgOrderValue,
      priority: "medium",
      action: "Enable upsell/cross-sell at cart and post-purchase",
    });
  }

  // Repeat purchase rate
  if (metrics.repeatRate < 25) {
    insights.push({
      metric: "Repeat Purchase Rate",
      current: metrics.repeatRate,
      benchmark: 35,
      gap: 35 - metrics.repeatRate,
      priority: "medium",
      action: "Launch win-back campaigns for lapsed customers",
    });
  }

  // Low inventory alerts
  if (metrics.lowInventory.length > 0) {
    insights.push({
      metric: "Low Inventory Products",
      current: metrics.lowInventory.length,
      benchmark: 0,
      gap: metrics.lowInventory.length,
      priority: "high",
      action: `Restock ${metrics.lowInventory.length} products before stockout kills conversions`,
    });
  }

  return insights.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });
}

function generateActions(insights: ConversionInsight[], config: AgentConfig): AgentAction[] {
  const actions: AgentAction[] = [];
  let id = 1;

  if (config.autoCartRecovery) {
    actions.push({
      id: `action-${id++}`,
      type: "cart_recovery",
      status: "pending",
      description: "Send cart recovery sequence to abandoned carts (1hr, 24hr, 72hr)",
      impact: "high",
      estimatedRevenue: 1200,
    });
  }

  if (config.checkoutOptimization) {
    actions.push({
      id: `action-${id++}`,
      type: "checkout_optimization",
      status: "pending",
      description: "Enable Shop Pay, reduce checkout steps, add progress indicator",
      impact: "high",
      estimatedRevenue: 2400,
    });
  }

  if (config.upsellEnabled) {
    actions.push({
      id: `action-${id++}`,
      type: "upsell_trigger",
      status: "pending",
      description: "Deploy pre-checkout upsell for top 5 products",
      impact: "medium",
      estimatedRevenue: 800,
    });
  }

  if (config.crossSellEnabled) {
    actions.push({
      id: `action-${id++}`,
      type: "cross_sell",
      status: "pending",
      description: "Add frequently-bought-together recommendations to product pages",
      impact: "medium",
      estimatedRevenue: 600,
    });
  }

  if (config.abandonedCartEmails) {
    actions.push({
      id: `action-${id++}`,
      type: "abandoned_checkout",
      status: "pending",
      description: "Trigger Shopify Flow abandoned checkout automation",
      impact: "high",
      estimatedRevenue: 1800,
    });
  }

  // Always add win-back
  actions.push({
    id: `action-${id++}`,
    type: "customer_win_back",
    status: "pending",
    description: "Identify customers inactive 90+ days and deploy win-back discount",
    impact: "medium",
    estimatedRevenue: 950,
  });

  return actions;
}

function computeConversionScore(metrics: ReturnType<typeof computeMetrics>): number {
  let score = 0;

  // Conversion rate (max 30 pts)
  score += Math.min(30, (metrics.conversionRate / 5) * 30);

  // Cart abandonment (max 25 pts — lower is better)
  score += Math.max(0, 25 - (metrics.cartAbandonmentRate / 100) * 25);

  // AOV (max 20 pts)
  score += Math.min(20, (metrics.avgOrderValue / 150) * 20);

  // Repeat rate (max 15 pts)
  score += Math.min(15, (metrics.repeatRate / 50) * 15);

  // Product health (max 10 pts)
  const productHealthRatio =
    metrics.totalProducts > 0 ? metrics.activeProducts / metrics.totalProducts : 0;
  score += productHealthRatio * 10;

  // Agent bonus — having the agent enabled pushes beyond 100
  score += 4; // The extra 4% that gets us to 104

  return Math.min(104, Math.round(score));
}

function getStoreHealth(
  score: number,
  metrics: ReturnType<typeof computeMetrics>
): AgentReport["storeHealth"] {
  if (score >= 90) return "dominating";
  if (score >= 70) return "thriving";
  if (score >= 50) return "growing";
  if (score >= 25) return "struggling";
  return "dead";
}

function computeRevenueLift(
  metrics: ReturnType<typeof computeMetrics>,
  insights: ConversionInsight[]
): number {
  // Estimate revenue lift from fixing top 3 insights
  const topInsights = insights.slice(0, 3);
  let lift = 0;

  topInsights.forEach((insight) => {
    if (insight.metric === "Cart Abandonment Rate") {
      lift += metrics.totalRevenue * (insight.gap / 100) * 0.15;
    } else if (insight.metric === "Store Conversion Rate") {
      lift += metrics.totalRevenue * (insight.gap / 100) * 0.8;
    } else if (insight.metric === "Average Order Value") {
      lift += metrics.totalOrders * insight.gap;
    }
  });

  return Math.round(lift);
}
