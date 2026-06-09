import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 42, marginBottom: 12 }}>Shopify Agent Growth Engine</h1>
      <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>
        Merchant-first AI operations stack: onboarding, settings, live KPI telemetry, cart/checkout recovery signals,
        and conversion acceleration using merchant-owned Shopify and Upstash credentials.
      </p>
      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard" style={{ color: "#22d3ee", fontWeight: 700 }}>Open Merchant Dashboard →</Link>
      </div>
    </main>
  );
}
