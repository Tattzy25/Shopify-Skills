import { NextRequest, NextResponse } from "next/server";

// GET /api/bubble/embed?merchantId=xxx&shop=xxx.myshopify.com
// Returns the embeddable JavaScript snippet for Shopify stores
export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchantId") || "demo";
  const shop = req.nextUrl.searchParams.get("shop") || "musarty.com";
  const model = req.nextUrl.searchParams.get("model") || "gpt-4o";
  const position = req.nextUrl.searchParams.get("position") || "bottom-right";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musarty.com";

  // Generate the embeddable script
  const script = `
(function() {
  'use strict';
  
  // Musarty Floating Bubble — MCP/UCP AI for Shopify
  // Version: 1.0.0 | Protocol: MCP + UCP
  
  var MUSARTY_CONFIG = {
    merchantId: '${merchantId}',
    shop: '${shop}',
    model: '${model}',
    position: '${position}',
    baseUrl: '${baseUrl}',
    gold: '#C9A84C',
    goldLight: '#F5D78E',
    goldDark: '#8B6914',
    black: '#0a0a0a',
  };

  // Prevent double-init
  if (window.__musartyBubble) return;
  window.__musartyBubble = true;

  var messages = [];
  var isOpen = false;
  var isLoading = false;
  var selectedModel = MUSARTY_CONFIG.model;

  // ── Inject styles ──
  var style = document.createElement('style');
  style.textContent = \`
    #musarty-bubble-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #musarty-bubble-root { position: fixed; z-index: 2147483647; ${position === "bottom-right" ? "bottom: 24px; right: 24px;" : "bottom: 24px; left: 24px;"} display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
    #musarty-panel { width: 360px; height: 520px; background: linear-gradient(145deg, #111114 0%, #0d0d10 100%); border: 1px solid rgba(201,168,76,0.25); border-radius: 20px; box-shadow: 0 0 0 1px rgba(201,168,76,0.08), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.06); display: flex; flex-direction: column; overflow: hidden; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
    #musarty-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(90deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%); border-bottom: 1px solid rgba(201,168,76,0.15); flex-shrink: 0; }
    #musarty-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    #musarty-messages::-webkit-scrollbar { width: 4px; } #musarty-messages::-webkit-scrollbar-track { background: transparent; } #musarty-messages::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
    #musarty-input-area { padding: 12px; border-top: 1px solid rgba(201,168,76,0.1); flex-shrink: 0; }
    #musarty-input-wrap { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; background: #18181c; border: 1px solid rgba(201,168,76,0.15); }
    #musarty-input { flex: 1; background: transparent; border: none; outline: none; color: white; font-size: 13px; }
    #musarty-input::placeholder { color: rgba(255,255,255,0.2); }
    #musarty-send { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s; flex-shrink: 0; }
    .musarty-msg { display: flex; max-width: 85%; }
    .musarty-msg.user { align-self: flex-end; }
    .musarty-msg.assistant { align-self: flex-start; }
    .musarty-bubble-msg { padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.5; }
    .musarty-msg.user .musarty-bubble-msg { background: linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.12)); border: 1px solid rgba(201,168,76,0.25); color: rgba(255,255,255,0.9); border-bottom-right-radius: 4px; }
    .musarty-msg.assistant .musarty-bubble-msg { background: #18181c; border: 1px solid rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); border-bottom-left-radius: 4px; }
    .musarty-avatar { width: 24px; height: 24px; border-radius: 8px; background: linear-gradient(135deg, #8B6914, #C9A84C); color: #0a0a0a; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0; margin-top: 2px; }
    #musarty-btn { width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; background: linear-gradient(135deg, #8B6914 0%, #C9A84C 45%, #F5D78E 70%, #C9A84C 100%); box-shadow: 0 0 0 2px rgba(201,168,76,0.2), 0 0 24px rgba(201,168,76,0.35), 0 8px 24px rgba(0,0,0,0.5); position: relative; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
    #musarty-btn:hover { transform: scale(1.05); box-shadow: 0 0 0 3px rgba(201,168,76,0.3), 0 0 40px rgba(201,168,76,0.5), 0 8px 32px rgba(0,0,0,0.6); }
    #musarty-btn-label { color: #0a0a0a; font-size: 20px; font-weight: 900; position: relative; z-index: 1; }
    #musarty-notif { position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; background: #ef4444; color: white; font-size: 8px; font-weight: 900; display: flex; align-items: center; justify-content: center; border: 2px solid #0a0a0a; }
    .musarty-typing span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #C9A84C; margin: 0 2px; animation: musartyBounce 0.8s infinite; }
    .musarty-typing span:nth-child(2) { animation-delay: 0.15s; }
    .musarty-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes musartyBounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
    #musarty-footer { text-align: center; font-size: 10px; color: rgba(255,255,255,0.2); margin-top: 6px; }
    #musarty-close { background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.4); width: 28px; height: 28px; border-radius: 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
    #musarty-close:hover { color: #ef4444; }
  \`;
  document.head.appendChild(style);

  // ── Build DOM ──
  var root = document.createElement('div');
  root.id = 'musarty-bubble-root';

  // Panel
  var panel = document.createElement('div');
  panel.id = 'musarty-panel';
  panel.style.display = 'none';

  // Header
  var header = document.createElement('div');
  header.id = 'musarty-header';
  header.innerHTML = \`
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#8B6914,#C9A84C,#F5D78E);display:flex;align-items:center;justify-content:center;color:#0a0a0a;font-weight:900;font-size:13px;box-shadow:0 0 12px rgba(201,168,76,0.4);">M</div>
      <div>
        <div style="color:white;font-weight:700;font-size:14px;line-height:1;">Musarty AI</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
          <span style="width:6px;height:6px;border-radius:50%;background:#C9A84C;display:inline-block;animation:musartyBounce 2s infinite;"></span>
          <span style="color:#C9A84C;font-size:10px;opacity:0.8;">MCP · UCP · GPT-4o</span>
        </div>
      </div>
    </div>
    <button id="musarty-close">✕</button>
  \`;
  panel.appendChild(header);

  // Messages
  var msgArea = document.createElement('div');
  msgArea.id = 'musarty-messages';
  panel.appendChild(msgArea);

  // Input
  var inputArea = document.createElement('div');
  inputArea.id = 'musarty-input-area';
  inputArea.innerHTML = \`
    <div id="musarty-input-wrap">
      <input id="musarty-input" placeholder="Ask Musarty anything..." />
      <button id="musarty-send" style="background:linear-gradient(135deg,#8B6914,#C9A84C);color:#0a0a0a;">➤</button>
    </div>
    <div id="musarty-footer">Powered by MCP · UCP · Musarty AI</div>
  \`;
  panel.appendChild(inputArea);

  // Button
  var btn = document.createElement('button');
  btn.id = 'musarty-btn';
  btn.innerHTML = \`
    <span id="musarty-btn-label">M</span>
    <span id="musarty-notif">AI</span>
  \`;

  root.appendChild(panel);
  root.appendChild(btn);
  document.body.appendChild(root);

  // ── Logic ──
  function addMessage(role, content) {
    var msg = document.createElement('div');
    msg.className = 'musarty-msg ' + role;
    if (role === 'assistant') {
      msg.innerHTML = '<div class="musarty-avatar">M</div><div class="musarty-bubble-msg">' + content + '</div>';
    } else {
      msg.innerHTML = '<div class="musarty-bubble-msg">' + content + '</div>';
    }
    msgArea.appendChild(msg);
    msgArea.scrollTop = msgArea.scrollHeight;
    return msg;
  }

  function showTyping() {
    var msg = document.createElement('div');
    msg.className = 'musarty-msg assistant';
    msg.id = 'musarty-typing';
    msg.innerHTML = '<div class="musarty-avatar">M</div><div class="musarty-bubble-msg"><div class="musarty-typing"><span></span><span></span><span></span></div></div>';
    msgArea.appendChild(msg);
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function removeTyping() {
    var t = document.getElementById('musarty-typing');
    if (t) t.remove();
  }

  async function sendMessage(text) {
    if (!text || isLoading) return;
    isLoading = true;
    addMessage('user', text);
    showTyping();

    var history = messages.slice(-8).map(function(m) { return { role: m.role, content: m.content }; });
    messages.push({ role: 'user', content: text });

    try {
      var res = await fetch(MUSARTY_CONFIG.baseUrl + '/api/bubble/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: MUSARTY_CONFIG.merchantId,
          message: text,
          model: selectedModel,
          history: history,
          context: { shopName: MUSARTY_CONFIG.shop, shopDomain: MUSARTY_CONFIG.shop }
        })
      });
      var data = await res.json();
      removeTyping();
      var reply = data.reply || 'Something went wrong. Please try again.';
      addMessage('assistant', reply);
      messages.push({ role: 'assistant', content: reply });
    } catch(e) {
      removeTyping();
      addMessage('assistant', 'Connection error. Please try again.');
    }
    isLoading = false;
  }

  function openBubble() {
    isOpen = true;
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    document.getElementById('musarty-btn-label').textContent = '✕';
    document.getElementById('musarty-notif').style.display = 'none';
    if (messages.length === 0) {
      addMessage('assistant', 'Welcome! I\\'m Musarty, your AI shopping concierge. Powered by MCP & UCP. How can I help you today?');
      messages.push({ role: 'assistant', content: 'Welcome! I\\'m Musarty, your AI shopping concierge.' });
    }
    setTimeout(function() { document.getElementById('musarty-input').focus(); }, 100);
  }

  function closeBubble() {
    isOpen = false;
    panel.style.display = 'none';
    document.getElementById('musarty-btn-label').textContent = 'M';
    document.getElementById('musarty-notif').style.display = 'flex';
  }

  // Events
  btn.addEventListener('click', function() { isOpen ? closeBubble() : openBubble(); });
  document.getElementById('musarty-close').addEventListener('click', closeBubble);
  document.getElementById('musarty-send').addEventListener('click', function() {
    var input = document.getElementById('musarty-input');
    var val = input.value.trim();
    if (val) { input.value = ''; sendMessage(val); }
  });
  document.getElementById('musarty-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var val = this.value.trim();
      if (val) { this.value = ''; sendMessage(val); }
    }
  });

})();
`.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
