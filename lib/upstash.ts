import { Redis } from "@upstash/redis";

export function createMerchantRedis(restUrl: string, restToken: string) {
  return new Redis({
    url: restUrl,
    token: restToken
  });
}

export function sanitizeSettingsPayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    apiKeys: {
      ...(payload.apiKeys as Record<string, string>),
      shopifyAdminApiSecret: "***",
      upstashRedisToken: "***",
      upstashQstashToken: payload.apiKeys && (payload.apiKeys as Record<string, string>).upstashQstashToken ? "***" : undefined
    }
  };
}
