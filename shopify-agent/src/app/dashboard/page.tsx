"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMerchantStore } from "@/store/merchantStore";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from "recharts";

type AnalyticsData = {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    conversionRate: number;
    cartAbandonmentRate: number;
    totalProducts: number;
    activeProducts: number;
    currency: string;
  };
  funnel: { stage: string; count: number; rate: number }[];
  chartData: { date: string; revenue: number; orders: number; sessions: number }[];
  topProducts: { title: string; revenue: number; units: number }[];
  recentEvents: { type: string; ts: number; data?: unknown }[];
};

type AgentReport = {
  conversionScore: number;
  storeHealth: string;
  insights: {
    metric: string;
    current: number;
    benchmark: number;
    gap: number;
    priority: string;
    action: string;
  }[];
  pendingActions: {
    id: string;
    type: string;
    description: string;
    impact: string;
    estimatedRevenue?: number;
  }[];
  projectedRevenueLift: number;
};

type Tab = "overview" | "agent" | "orders" | "products" | "customers" | "settings";

export default function DashboardPage() {
  const router = useRouter();
  const { session, clearSession } = useMerchantStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [agentReport, setAgentReport] = useState<AgentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!session) {
      router.push("/onboard");
      return;
    }
    loadAnalytics();
  }, [session]);

  const loadAnalytics = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?merchantId=${session.merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const runAgent = useCallback(async () => {
    if (!session) return;
    setAgentLoading(true);
    try {
      const res = await fetch(`/api/agent?merchantId=${session.merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setAgentReport(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAgentLoading(false);
    }
  }, [session]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  if (!session) return null;

  const healthColors: Record<string, string> = {
    dead: "text-red-400",
    struggling: "text-orange-400",
    growing: "text-yellow-400",
    thriving: "text-blue-400",
    dominating: "text-green-400",
  };

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col py-6 px-4 fixed h-full">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-black font-black text-sm">
            SA
          </div>
          <div>
            <div className="font-bold text-white text-sm">ShopifyAgent</div>
            <div className="text-white/30 text-xs truncate max-w-[140px]">{session.shopName}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {(["overview", "agent", "orders", "products", "customers", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tabIcons[t]}</span>
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <div className="px-3 py-2 rounded-xl bg-white/5 text-xs text-white/30">
            <div className="font-medium text-white/50 mb-1">Live Data</div>
            <div>Updated {lastRefresh.toLocaleTimeString()}</div>
          </div>
          <button
            onClick={() => { clearSession(); router.push("/"); }}
            className="w-full px-3 py-2 rounded-xl text-white/30 hover:text-red-400 text-sm transition-colors text-left"
          >
            Disconnect Store
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white capitalize">{tab}</h1>
            <p className="text-white/30 text-sm">{session.shopDomain}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-green-400 text-xs font-medium">Agent Active</span>
            </div>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 rounded-lg glass text-white/60 hover:text-white text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin"></div>
              </div>
            ) : analytics ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    label="Total Revenue"
                    value={`${analytics.summary.currency} ${analytics.summary.totalRevenue.toLocaleString()}`}
                    sub="Last 30 days"
                    color="text-green-400"
                  />
                  <KPICard
                    label="Total Orders"
                    value={analytics.summary.totalOrders.toString()}
                    sub="Last 30 days"
                    color="text-blue-400"
                  />
                  <KPICard
                    label="Conversion Rate"
                    value={`${analytics.summary.conversionRate}%`}
                    sub={`Target: 104%`}
                    color="text-purple-400"
                  />
                  <KPICard
                    label="Avg Order Value"
                    value={`$${analytics.summary.avgOrderValue}`}
                    sub="Per transaction"
                    color="text-orange-400"
                  />
                </div>

                {/* Revenue Chart */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-4">Revenue (Last 30 Days)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={analytics.chartData}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#revenueGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Funnel + Top Products */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Conversion Funnel */}
                  <div className="glass rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4">Conversion Funnel</h3>
                    <div className="space-y-3">
                      {analytics.funnel.map((stage, i) => (
                        <div key={stage.stage}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white/60">{stage.stage}</span>
                            <span className="text-white font-medium">{stage.count.toLocaleString()} ({stage.rate}%)</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${stage.rate}%`,
                                background: `hsl(${140 - i * 30}, 70%, 50%)`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-sm">
                      <span className="text-white/40">Cart Abandonment</span>
                      <span className="text-red-400 font-bold">{analytics.summary.cartAbandonmentRate}%</span>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="glass rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4">Top Products by Revenue</h3>
                    {analytics.topProducts.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.topProducts.slice(0, 6).map((p, i) => (
                          <div key={p.title} className="flex items-center gap-3">
                            <span className="text-white/20 text-xs w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{p.title}</div>
                              <div className="text-xs text-white/30">{p.units} units</div>
                            </div>
                            <span className="text-green-400 text-sm font-medium">${Math.round(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 text-sm">No product data yet</p>
                    )}
                  </div>
                </div>

                {/* Orders Chart */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-4">Daily Orders</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analytics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                        labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                        itemStyle={{ color: "#818cf8" }}
                      />
                      <Bar dataKey="orders" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-white/40">Failed to load analytics. Check your API credentials.</p>
                <button onClick={loadAnalytics} className="mt-4 px-6 py-2 rounded-lg bg-green-500 text-black font-bold text-sm">
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Agent Tab */}
        {tab === "agent" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-white">Conversion Agent</h2>
                  <p className="text-white/40 text-sm">AI-powered analysis of your store's conversion opportunities</p>
                </div>
                <button
                  onClick={runAgent}
                  disabled={agentLoading}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black transition-all"
                >
                  {agentLoading ? "Analyzing..." : "Run Agent Analysis"}
                </button>
              </div>

              {agentLoading && (
                <div className="flex items-center gap-4 py-8 justify-center">
                  <div className="w-8 h-8 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin"></div>
                  <span className="text-white/40">Agent is analyzing your store data...</span>
                </div>
              )}

              {agentReport && !agentLoading && (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="glass rounded-xl p-5 text-center col-span-1">
                      <div className="text-5xl font-black text-green-400 mb-1">{agentReport.conversionScore}</div>
                      <div className="text-white/40 text-sm">Conversion Score</div>
                      <div className="text-white/20 text-xs">/ 104</div>
                    </div>
                    <div className="glass rounded-xl p-5 text-center">
                      <div className={`text-2xl font-black capitalize mb-1 ${healthColors[agentReport.storeHealth] || "text-white"}`}>
                        {agentReport.storeHealth}
                      </div>
                      <div className="text-white/40 text-sm">Store Health</div>
                    </div>
                    <div className="glass rounded-xl p-5 text-center">
                      <div className="text-2xl font-black text-purple-400 mb-1">
                        ${agentReport.projectedRevenueLift.toLocaleString()}
                      </div>
                      <div className="text-white/40 text-sm">Projected Revenue Lift</div>
                    </div>
                  </div>

                  {/* Insights */}
                  {agentReport.insights.length > 0 && (
                    <div>
                      <h3 className="font-bold text-white mb-3">Conversion Insights</h3>
                      <div className="space-y-3">
                        {agentReport.insights.map((insight) => (
                          <div key={insight.metric} className={`rounded-xl p-4 border ${priorityColors[insight.priority] || "bg-white/5 text-white border-white/10"}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-sm">{insight.metric}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${priorityColors[insight.priority]}`}>
                                    {insight.priority}
                                  </span>
                                </div>
                                <p className="text-sm opacity-80">{insight.action}</p>
                              </div>
                              <div className="text-right text-sm shrink-0">
                                <div className="font-bold">{Math.round(insight.current * 10) / 10}%</div>
                                <div className="opacity-50 text-xs">vs {insight.benchmark}% target</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Actions */}
                  {agentReport.pendingActions.length > 0 && (
                    <div>
                      <h3 className="font-bold text-white mb-3">Agent Actions Queue</h3>
                      <div className="space-y-2">
                        {agentReport.pendingActions.map((action) => (
                          <div key={action.id} className="glass rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${action.impact === "high" ? "bg-red-400" : action.impact === "medium" ? "bg-yellow-400" : "bg-blue-400"}`}></span>
                              <div>
                                <div className="text-sm text-white font-medium">{action.description}</div>
                                <div className="text-xs text-white/30 capitalize">{action.type.replace(/_/g, " ")} · {action.impact} impact</div>
                              </div>
                            </div>
                            {action.estimatedRevenue && (
                              <span className="text-green-400 text-sm font-bold shrink-0">
                                +${action.estimatedRevenue.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!agentReport && !agentLoading && (
                <div className="text-center py-12 text-white/30">
                  <div className="text-4xl mb-4">🤖</div>
                  <p>Click "Run Agent Analysis" to get your conversion report</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && <OrdersTab merchantId={session.merchantId} currency={session.currency} />}

        {/* Products Tab */}
        {tab === "products" && <ProductsTab merchantId={session.merchantId} currency={session.currency} />}

        {/* Customers Tab */}
        {tab === "customers" && <CustomersTab merchantId={session.merchantId} />}

        {/* Settings Tab */}
        {tab === "settings" && <SettingsTab session={session} />}
      </main>
    </div>
  );
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-white/40 text-sm mb-2">{label}</div>
      <div className={`text-2xl font-black ${color} mb-1`}>{value}</div>
      <div className="text-white/20 text-xs">{sub}</div>
    </div>
  );
}

function OrdersTab({ merchantId, currency }: { merchantId: string; currency: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders?merchantId=${merchantId}&limit=20`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.nodes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [merchantId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h2 className="font-bold text-white">Recent Orders</h2>
        <p className="text-white/30 text-sm">Live from your Shopify store</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["Order", "Date", "Customer", "Status", "Total"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-white">{order.name}</td>
                <td className="px-6 py-4 text-sm text-white/40">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm text-white/60">{order.customer?.displayName || "Guest"}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.displayFinancialStatus === "PAID" ? "bg-green-500/20 text-green-400" :
                    order.displayFinancialStatus === "PENDING" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {order.displayFinancialStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-white">
                  {currency} {parseFloat(order.totalPriceSet?.shopMoney?.amount || "0").toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-12 text-white/30">No orders found</div>
        )}
      </div>
    </div>
  );
}

function ProductsTab({ merchantId, currency }: { merchantId: string; currency: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products?merchantId=${merchantId}&limit=20`)
      .then((r) => r.json())
      .then((d) => { setProducts(d.nodes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [merchantId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h2 className="font-bold text-white">Products</h2>
        <p className="text-white/30 text-sm">Live inventory from your Shopify store</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["Product", "Status", "Inventory", "Price Range"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {p.featuredImage?.url && (
                      <img src={p.featuredImage.url} alt={p.title} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <span className="text-sm font-medium text-white">{p.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    p.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-white/60">
                  <span className={p.totalInventory < 5 ? "text-red-400 font-bold" : ""}>
                    {p.totalInventory}
                  </span>
                  {p.totalInventory < 5 && <span className="text-red-400 text-xs ml-1">⚠ Low</span>}
                </td>
                <td className="px-6 py-4 text-sm text-white/60">
                  ${parseFloat(p.priceRangeV2?.minVariantPrice?.amount || "0").toFixed(2)}
                  {p.priceRangeV2?.maxVariantPrice?.amount !== p.priceRangeV2?.minVariantPrice?.amount &&
                    ` – $${parseFloat(p.priceRangeV2?.maxVariantPrice?.amount || "0").toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-12 text-white/30">No products found</div>
        )}
      </div>
    </div>
  );
}

function CustomersTab({ merchantId }: { merchantId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers?merchantId=${merchantId}&limit=20`)
      .then((r) => r.json())
      .then((d) => { setCustomers(d.nodes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [merchantId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h2 className="font-bold text-white">Customers</h2>
        <p className="text-white/30 text-sm">Real customer data from your Shopify store</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["Customer", "Email", "Orders", "Total Spent", "Since"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-white">{c.displayName}</td>
                <td className="px-6 py-4 text-sm text-white/40">{c.email}</td>
                <td className="px-6 py-4 text-sm text-white/60">{c.ordersCount}</td>
                <td className="px-6 py-4 text-sm font-bold text-green-400">
                  ${parseFloat(c.totalSpentV2?.amount || "0").toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-white/30">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="text-center py-12 text-white/30">No customers found</div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ session }: { session: { merchantId: string; shopName: string; shopDomain: string; email: string; plan: string; currency: string } }) {
  const [config, setConfig] = useState({
    autoCartRecovery: true,
    checkoutOptimization: true,
    dynamicPricing: false,
    upsellEnabled: true,
    crossSellEnabled: true,
    abandonedCartEmails: true,
    ucpEnabled: true,
    conversionGoal: 104,
  });
  const [saved, setSaved] = useState(false);

  async function saveSettings() {
    await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId: session.merchantId, agentConfig: config }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Store Info */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold text-white mb-4">Store Information</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Store Name", value: session.shopName },
            { label: "Domain", value: session.shopDomain },
            { label: "Email", value: session.email },
            { label: "Plan", value: session.plan },
            { label: "Currency", value: session.currency },
            { label: "Merchant ID", value: session.merchantId },
          ].map((item) => (
            <div key={item.label} className="glass rounded-xl p-4">
              <div className="text-white/40 text-xs mb-1">{item.label}</div>
              <div className="text-white text-sm font-medium truncate">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Config */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold text-white mb-4">Agent Configuration</h2>
        <div className="space-y-4">
          {[
            { key: "autoCartRecovery", label: "Auto Cart Recovery", desc: "Automatically recover abandoned carts with timed sequences" },
            { key: "checkoutOptimization", label: "Checkout Optimization", desc: "Reduce friction and enable one-click checkout flows" },
            { key: "upsellEnabled", label: "Upsell Engine", desc: "Deploy pre-checkout upsells for top products" },
            { key: "crossSellEnabled", label: "Cross-Sell Engine", desc: "Frequently-bought-together recommendations" },
            { key: "abandonedCartEmails", label: "Abandoned Cart Emails", desc: "Trigger Shopify Flow automation for abandoned checkouts" },
            { key: "dynamicPricing", label: "Dynamic Pricing", desc: "AI-powered price optimization based on demand signals" },
            { key: "ucpEnabled", label: "UCP Global Sales", desc: "Connect to Universal Commerce Protocol for cross-merchant discovery" },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <div className="text-white text-sm font-medium">{setting.label}</div>
                <div className="text-white/30 text-xs">{setting.desc}</div>
              </div>
              <button
                onClick={() => setConfig((c) => ({ ...c, [setting.key]: !c[setting.key as keyof typeof c] }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config[setting.key as keyof typeof config] ? "bg-green-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    config[setting.key as keyof typeof config] ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={saveSettings}
            className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black transition-all"
          >
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* API Info */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold text-white mb-4">API Endpoints</h2>
        <div className="space-y-2 font-mono text-xs">
          {[
            { method: "GET", path: `/api/analytics?merchantId=${session.merchantId}`, desc: "Real-time analytics" },
            { method: "GET", path: `/api/agent?merchantId=${session.merchantId}`, desc: "Run conversion agent" },
            { method: "GET", path: `/api/orders?merchantId=${session.merchantId}`, desc: "Live orders" },
            { method: "GET", path: `/api/products?merchantId=${session.merchantId}`, desc: "Product catalog" },
            { method: "POST", path: "/api/cart", desc: "Create/update cart" },
            { method: "POST", path: "/api/ucp", desc: "UCP global sales" },
          ].map((ep) => (
            <div key={ep.path} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${ep.method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>
                {ep.method}
              </span>
              <span className="text-white/60 flex-1 truncate">{ep.path}</span>
              <span className="text-white/30">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin"></div>
    </div>
  );
}

const tabIcons: Record<Tab, string> = {
  overview: "📊",
  agent: "🤖",
  orders: "📦",
  products: "🛍️",
  customers: "👥",
  settings: "⚙️",
};

type Order = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: { displayName: string } | null;
};

type Product = {
  id: string;
  title: string;
  status: string;
  totalInventory: number;
  priceRangeV2: { minVariantPrice: { amount: string }; maxVariantPrice: { amount: string } };
  featuredImage: { url: string } | null;
};

type Customer = {
  id: string;
  displayName: string;
  email: string;
  ordersCount: number;
  totalSpentV2: { amount: string; currencyCode: string };
  createdAt: string;
};
