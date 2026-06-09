import { RealtimeSnapshot } from "./types";

export function calculateConversionRate(checkoutsStarted: number, ordersPaid: number) {
  if (checkoutsStarted <= 0) return 0;
  return Number(((ordersPaid / checkoutsStarted) * 100).toFixed(2));
}

export function buildSnapshot(input: Omit<RealtimeSnapshot, "conversionRate" | "timestamp">): RealtimeSnapshot {
  const timestamp = Date.now();
  return {
    ...input,
    timestamp,
    conversionRate: calculateConversionRate(input.checkoutsStarted, input.ordersPaid)
  };
}
