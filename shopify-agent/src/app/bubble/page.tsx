"use client";
// Bubble Demo Page — shows the floating bubble in action
import FloatingBubble from "@/components/FloatingBubble";

export default function BubbleDemoPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        {/* Chrome gold gradient title */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse"></span>
          MCP · UCP · Multi-Model AI — Live
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-6">
          Musarty
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #C9A84C 0%, #F5D78E 40%, #C9A84C 60%, #8B6914 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Bubble AI
          </span>
        </h1>

        <p className="text-white/50 text-lg mb-4 max-w-xl mx-auto">
          The world&apos;s first MCP-native floating AI bubble for Shopify stores.
          Powered by ChatGPT, Gemini, Claude — all in one chrome-gold interface.
        </p>

        <p className="text-white/30 text-sm mb-12">
          Click the gold bubble in the bottom-right corner to experience it.
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { label: "AI Models", value: "3+", color: "#C9A84C" },
            { label: "Protocol", value: "MCP", color: "#F5D78E" },
            { label: "Network", value: "UCP", color: "#C9A84C" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5 text-center"
              style={{
                background: "rgba(201,168,76,0.06)",
                border: "1px solid rgba(201,168,76,0.15)",
              }}
            >
              <div className="text-2xl font-black mb-1" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-white/40 text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
          {[
            "ChatGPT · Gemini · Claude in one bubble",
            "Model Context Protocol (MCP) native",
            "Universal Commerce Protocol (UCP) search",
            "Real-time Shopify store context",
            "Cart recovery & upsell intelligence",
            "Chrome gold luxury design",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ color: "#C9A84C" }}>◆</span>
              <span className="text-white/60 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The floating bubble itself */}
      <FloatingBubble
        merchantId="demo"
        shopName="Musarty Demo Store"
        shopDomain="musarty.com"
      />
    </div>
  );
}
