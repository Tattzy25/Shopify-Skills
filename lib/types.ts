export type MerchantSettings = {
  merchantId: string;
  shopDomain: string;
  timezone: string;
  currency: string;
  aiMode: "assist" | "autopilot";
  goals: {
    conversionRateTarget: number;
    averageOrderValueTarget: number;
    cartRecoveryTarget: number;
  };
  apiKeys: {
    shopifyAdminApiKey: string;
    shopifyAdminApiSecret: string;
    upstashRedisUrl: string;
    upstashRedisToken: string;
    upstashQstashToken?: string;
  };
  updatedAt: string;
};

export type RealtimeSnapshot = {
  merchantId: string;
  timestamp: number;
  cartsCreated: number;
  checkoutsStarted: number;
  ordersPaid: number;
  revenue: number;
  conversionRate: number;
  recoveredCarts: number;
};
