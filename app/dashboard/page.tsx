"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";

type Snapshot = {
  revenue: number;
  conversionRate: number;
  cartsCreated: number;
  checkoutsStarted: number;
  ordersPaid: number;
  recoveredCarts: number;
  timestamp: number;
};

export default function DashboardPage() {
  const [merchantId, setMerchantId] = useState("merchant-demo");
  const [redisUrl, setRedisUrl] = useState("");
  const [redisToken, setRedisToken] = useState("");
  const [latest, setLatest] = useState<Snapshot | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ merchantId, redisUrl, redisToken });
    return `/api/events?${params.toString()}`;
  }, [merchantId, redisUrl, redisToken]);

  useEffect(() => {
    if (!redisUrl || !redisToken) return;
    let timer: NodeJS.Timeout;

    const load = async () => {
      const response = await fetch(query, { cache: "no-store" });
      const json = await response.json();
      if (json.ok) setLatest(json.latest);
      timer = setTimeout(load, 2500);
    };

    load();
    return () => clearTimeout(timer);
  }, [query, redisUrl, redisToken]);

  return (
    <main style={{ padding: 24, maxWidth: 1080, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 34 }}>Shopify Agent Command Center</h1>
      <p style={{ color: "#9aa7bd" }}>Onboarding, settings, and live conversion analytics powered by merchant-owned Upstash keys.</p>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr", marginTop: 18 }}>
        <input placeholder="Merchant ID" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} style={inputStyle} />
        <input placeholder="Upstash Redis URL" value={redisUrl} onChange={(e) => setRedisUrl(e.target.value)} style={inputStyle} />
        <input placeholder="Upstash Redis Token" value={redisToken} onChange={(e) => setRedisToken(e.target.value)} style={inputStyle} />
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 20 }}>
        <KpiCard label="Revenue" value={latest ? `$${latest.revenue.toLocaleString()}` : "$0"} accent="#34d399" />
        <KpiCard label="Conversion Rate" value={latest ? `${latest.conversionRate}%` : "0%"} accent="#60a5fa" />
        <KpiCard label="Recovered Carts" value={latest ? `${latest.recoveredCarts}` : "0"} accent="#fbbf24" />
        <KpiCard label="Carts" value={latest ? `${latest.cartsCreated}` : "0"} />
        <KpiCard label="Checkouts" value={latest ? `${latest.checkoutsStarted}` : "0"} />
        <KpiCard label="Orders" value={latest ? `${latest.ordersPaid}` : "0"} accent="#c084fc" />
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#121a2b",
  border: "1px solid #24314f",
  color: "#d8e0ef",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none"
};
