"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MerchantSession = {
  merchantId: string;
  sessionToken: string;
  shopName: string;
  shopDomain: string;
  email: string;
  plan: string;
  currency: string;
  agentEnabled: boolean;
};

type MerchantStore = {
  session: MerchantSession | null;
  setSession: (s: MerchantSession) => void;
  clearSession: () => void;
};

export const useMerchantStore = create<MerchantStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    { name: "shopify-agent-session" }
  )
);
