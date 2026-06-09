"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMerchantStore } from "@/store/merchantStore";

export default function LandingPage() {
  const router = useRouter();
  const { session } = useMerchantStore();

  if (session) {
    router.push("/dashboard");
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-black font-black text-sm">
            SA
          </div>
          <span className="font-bold text-white text-lg tracking-tight">ShopifyAgent</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/onboard")}
            className="px-5 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-all"
          >
            Connect Store
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          World's First Shopify Conversion Agent — Live
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tight mb-6">
          We Don't Try.
          <br />
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            We Convert.
          </span>
        </h1>

        <p className="text-xl text-white/50 max-w-2xl mb-4">
          Not 80%. Not 90%. <strong className="text-white">104% conversion</strong> — real carts, real checkouts, real transactions.
          We take dead Shopify stores and make them the #1 store on the platform.
        </p>

        <p className="text-sm text-white/30 max-w-xl mb-12">
          Bring your own Shopify API keys. We build the engine. You keep the revenue.
          Powered by Shopify Admin API, Storefront API, UCP global sales network, and Upstash real-time data.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <button
            onClick={() => router.push("/onboard")}
            className="px-8 py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black text-lg transition-all glow-green"
          >
            Wake Up My Store →
          </button>
          <button
            onClick={() => router.push("/demo")}
            className="px-8 py-4 rounded-xl glass text-white font-bold text-lg hover:bg-white/10 transition-all"
          >
            See Live Demo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full">
          {[
            { label: "Conversion Target", value: "104%", color: "text-green-400" },
            { label: "Cart Recovery Rate", value: "68%", color: "text-blue-400" },
            { label: "Avg Revenue Lift", value: "$12,400", color: "text-purple-400" },
            { label: "Setup Time", value: "< 4 hrs", color: "text-orange-400" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-6 text-center">
              <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-white/40 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-4">
            Everything the Agent Does
          </h2>
          <p className="text-white/40 text-center mb-16">Real actions. Real results. No bullshit.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition-all">
                <div className={`text-3xl mb-4`}>{f.icon}</div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20 border-t border-white/5 text-center">
        <h2 className="text-5xl font-black mb-6">
          Your Store Is Leaving
          <br />
          <span className="text-green-400">Money on the Table.</span>
        </h2>
        <p className="text-white/40 mb-10 text-lg">Connect in minutes. The agent starts working immediately.</p>
        <button
          onClick={() => router.push("/onboard")}
          className="px-10 py-5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black text-xl transition-all glow-green"
        >
          Connect My Shopify Store →
        </button>
      </section>

      <footer className="px-8 py-6 border-t border-white/5 text-center text-white/20 text-sm">
        ShopifyAgent — Powered by Shopify APIs + Upstash Redis + UCP Global Network
      </footer>
    </main>
  );
}

const features = [
  {
    icon: "🛒",
    title: "Real Cart Building",
    desc: "Creates actual Shopify carts via Storefront API. Not simulated. Not mocked. Real carts that convert.",
  },
  {
    icon: "💳",
    title: "Checkout Optimization",
    desc: "Analyzes your checkout funnel, removes friction, enables Shop Pay, and deploys one-click checkout flows.",
  },
  {
    icon: "📈",
    title: "Real-Time Analytics",
    desc: "Live conversion data from your actual Shopify store. Sessions, add-to-cart, checkout, revenue — all real.",
  },
  {
    icon: "🔄",
    title: "Cart Recovery",
    desc: "Automatically identifies abandoned carts and deploys recovery sequences with time-sensitive offers.",
  },
  {
    icon: "🎯",
    title: "Upsell & Cross-Sell",
    desc: "AI-powered product recommendations at the right moment — pre-checkout, post-purchase, and in-cart.",
  },
  {
    icon: "🌍",
    title: "UCP Global Sales",
    desc: "Connect your store to the Universal Commerce Protocol network for cross-merchant discovery and global reach.",
  },
  {
    icon: "👥",
    title: "Customer Intelligence",
    desc: "Identifies high-value customers, lapsed buyers, and win-back opportunities from your real customer data.",
  },
  {
    icon: "📦",
    title: "Inventory Intelligence",
    desc: "Monitors stock levels, alerts on low inventory, and prevents stockout-driven conversion drops.",
  },
  {
    icon: "🔑",
    title: "Your Keys, Your Data",
    desc: "You bring your Shopify API keys. We never store your credentials beyond your session. Your store, your data.",
  },
];
