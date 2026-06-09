import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key namespaces
export const keys = {
  merchant: (id: string) => `merchant:${id}`,
  merchantSettings: (id: string) => `merchant:${id}:settings`,
  merchantAnalytics: (id: string) => `merchant:${id}:analytics`,
  session: (token: string) => `session:${token}`,
  cart: (id: string) => `cart:${id}`,
  conversion: (merchantId: string, date: string) => `conversion:${merchantId}:${date}`,
  realtimeEvents: (merchantId: string) => `events:${merchantId}`,
  agentActions: (merchantId: string) => `agent:actions:${merchantId}`,
  orders: (merchantId: string) => `orders:${merchantId}`,
};

export type MerchantData = {
  id: string;
  shopDomain: string;
  accessToken: string;
  shopName: string;
  email: string;
  plan: string;
  currency: string;
  createdAt: string;
  agentEnabled: boolean;
  agentConfig: AgentConfig;
};

export type AgentConfig = {
  autoCartRecovery: boolean;
  checkoutOptimization: boolean;
  dynamicPricing: boolean;
  upsellEnabled: boolean;
  crossSellEnabled: boolean;
  abandonedCartEmails: boolean;
  conversionGoal: number; // target conversion rate %
  ucpEnabled: boolean;
};

export type AnalyticsSnapshot = {
  timestamp: number;
  sessions: number;
  addToCart: number;
  checkoutStarted: number;
  checkoutCompleted: number;
  revenue: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  avgOrderValue: number;
  topProducts: { id: string; title: string; revenue: number }[];
};

export async function getMerchant(id: string): Promise<MerchantData | null> {
  return redis.get<MerchantData>(keys.merchant(id));
}

export async function saveMerchant(data: MerchantData): Promise<void> {
  await redis.set(keys.merchant(data.id), data);
}

export async function getAnalytics(merchantId: string): Promise<AnalyticsSnapshot | null> {
  return redis.get<AnalyticsSnapshot>(keys.merchantAnalytics(merchantId));
}

export async function pushEvent(merchantId: string, event: object): Promise<void> {
  const key = keys.realtimeEvents(merchantId);
  await redis.lpush(key, JSON.stringify({ ...event, ts: Date.now() }));
  await redis.ltrim(key, 0, 499); // keep last 500 events
  await redis.expire(key, 86400); // 24h TTL
}

export async function getRecentEvents(merchantId: string, count = 50): Promise<object[]> {
  const raw = await redis.lrange(keys.realtimeEvents(merchantId), 0, count - 1);
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
