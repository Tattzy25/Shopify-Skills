"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Demo page — shows the agent in action with simulated data
// No API keys needed — shows what the real dashboard looks like

const DEMO_REVENUE = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
  revenue: Math.round(800 + Math.random() * 3200 + (i > 20 ? i * 80 : 0)),
  orders: Math.round(8 + Math.random() * 32 + (i > 20 ? i * 0.8 : 0)),
  sessions: Math.round(300 + Math.random() * 800),
}));

const DEMO_INSIGHTS = [
  { metric: "Cart Abandonment Rate", current: 78, benchmark: 45, priority: "critical", action: "Deploy cart recovery sequences with time-sensitive discounts" },
  { metric: "Store Conversion Rate", current: 0.8, benchmark: 3.5, priority: "critical", action: "Optimize checkout flow, add trust signals, enable one-click checkout" },
  { metric: "Average Order Value", current: 34, benchmark: 85, priority: "high", action: "Enable upsell/cross-sell at cart and post-purchase" },
  { metric: "Repeat Purchase Rate", current: 12, benchmark: 35, priority: "medium", action: "Launch win-back campaigns for lapsed customers" },
];

const DEMO_ACTIONS = [
  { id: "1", type: "cart_recovery", description: "Send cart recovery sequence to 847 abandoned carts", impact: "high", estimatedRevenue: 12400 },
  { id: "2", type: "checkout_optimization", description: "Enable Shop Pay, reduce checkout steps, add progress indicator", impact: "high", estimatedRevenue: 24000 },
  { id: "3", type: "upsell_trigger", description: "Deploy pre-checkout upsell for top 5 products", impact: "medium", estimatedRevenue: 8200 },
  { id: "4", type: "abandoned_checkout", description: "Trigger Shopify Flow abandoned checkout automation", impact: "high", estimatedRevenue: 18000 },
  { id: "5", type: "customer_win_back", description: "Identify 234 customers inactive 90+ days and deploy win-back discount", impact: "medium", estimatedRevenue: 9500 },
];

export default function DemoPage() {
  const router = useRouter();
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentDone, setAgentDone] = useState(false);
  const [score, setScore] = useState(0);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [liveRevenue, setLiveRevenue] = useState(48320);

  // Simulate live revenue ticking up
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveRevenue((v) => v + Math.round(Math.random() * 120));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function runDemoAgent() {
    setAgentRunning(true);
    setAgentDone(false);
    setScore(0);
    setCompletedActions([]);

    // Animate score
    for (let i = 0; i <= 87; i += 3) {
      await sleep(40);
      setScore(i);
    }

    setAgentRunning(false);
    setAgentDone(true);
  }

  async function executeAction(id: string) {
    setActiveAction(id);
    await sleep(1500);
    setActiveAction(null);
    setCompletedActions((prev) => [...prev, id]);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-black font-black text-sm">
            SA
          </div>
          <span className="font-bold text-white text-lg">ShopifyAgent</span>
          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs font-medium">DEMO</span>
        </div>
        <button
          onClick={() => router.push("/onboard")}
          className="px-5 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-all"
        >
          Connect Real Store →
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Demo Banner */}
        <div className="glass rounded-2xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-orange-400 text-lg">⚡</span>
            <div>
              <span className="text-white font-bold text-sm">Demo Mode</span>
              <span className="text-white/40 text-sm ml-2">— Simulated data showing what the agent does with a real store</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-green-400 text-sm font-medium">Live Revenue: ${liveRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenue (30d)", value: `$${liveRevenue.toLocaleString()}`, color: "text-green-400" },
            { label: "Total Orders", value: "1,247", color: "text-blue-400" },
            { label: "Conversion Rate", value: "0.8% → 104%", color: "text-purple-400" },
            { label: "Cart Abandonment", value: "78% → 32%", color: "text-orange-400" },
          ].map((k) => (
            <div key={k.label} className="glass rounded-2xl p-5">
              <div className="text-white/40 text-sm mb-2">{k.label}</div>
              <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Revenue Trajectory (After Agent)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={DEMO_REVENUE}>
                <defs>
                  <linearGradient id="demoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  itemStyle={{ color: "#22c55e" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#demoGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Agent Score */}
          <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="text-white/40 text-sm mb-4">Conversion Score</div>
            <div className="relative w-36 h-36 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={score >= 90 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={`${(score / 104) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{score}</span>
                <span className="text-white/30 text-xs">/ 104</span>
              </div>
            </div>
            <button
              onClick={runDemoAgent}
              disabled={agentRunning}
              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black transition-all text-sm"
            >
              {agentRunning ? "Analyzing..." : agentDone ? "Re-run Agent" : "Run Agent"}
            </button>
          </div>
        </div>

        {/* Insights */}
        {agentDone && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Conversion Insights Found</h3>
              <div className="space-y-3">
                {DEMO_INSIGHTS.map((insight) => (
                  <div
                    key={insight.metric}
                    className={`rounded-xl p-4 border ${
                      insight.priority === "critical" ? "bg-red-500/10 border-red-500/20 text-red-300" :
                      insight.priority === "high" ? "bg-orange-500/10 border-orange-500/20 text-orange-300" :
                      "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm mb-1">{insight.metric}</div>
                        <p className="text-sm opacity-80">{insight.action}</p>
                      </div>
                      <div className="text-right text-sm shrink-0 ml-4">
                        <div className="font-black text-lg">{insight.current}%</div>
                        <div className="opacity-50 text-xs">target: {insight.benchmark}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Agent Action Queue</h3>
              <div className="space-y-3">
                {DEMO_ACTIONS.map((action) => {
                  const isDone = completedActions.includes(action.id);
                  const isRunning = activeAction === action.id;
                  return (
                    <div key={action.id} className={`glass rounded-xl p-4 flex items-center justify-between transition-all ${isDone ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${action.impact === "high" ? "bg-red-400" : "bg-yellow-400"} ${isRunning ? "animate-pulse" : ""}`}></span>
                        <div>
                          <div className="text-sm text-white font-medium">{action.description}</div>
                          <div className="text-xs text-white/30 capitalize">{action.type.replace(/_/g, " ")} · {action.impact} impact</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-green-400 text-sm font-bold">+${action.estimatedRevenue.toLocaleString()}</span>
                        <button
                          onClick={() => executeAction(action.id)}
                          disabled={isDone || isRunning}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isDone ? "bg-green-500/20 text-green-400" :
                            isRunning ? "bg-white/10 text-white/40" :
                            "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                        >
                          {isDone ? "✓ Done" : isRunning ? "Running..." : "Execute"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-white/40 text-sm">Total Projected Revenue Lift</div>
                  <div className="text-3xl font-black text-green-400">$72,100</div>
                </div>
                <button
                  onClick={() => router.push("/onboard")}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black transition-all"
                >
                  Connect My Real Store →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
