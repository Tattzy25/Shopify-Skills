import { NextRequest, NextResponse } from "next/server";
import { getMerchant } from "@/lib/redis";

// POST /api/bubble/chat — multi-model AI chat endpoint for the floating bubble
// Supports: ChatGPT (OpenAI), Gemini (Google), Claude (Anthropic)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { merchantId, message, model = "gpt-4o", history = [], context } = body;

  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
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
  let merchant = null;
  if (merchantId) {
    try {
      merchant = await getMerchant(merchantId);
    } catch {
      // non-fatal
    }
  }

  if (merchant) {
    systemPrompt += `\n\nStore currency: ${merchant.currency}`;
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
