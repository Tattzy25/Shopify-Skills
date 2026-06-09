import { NextRequest, NextResponse } from "next/server";
import { getMerchant, redis } from "@/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";
import crypto from "crypto";

const ALLOWED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "o1-preview",
  "o1-mini",
  "o3-mini",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "claude-3-5-sonnet-20241022",
  "claude-3-haiku-20240307",
  "gpt-3.5-turbo",
  "gemini",
  "claude"
];

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

// POST /api/bubble/chat — multi-model AI chat endpoint for the floating bubble
// Supports: ChatGPT (OpenAI), Gemini (Google), Claude (Anthropic)
export async function POST(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { merchantId, message, model = "gpt-4o", history = [], context, signature, sessionToken } = body;

  if (!message || typeof message !== "string" || message.length > 2000) {
    return NextResponse.json({ error: "Invalid or too long message (max 2000 chars)" }, { status: 400 });
  }

  if (!Array.isArray(history) || history.length > 50) {
    return NextResponse.json({ error: "History too long (max 50 messages)" }, { status: 400 });
  }

  if (!ALLOWED_MODELS.includes(model)) {
    return NextResponse.json({ error: "Invalid model requested" }, { status: 400 });
  }

  if (!merchantId) {
    return NextResponse.json({ error: "merchantId required" }, { status: 400 });
  }

  let merchant = null;
  try {
    merchant = await getMerchant(merchantId);
  } catch (err) {
    console.error("Failed to fetch merchant:", err);
    return NextResponse.json({ error: "Failed to fetch merchant data" }, { status: 500 });
  }

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  let isAuthenticated = false;
  if (sessionToken) {
    const session = await redis.get(`session:${sessionToken}`);
    if (session && (session as any).merchantId === merchantId) {
      isAuthenticated = true;
    }
  } else if (signature && context?.shopDomain) {
    const secret = merchant.accessToken;
    const payload = `${merchantId}:${context.shopDomain}`;
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (signature === expectedSignature) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const identifier = `${merchantId}:${ip}`;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Build system prompt with merchant context
  let systemPrompt = `You are Musarty — an elite AI shopping assistant embedded in a Shopify merchant store. 
You help customers find products, answer questions, recover abandoned carts, and drive conversions.
You have access to the Universal Commerce Protocol (UCP) for cross-merchant discovery.
You are powered by the Model Context Protocol (MCP) for real-time store data.

Your personality: Confident, helpful, luxury-brand tone. You speak like a premium concierge.
Always be concise, actionable, and conversion-focused.`;

  if (context?.shopName) {
    systemPrompt += `\n\nYou are currently embedded in: ${context.shopName} (${context.shopDomain})`;
  }
  if (context?.products?.length) {
    systemPrompt += `\n\nFeatured products available:\n${context.products.map((p: { title: string; price: string }) => `- ${p.title}: ${p.price}`).join("\n")}`;
  }

  // Get merchant data for additional context
  let merchantContext = null;
  if (merchantId) {
    try {
      merchantContext = await getMerchant(merchantId);
    } catch (err) {
      console.error("Failed to fetch merchant context:", err);
    }
  }

  if (merchantContext) {
    systemPrompt += `\n\nStore currency: ${merchantContext.currency}`;
  }

  const messages = [
    ...history.map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  try {
    let reply = "";

    // Route to appropriate model
    if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3")) {
      reply = await callOpenAI(model, systemPrompt, messages);
    } else if (model.startsWith("gemini")) {
      reply = await callGemini(model, systemPrompt, messages);
    } else if (model.startsWith("claude")) {
      reply = await callClaude(model, systemPrompt, messages);
    } else {
      // Default to OpenAI
      reply = await callOpenAI("gpt-4o", systemPrompt, messages);
    }

    return NextResponse.json({
      reply,
      model,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Bubble chat error:", err);
    return NextResponse.json(
      { error: "AI model unavailable. Please try again.", details: String(err) },
      { status: 500 }
    );
  }
}

async function callOpenAI(
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || "No response";
}

async function callGemini(
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const geminiModel = model === "gemini" ? "gemini-1.5-pro" : model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  // Convert messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

async function callClaude(
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const claudeModel =
    model === "claude" ? "claude-3-5-sonnet-20241022" : model;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: claudeModel,
      system: systemPrompt,
      messages,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "No response";
}
