"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AIModel = {
  id: string;
  name: string;
  provider: "openai" | "google" | "anthropic";
  label: string;
  color: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  timestamp: number;
  isTyping?: boolean;
};

type MCPContext = {
  merchant?: {
    name: string;
    domain: string;
    currency: string;
  };
  analytics?: {
    revenue: number;
    conversionRate: number;
    avgOrderValue: number;
  };
  capabilities?: string[];
};

type BubbleProps = {
  merchantId?: string;
  shopName?: string;
  shopDomain?: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#F5D78E";
const GOLD_DARK = "#8B6914";
const BLACK = "#0a0a0a";
const BLACK_CARD = "#111114";
const BLACK_SURFACE = "#18181c";

const AI_MODELS: AIModel[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", label: "OpenAI", color: "#10a37f" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", label: "OpenAI", color: "#10a37f" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", label: "Google", color: "#4285f4" },
  { id: "gemini-1.5-flash", name: "Gemini Flash", provider: "google", label: "Google", color: "#4285f4" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", label: "Anthropic", color: "#d97706" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic", label: "Anthropic", color: "#d97706" },
];

const QUICK_ACTIONS = [
  { label: "Find products", icon: "◈", prompt: "What products do you have available?" },
  { label: "Track my order", icon: "◎", prompt: "I want to track my recent order" },
  { label: "Best deals", icon: "◆", prompt: "What are your best deals right now?" },
  { label: "Cart help", icon: "◉", prompt: "Help me with my cart" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FloatingBubble({
  merchantId = "demo",
  shopName = "Musarty Store",
  shopDomain = "musarty.com",
  position = "bottom-right",
}: BubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "mcp" | "ucp" | "models">("chat");
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mcpContext, setMcpContext] = useState<MCPContext | null>(null);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [ucpQuery, setUcpQuery] = useState("");
  const [ucpResults, setUcpResults] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pulse animation counter for bubble
  useEffect(() => {
    const interval = setInterval(() => setPulseCount((c) => c + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, activeTab]);

  // Load MCP context
  const loadMCPContext = useCallback(async () => {
    setMcpLoading(true);
    try {
      const res = await fetch(`/api/bubble/mcp?merchantId=${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setMcpContext(data);
      }
    } catch {
      // non-fatal
    } finally {
      setMcpLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    if (isOpen && activeTab === "mcp" && !mcpContext) {
      loadMCPContext();
    }
  }, [isOpen, activeTab, mcpContext, loadMCPContext]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Welcome to **${shopName}**! ✦\n\nI'm Musarty, your AI shopping concierge. I'm powered by ${selectedModel.name} and connected to the MCP & UCP networks.\n\nHow can I help you today?`,
          model: selectedModel.id,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [isOpen, messages.length, shopName, selectedModel]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = text || input.trim();
      if (!content || isLoading) return;

      setInput("");
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const typingMsg: Message = {
        id: `typing-${Date.now()}`,
        role: "assistant",
        content: "",
        isTyping: true,
        model: selectedModel.id,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, typingMsg]);
      setIsLoading(true);

      try {
        const history = messages
          .filter((m) => !m.isTyping)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/bubble/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId,
            message: content,
            model: selectedModel.id,
            history,
            context: {
              shopName,
              shopDomain,
              analytics: mcpContext?.analytics,
            },
          }),
        });

        const data = await res.json();
        const reply = data.reply || data.error || "Something went wrong.";

        setMessages((prev) =>
          prev.map((m) =>
            m.isTyping
              ? { ...m, content: reply, isTyping: false, model: selectedModel.id }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.isTyping
              ? {
                  ...m,
                  content: "Connection error. Please try again.",
                  isTyping: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, merchantId, selectedModel, shopName, shopDomain, mcpContext]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const runUCPSearch = async () => {
    if (!ucpQuery.trim()) return;
    setUcpResults("Searching UCP global catalog...");
    try {
      const res = await fetch("/api/bubble/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          tool: "ucp_discover",
          params: { query: ucpQuery, business: shopDomain },
        }),
      });
      const data = await res.json();
      setUcpResults(JSON.stringify(data.result, null, 2));
    } catch {
      setUcpResults("UCP search failed. Check network connection.");
    }
  };

  const positionClass = position === "bottom-right" ? "right-6" : "left-6";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`fixed bottom-6 ${positionClass} z-[9999] flex flex-col items-end gap-3`}>
      {/* ── Floating Panel ── */}
      {isOpen && (
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: isExpanded ? "480px" : "380px",
            height: isExpanded ? "680px" : "560px",
            background: `linear-gradient(145deg, ${BLACK_CARD} 0%, #0d0d10 100%)`,
            border: `1px solid rgba(201,168,76,0.25)`,
            borderRadius: "20px",
            boxShadow: `0 0 0 1px rgba(201,168,76,0.08), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.06)`,
            transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background: `linear-gradient(90deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)`,
              borderBottom: `1px solid rgba(201,168,76,0.15)`,
            }}
          >
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 50%, ${GOLD_LIGHT} 100%)`,
                  color: BLACK,
                  boxShadow: `0 0 12px rgba(201,168,76,0.4)`,
                }}
              >
                M
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-none">Musarty</div>
                <div className="text-xs mt-0.5 flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: GOLD }}
                  />
                  <span style={{ color: GOLD, opacity: 0.8 }}>{selectedModel.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Model picker toggle */}
              <button
                onClick={() => setShowModelPicker((v) => !v)}
                className="px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{
                  background: "rgba(201,168,76,0.1)",
                  border: "1px solid rgba(201,168,76,0.2)",
                  color: GOLD,
                }}
                title="Switch AI model"
              >
                ⚡ Model
              </button>
              {/* Expand */}
              <button
                onClick={() => setIsExpanded((v) => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? "⊟" : "⊞"}
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Model Picker Dropdown ── */}
          {showModelPicker && (
            <div
              className="flex-shrink-0 p-3"
              style={{
                background: BLACK_SURFACE,
                borderBottom: `1px solid rgba(201,168,76,0.1)`,
              }}
            >
              <div className="text-xs text-white/40 mb-2 px-1">Select AI Model</div>
              <div className="grid grid-cols-2 gap-1.5">
                {AI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m);
                      setShowModelPicker(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                    style={{
                      background:
                        selectedModel.id === m.id
                          ? "rgba(201,168,76,0.12)"
                          : "rgba(255,255,255,0.03)",
                      border:
                        selectedModel.id === m.id
                          ? "1px solid rgba(201,168,76,0.3)"
                          : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: m.color }}
                    />
                    <div>
                      <div className="text-white text-xs font-medium leading-none">{m.name}</div>
                      <div className="text-white/30 text-[10px] mt-0.5">{m.label}</div>
                    </div>
                    {selectedModel.id === m.id && (
                      <span className="ml-auto text-[10px]" style={{ color: GOLD }}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab Bar ── */}
          <div
            className="flex flex-shrink-0"
            style={{ borderBottom: `1px solid rgba(201,168,76,0.1)` }}
          >
            {(["chat", "mcp", "ucp", "models"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                style={{
                  color: activeTab === tab ? GOLD : "rgba(255,255,255,0.3)",
                  borderBottom:
                    activeTab === tab ? `2px solid ${GOLD}` : "2px solid transparent",
                  background:
                    activeTab === tab ? "rgba(201,168,76,0.05)" : "transparent",
                }}
              >
                {tab === "chat" && "◈ Chat"}
                {tab === "mcp" && "⬡ MCP"}
                {tab === "ucp" && "◎ UCP"}
                {tab === "models" && "⚡ AI"}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* CHAT TAB */}
            {activeTab === "chat" && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black mr-2 flex-shrink-0 mt-0.5"
                          style={{
                            background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
                            color: BLACK,
                          }}
                        >
                          M
                        </div>
                      )}
                      <div
                        className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={
                          msg.role === "user"
                            ? {
                                background: `linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.12))`,
                                border: `1px solid rgba(201,168,76,0.25)`,
                                color: "rgba(255,255,255,0.9)",
                                borderBottomRightRadius: "6px",
                              }
                            : {
                                background: BLACK_SURFACE,
                                border: "1px solid rgba(255,255,255,0.07)",
                                color: "rgba(255,255,255,0.8)",
                                borderBottomLeftRadius: "6px",
                              }
                        }
                      >
                        {msg.isTyping ? (
                          <TypingIndicator />
                        ) : (
                          <MessageContent content={msg.content} />
                        )}
                        {msg.model && !msg.isTyping && (
                          <div
                            className="text-[10px] mt-1.5 opacity-40"
                            style={{ color: msg.role === "user" ? GOLD : "white" }}
                          >
                            {AI_MODELS.find((m) => m.id === msg.model)?.name || msg.model}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 1 && (
                  <div className="px-4 pb-2 flex gap-2 flex-wrap">
                    {QUICK_ACTIONS.map((qa) => (
                      <button
                        key={qa.label}
                        onClick={() => sendMessage(qa.prompt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                        style={{
                          background: "rgba(201,168,76,0.08)",
                          border: "1px solid rgba(201,168,76,0.15)",
                          color: GOLD,
                        }}
                      >
                        <span>{qa.icon}</span>
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div
                  className="p-3 flex-shrink-0"
                  style={{ borderTop: `1px solid rgba(201,168,76,0.1)` }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{
                      background: BLACK_SURFACE,
                      border: `1px solid rgba(201,168,76,0.15)`,
                    }}
                  >
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask Musarty anything..."
                      disabled={isLoading}
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={isLoading || !input.trim()}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                      style={{
                        background:
                          input.trim() && !isLoading
                            ? `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`
                            : "rgba(255,255,255,0.05)",
                        color: input.trim() && !isLoading ? BLACK : "rgba(255,255,255,0.2)",
                      }}
                    >
                      ➤
                    </button>
                  </div>
                  <div className="text-center text-[10px] text-white/20 mt-2">
                    Powered by MCP · UCP · {selectedModel.label}
                  </div>
                </div>
              </>
            )}

            {/* MCP TAB */}
            {activeTab === "mcp" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-sm">Model Context Protocol</h3>
                    <p className="text-white/30 text-xs mt-0.5">Live store context for AI models</p>
                  </div>
                  <button
                    onClick={loadMCPContext}
                    disabled={mcpLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: "rgba(201,168,76,0.1)",
                      border: "1px solid rgba(201,168,76,0.2)",
                      color: GOLD,
                    }}
                  >
                    {mcpLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {/* MCP Status */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(201,168,76,0.06)",
                    border: "1px solid rgba(201,168,76,0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: GOLD }}
                    />
                    <span className="text-xs font-semibold" style={{ color: GOLD }}>
                      MCP CONNECTED
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <MCPRow label="Protocol" value="MCP v1.0" />
                    <MCPRow label="Store" value={shopName} />
                    <MCPRow label="Domain" value={shopDomain} />
                    <MCPRow label="Merchant ID" value={merchantId} />
                  </div>
                </div>

                {/* Analytics Context */}
                {mcpContext?.analytics && (
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: BLACK_SURFACE,
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                      Live Analytics Context
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MCPStat
                        label="Revenue"
                        value={`$${mcpContext.analytics.revenue?.toLocaleString() || "—"}`}
                      />
                      <MCPStat
                        label="Conversion"
                        value={`${mcpContext.analytics.conversionRate?.toFixed(1) || "—"}%`}
                      />
                      <MCPStat
                        label="Avg Order"
                        value={`$${mcpContext.analytics.avgOrderValue?.toFixed(0) || "—"}`}
                      />
                    </div>
                  </div>
                )}

                {/* Capabilities */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: BLACK_SURFACE,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    MCP Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      mcpContext?.capabilities || [
                        "cart_recovery",
                        "product_search",
                        "checkout_optimization",
                        "upsell",
                        "ucp_discovery",
                      ]
                    ).map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium"
                        style={{
                          background: "rgba(201,168,76,0.08)",
                          border: "1px solid rgba(201,168,76,0.15)",
                          color: GOLD,
                        }}
                      >
                        {cap.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* MCP Tool Tester */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: BLACK_SURFACE,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    MCP Tool Calls
                  </div>
                  <div className="space-y-2">
                    {["get_analytics", "get_events", "ucp_discover"].map((tool) => (
                      <button
                        key={tool}
                        onClick={async () => {
                          const res = await fetch("/api/bubble/mcp", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ merchantId, tool, params: {} }),
                          });
                          const data = await res.json();
                          alert(JSON.stringify(data, null, 2));
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        <span className="font-mono">{tool}()</span>
                        <span style={{ color: GOLD }}>▶ Run</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* UCP TAB */}
            {activeTab === "ucp" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="text-white font-bold text-sm">Universal Commerce Protocol</h3>
                  <p className="text-white/30 text-xs mt-0.5">
                    Cross-merchant product discovery & checkout
                  </p>
                </div>

                {/* UCP Status */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(201,168,76,0.06)",
                    border: "1px solid rgba(201,168,76,0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: GOLD }}
                    />
                    <span className="text-xs font-semibold" style={{ color: GOLD }}>
                      UCP NETWORK ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-white/40">
                    Connected to Universal Commerce Protocol v1.9.1
                    <br />
                    Merchant: {shopDomain}
                  </div>
                </div>

                {/* UCP Search */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: BLACK_SURFACE,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    Global Catalog Search
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
                    style={{
                      background: BLACK_CARD,
                      border: `1px solid rgba(201,168,76,0.15)`,
                    }}
                  >
                    <input
                      value={ucpQuery}
                      onChange={(e) => setUcpQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runUCPSearch()}
                      placeholder="Search UCP global catalog..."
                      className="flex-1 bg-transparent text-white text-xs outline-none placeholder-white/20"
                    />
                    <button
                      onClick={runUCPSearch}
                      className="px-2 py-1 rounded-lg text-xs font-medium"
                      style={{
                        background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
                        color: BLACK,
                      }}
                    >
                      Search
                    </button>
                  </div>
                  {ucpResults && (
                    <pre
                      className="text-[10px] rounded-lg p-3 overflow-auto max-h-40"
                      style={{
                        background: BLACK_CARD,
                        color: GOLD,
                        border: "1px solid rgba(201,168,76,0.1)",
                      }}
                    >
                      {ucpResults}
                    </pre>
                  )}
                </div>

                {/* UCP Commands */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: BLACK_SURFACE,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    UCP CLI Commands
                  </div>
                  <div className="space-y-2 font-mono text-[10px]">
                    {[
                      { cmd: `ucp discover --business ${shopDomain}`, desc: "Discover capabilities" },
                      { cmd: "ucp catalog search --input '{...}'", desc: "Global search" },
                      { cmd: "ucp profile init --name agent", desc: "Init profile" },
                      { cmd: "ucp checkout create --business ...", desc: "Start checkout" },
                    ].map((c) => (
                      <div
                        key={c.cmd}
                        className="flex items-start gap-2 p-2 rounded-lg"
                        style={{
                          background: BLACK_CARD,
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <span style={{ color: GOLD }}>$</span>
                        <div>
                          <div className="text-white/70">{c.cmd}</div>
                          <div className="text-white/30 mt-0.5">{c.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Musarty UCP Endpoints */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: BLACK_SURFACE,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    Musarty UCP Endpoints
                  </div>
                  <div className="space-y-1.5 text-[10px] font-mono">
                    {[
                      "https://musarty.com/api/callback",
                      "https://u7qrsp-e4.myshopify.com/api/callback",
                    ].map((url) => (
                      <div
                        key={url}
                        className="px-2 py-1.5 rounded-lg"
                        style={{
                          background: "rgba(201,168,76,0.06)",
                          border: "1px solid rgba(201,168,76,0.12)",
                          color: GOLD,
                        }}
                      >
                        {url}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODELS TAB */}
            {activeTab === "models" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="text-white font-bold text-sm">AI Model Hub</h3>
                  <p className="text-white/30 text-xs mt-0.5">
                    ChatGPT · Gemini · Claude — all connected
                  </p>
                </div>

                {/* Provider cards */}
                {[
                  {
                    provider: "OpenAI",
                    color: "#10a37f",
                    models: AI_MODELS.filter((m) => m.provider === "openai"),
                    desc: "GPT-4o family — best for reasoning & conversation",
                    icon: "◈",
                  },
                  {
                    provider: "Google",
                    color: "#4285f4",
                    models: AI_MODELS.filter((m) => m.provider === "google"),
                    desc: "Gemini — best for multimodal & speed",
                    icon: "◎",
                  },
                  {
                    provider: "Anthropic",
                    color: "#d97706",
                    models: AI_MODELS.filter((m) => m.provider === "anthropic"),
                    desc: "Claude — best for nuanced, safe responses",
                    icon: "◆",
                  },
                ].map((group) => (
                  <div
                    key={group.provider}
                    className="rounded-xl p-4"
                    style={{
                      background: BLACK_SURFACE,
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ color: group.color }}>{group.icon}</span>
                      <div>
                        <div className="text-white text-sm font-bold">{group.provider}</div>
                        <div className="text-white/30 text-[10px]">{group.desc}</div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {group.models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m);
                            setActiveTab("chat");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all"
                          style={{
                            background:
                              selectedModel.id === m.id
                                ? "rgba(201,168,76,0.1)"
                                : "rgba(255,255,255,0.03)",
                            border:
                              selectedModel.id === m.id
                                ? "1px solid rgba(201,168,76,0.25)"
                                : "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: m.color }}
                            />
                            <span className="text-white text-xs font-medium">{m.name}</span>
                          </div>
                          {selectedModel.id === m.id ? (
                            <span className="text-[10px] font-bold" style={{ color: GOLD }}>
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/30">Select →</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* MCP App Compatible badge */}
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "rgba(201,168,76,0.06)",
                    border: "1px solid rgba(201,168,76,0.2)",
                  }}
                >
                  <div className="text-xs font-bold mb-1" style={{ color: GOLD }}>
                    ⬡ MCP APP COMPATIBLE
                  </div>
                  <div className="text-white/40 text-[10px]">
                    Model Context Protocol Official
                    <br />
                    All models receive live store context via MCP
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating Bubble Button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center justify-center transition-all duration-300"
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 45%, ${GOLD_LIGHT} 70%, ${GOLD} 100%)`,
          boxShadow: isOpen
            ? `0 0 0 3px rgba(201,168,76,0.3), 0 0 40px rgba(201,168,76,0.5), 0 8px 32px rgba(0,0,0,0.6)`
            : `0 0 0 2px rgba(201,168,76,0.2), 0 0 24px rgba(201,168,76,0.35), 0 8px 24px rgba(0,0,0,0.5)`,
          transform: isOpen ? "scale(0.95)" : "scale(1)",
        }}
        title="Open Musarty AI"
      >
        {/* Pulse ring */}
        {!isOpen && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: "rgba(201,168,76,0.2)",
              animationDuration: "2s",
            }}
          />
        )}

        {/* Inner chrome ring */}
        <span
          className="absolute inset-1 rounded-full"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)`,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        />

        {/* Icon */}
        <span
          className="relative z-10 font-black text-xl select-none"
          style={{ color: BLACK, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
        >
          {isOpen ? "✕" : "M"}
        </span>

        {/* Notification dot */}
        {!isOpen && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
            style={{
              background: "#ef4444",
              color: "white",
              border: "2px solid #0a0a0a",
            }}
          >
            AI
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: GOLD,
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.8s",
          }}
        />
      ))}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering for bold
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function MCPRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="text-white/70 font-mono text-[10px]">{value}</span>
    </div>
  );
}

function MCPStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-2.5 text-center"
      style={{
        background: "rgba(201,168,76,0.06)",
        border: "1px solid rgba(201,168,76,0.12)",
      }}
    >
      <div className="text-sm font-black" style={{ color: GOLD }}>
        {value}
      </div>
      <div className="text-[10px] text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
