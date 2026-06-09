"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMerchantStore } from "@/store/merchantStore";

type Step = "connect" | "validating" | "success";

export default function OnboardPage() {
  const router = useRouter();
  const { setSession } = useMerchantStore();
  const [step, setStep] = useState<Step>("connect");
  const [error, setError] = useState("");
  const [shopData, setShopData] = useState<{
    name: string; domain: string; email: string; plan: string; currency: string;
  } | null>(null);

  const [form, setForm] = useState({
    shopDomain: "",
    accessToken: "",
    storefrontToken: "",
  });

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("validating");

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Connection failed");
        setStep("connect");
        return;
      }

      setShopData(data.shop);
      setSession({
        merchantId: data.merchantId,
        sessionToken: data.sessionToken,
        shopName: data.shop.name,
        shopDomain: data.shop.domain,
        email: data.shop.email,
        plan: data.shop.plan,
        currency: data.shop.currency,
        agentEnabled: true,
      });
      setStep("success");
    } catch (err) {
      setError("Network error. Please try again.");
      setStep("connect");
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-6 py-12">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 text-white/40 hover:text-white text-sm transition-colors"
      >
        ← Back
      </button>

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-black font-black">
            SA
          </div>
          <span className="font-bold text-white text-xl">ShopifyAgent</span>
        </div>

        {step === "connect" && (
          <div className="glass rounded-2xl p-8">
            <h1 className="text-2xl font-black text-white mb-2">Connect Your Store</h1>
            <p className="text-white/40 text-sm mb-8">
              You bring your API keys. We build the conversion engine. Your data stays yours.
            </p>

            <form onSubmit={handleConnect} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Shop Domain
                </label>
                <input
                  type="text"
                  placeholder="your-store.myshopify.com"
                  value={form.shopDomain}
                  onChange={(e) => setForm({ ...form, shopDomain: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Admin API Access Token
                </label>
                <input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                  value={form.accessToken}
                  onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                  required
                />
                <p className="text-white/30 text-xs mt-1">
                  Shopify Admin → Apps → Develop apps → Create app → Admin API access token
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Storefront API Token <span className="text-white/30">(optional — for cart/checkout)</span>
                </label>
                <input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                  value={form.storefrontToken}
                  onChange={(e) => setForm({ ...form, storefrontToken: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black text-lg transition-all glow-green"
              >
                Connect & Activate Agent →
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-white/30 text-xs text-center">
                🔒 Your API keys are encrypted and never shared. We use them only to read your store data and execute agent actions on your behalf.
              </p>
            </div>

            {/* Required scopes */}
            <div className="mt-4">
              <p className="text-white/30 text-xs font-medium mb-2">Required API Scopes:</p>
              <div className="flex flex-wrap gap-1">
                {[
                  "read_products", "write_products", "read_orders", "write_orders",
                  "read_customers", "read_inventory", "read_analytics", "read_checkouts",
                ].map((scope) => (
                  <span key={scope} className="px-2 py-0.5 rounded bg-white/5 text-white/30 text-xs font-mono">
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "validating" && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2">Connecting to Shopify...</h2>
            <p className="text-white/40 text-sm">Validating credentials and reading store data</p>
          </div>
        )}

        {step === "success" && shopData && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Store Connected!</h2>
            <p className="text-white/40 text-sm mb-6">The agent is now analyzing your store</p>

            <div className="glass rounded-xl p-4 mb-8 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Store</span>
                <span className="text-white font-medium">{shopData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Domain</span>
                <span className="text-white font-mono text-xs">{shopData.domain}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Plan</span>
                <span className="text-white">{shopData.plan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Currency</span>
                <span className="text-white">{shopData.currency}</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black text-lg transition-all glow-green"
            >
              Open Agent Dashboard →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
