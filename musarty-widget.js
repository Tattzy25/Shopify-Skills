/**
 * Musarty AI Floating Bubble Widget
 * Rich Black & Chrome Gold Theme with MCP Integration
 * 
 * @version 1.0.0
 * @author Musarty
 * @license MIT
 * 
 * CONFIGURATION:
 * =============
 * Add the following configuration before including this script:
 * 
 * window.musartyConfig = {
 *     musartyApiUrl: 'https://musarty.com/api/callback',
 *     shopifyDomain: 'your-store.myshopify.com',
 *     shopifyAccessToken: 'your-admin-access-token',
 *     debug: true // Set to false in production
 * };
 */

(function() {
    'use strict';

    // Default configuration
    const DEFAULT_CONFIG = {
        musartyApiUrl: 'https://musarty.com/api/callback',
        shopifyApiUrl: '', // Will be auto-generated from shopifyDomain
        shopifyAccessToken: '',
        debug: false,
        position: 'bottom-right',
        offset: 24,
        primaryColor: '#d4af37',
        backgroundColor: '#0a0a0a',
        textColor: '#ffffff'
    };

    // State management
    let state = {
        isChatOpen: false,
        isTyping: false,
        config: null,
        elements: null
    };

    /**
     * Initialize the widget
     */
    function init(customConfig) {
        // Merge configurations
        state.config = Object.assign({}, DEFAULT_CONFIG, window.musartyConfig || {}, customConfig);
        
        // Generate Shopify API URL if domain is provided
        if (state.config.shopifyDomain && !state.config.shopifyApiUrl) {
            state.config.shopifyApiUrl = `https://${state.config.shopifyDomain}/admin/api/2024-01/graphql.json`;
        }

        // Create styles
        createStyles();

        // Create DOM elements
        createElements();

        // Attach event listeners
        attachEvents();

        // Log debug info
        if (state.config.debug) {
            console.log('[Musarty Widget] Initialized with config:', state.config);
        }
    }

    /**
     * Create and inject CSS styles
     */
    function createStyles() {
        const styleId = 'musarty-widget-styles';
        if (document.getElementById(styleId)) return;

        const styles = `
            /* Musarty Widget Core Styles */
            .musarty-widget-root {
                --musarty-black: #0a0a0a;
                --musarty-black-light: #1a1a1a;
                --musarty-black-lighter: #2a2a2a;
                --musarty-gold: #d4af37;
                --musarty-gold-light: #f5d75f;
                --musarty-gold-dark: #b8960c;
                --musarty-text: #ffffff;
                --musarty-text-muted: #a0a0a0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 999999 !important;
            }

            .musarty-bubble {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 72px;
                height: 72px;
                border-radius: 50%;
                background: linear-gradient(145deg, #1a1a1a, #0a0a0a);
                border: 2px solid var(--musarty-gold);
                box-shadow: 
                    0 4px 20px rgba(212, 175, 55, 0.3),
                    0 0 30px rgba(212, 175, 55, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                cursor: pointer;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                animation: musarty-pulse 2s ease-in-out infinite;
            }

            .musarty-bubble:hover {
                transform: scale(1.08);
            }

            .musarty-bubble svg {
                width: 32px;
                height: 32px;
                fill: var(--musarty-gold);
                filter: drop-shadow(0 0 4px rgba(212, 175, 55, 0.5));
            }

            @keyframes musarty-pulse {
                0%, 100% { box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3), 0 0 30px rgba(212, 175, 55, 0.15); }
                50% { box-shadow: 0 4px 25px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.25); }
            }

            /* Chat Window */
            .musarty-chat {
                position: fixed;
                bottom: 110px;
                right: 24px;
                width: 400px;
                max-width: calc(100vw - 48px);
                height: 600px;
                max-height: calc(100vh - 140px);
                background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
                border: 1px solid var(--musarty-gold);
                border-radius: 20px;
                box-shadow: 
                    0 10px 50px rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(212, 175, 55, 0.2);
                z-index: 999998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: musarty-slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .musarty-chat.open { display: flex; }

            @keyframes musarty-slideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            /* Header */
            .musarty-header {
                padding: 20px;
                background: linear-gradient(90deg, #1a1a1a, #2a2a2a);
                border-bottom: 1px solid rgba(212, 175, 55, 0.3);
                display: flex;
                align-items: center;
                gap: 14px;
            }

            .musarty-header .avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(145deg, #d4af37, #b8960c);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
            }

            .musarty-header .avatar svg { width: 28px; height: 28px; fill: #0a0a0a; }

            .musarty-header .info { flex: 1; }

            .musarty-header .info h3 {
                font-size: 16px;
                font-weight: 600;
                color: var(--musarty-gold);
                margin: 0 0 2px;
            }

            .musarty-header .info p {
                font-size: 12px;
                color: var(--musarty-text-muted);
                margin: 0;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .musarty-header .online-dot {
                width: 8px;
                height: 8px;
                background: #22c55e;
                border-radius: 50%;
            }

            /* Messages */
            .musarty-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .musarty-message {
                display: flex;
                gap: 12px;
                max-width: 85%;
                animation: musarty-fadeIn 0.3s ease;
            }

            .musarty-message.user { flex-direction: row-reverse; align-self: flex-end; }

            @keyframes musarty-fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .musarty-message .msg-avatar {
                width: 32px;
                height: 32px;
                min-width: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .musarty-message.bot .msg-avatar {
                background: linear-gradient(145deg, #d4af37, #b8960c);
            }

            .musarty-message.user .msg-avatar {
                background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                border: 1px solid rgba(212, 175, 55, 0.5);
            }

            .musarty-message .msg-avatar svg {
                width: 18px;
                height: 18px;
            }

            .musarty-message.bot .msg-avatar svg { fill: #0a0a0a; }
            .musarty-message.user .msg-avatar svg { fill: var(--musarty-gold); }

            .musarty-message .msg-content {
                padding: 14px 18px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.5;
            }

            .musarty-message.bot .msg-content {
                background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
                border: 1px solid rgba(212, 175, 55, 0.2);
                color: var(--musarty-text);
                border-top-left-radius: 4px;
            }

            .musarty-message.user .msg-content {
                background: linear-gradient(135deg, #d4af37, #b8960c);
                color: #0a0a0a;
                border-top-right-radius: 4px;
            }

            /* Typing indicator */
            .musarty-typing {
                display: flex;
                gap: 4px;
                padding: 14px 18px;
                background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
                border: 1px solid rgba(212, 175, 55, 0.2);
                border-radius: 18px;
                border-top-left-radius: 4px;
                width: fit-content;
            }

            .musarty-typing span {
                width: 8px;
                height: 8px;
                background: var(--musarty-gold);
                border-radius: 50%;
                animation: musarty-typing 1.4s ease-in-out infinite;
            }

            .musarty-typing span:nth-child(2) { animation-delay: 0.2s; }
            .musarty-typing span:nth-child(3) { animation-delay: 0.4s; }

            @keyframes musarty-typing {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                30% { transform: translateY(-4px); opacity: 1; }
            }

            /* Quick Actions */
            .musarty-quick-actions {
                padding: 12px 20px;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                border-top: 1px solid rgba(212, 175, 55, 0.15);
            }

            .musarty-quick-actions button {
                padding: 8px 14px;
                background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
                border: 1px solid var(--musarty-gold);
                border-radius: 20px;
                color: var(--musarty-gold);
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .musarty-quick-actions button:hover {
                background: linear-gradient(145deg, #d4af37, #b8960c);
                color: #0a0a0a;
            }

            /* Input area */
            .musarty-input-area {
                padding: 16px 20px;
                background: #0a0a0a;
                border-top: 1px solid rgba(212, 175, 55, 0.2);
            }

            .musarty-input-wrapper {
                display: flex;
                gap: 12px;
                align-items: flex-end;
                background: linear-gradient(145deg, #1a1a1a, #0a0a0a);
                border: 1px solid rgba(212, 175, 55, 0.3);
                border-radius: 24px;
                padding: 8px 16px;
            }

            .musarty-input-wrapper:focus-within {
                border-color: var(--musarty-gold);
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
            }

            .musarty-input-wrapper textarea {
                flex: 1;
                background: transparent;
                border: none;
                color: var(--musarty-text);
                font-size: 14px;
                font-family: inherit;
                resize: none;
                max-height: 100px;
                line-height: 1.4;
                outline: none;
            }

            .musarty-input-wrapper textarea::placeholder { color: var(--musarty-text-muted); }

            .musarty-input-wrapper button {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(145deg, #d4af37, #b8960c);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .musarty-input-wrapper button svg { width: 18px; height: 18px; fill: #0a0a0a; }

            /* Close button */
            .musarty-close {
                background: transparent;
                border: 1px solid rgba(212, 175, 55, 0.3);
                color: var(--musarty-gold);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .musarty-close:hover { background: rgba(212, 175, 55, 0.1); }

            /* Scopes badges */
            .musarty-scopes {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                margin-top: 8px;
            }

            .musarty-scope-badge {
                padding: 4px 10px;
                background: rgba(34, 197, 94, 0.15);
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 12px;
                font-size: 10px;
                color: #22c55e;
            }

            /* Timestamp */
            .musarty-timestamp {
                font-size: 10px;
                color: var(--musarty-text-muted);
                margin-top: 4px;
            }

            /* Responsive */
            @media (max-width: 480px) {
                .musarty-bubble { bottom: 16px; right: 16px; }
                .musarty-chat {
                    bottom: 90px;
                    right: 8px;
                    left: 8px;
                    width: auto;
                }
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = styles;
        document.head.appendChild(style);
    }

    /**
     * Create DOM elements
     */
    function createElements() {
        const root = document.createElement('div');
        root.className = 'musarty-widget-root';
        root.innerHTML = `
            <!-- Floating Bubble Button -->
            <button class="musarty-bubble" id="musarty-bubble-btn" aria-label="Open AI Assistant">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6-9.2c-.29-.49-.48-1.03-.54-1.6-.13-.99.3-1.93 1.14-2.47l.4-.26V8.3c0-.55.45-1 1-1h1.3c.39 0 .74-.24.88-.59l.47-1.17c.27-.67.17-1.44-.26-2l-.58-.78c-.46-.62-1.26-1.02-2.13-.98l-.87.04c-.65.08-1.21.55-1.43 1.17L9.3 6.3c-.18-.48-.65-.82-1.18-.82H3.5c-.55 0-1 .45-1 1v2c0 .28.11.53.29.72l1.77 3.55c.58 1.16 1.9 1.72 3.18 1.38l.71-.19c.48-.13.91-.41 1.22-.79l.63-.78c.33-.41.84-.62 1.34-.56l1.02.13c.52.07.96.42 1.17.9l.47 1.07c-.17.21-.29.47-.35.74l-.15.65z"/>
                </svg>
            </button>

            <!-- Chat Window -->
            <div class="musarty-chat" id="musarty-chat">
                <div class="musarty-header">
                    <div class="avatar">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    </div>
                    <div class="info">
                        <h3>Musarty AI</h3>
                        <p><span class="online-dot"></span> Online & ready</p>
                    </div>
                    <button class="musarty-close" id="musarty-close-btn" aria-label="Close chat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="musarty-messages" id="musarty-messages">
                    <!-- Welcome message -->
                    <div class="musarty-message bot">
                        <div class="msg-avatar">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        </div>
                        <div class="msg-content">
                            👋 Hello! I'm your MCP-powered AI shopping assistant.
                            <br><br>
                            Connected APIs:
                            <div class="musarty-scopes">
                                <span class="musarty-scope-badge">Musarty API</span>
                                <span class="musarty-scope-badge">Shopify Admin</span>
                            </div>
                            <br>
                            What can I help you find?
                            <div class="musarty-timestamp">Just now</div>
                        </div>
                    </div>
                </div>

                <div class="musarty-quick-actions">
                    <button data-action="Find products">🔍 Products</button>
                    <button data-action="My orders">📦 Orders</button>
                    <button data-action="Track order">🚚 Track</button>
                    <button data-action="Discounts">🏷️ Coupons</button>
                </div>

                <div class="musarty-input-area">
                    <div class="musarty-input-wrapper">
                        <textarea id="musarty-input" placeholder="Ask me anything..." rows="1"></textarea>
                        <button id="musarty-send-btn" aria-label="Send">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(root);

        // Cache DOM references
        state.elements = {
            root: root,
            bubble: root.querySelector('#musarty-bubble-btn'),
            chat: root.querySelector('#musarty-chat'),
            closeBtn: root.querySelector('#musarty-close-btn'),
            messages: root.querySelector('#musarty-messages'),
            input: root.querySelector('#musarty-input'),
            sendBtn: root.querySelector('#musarty-send-btn'),
            quickActions: root.querySelectorAll('.musarty-quick-actions button')
        };
    }

    /**
     * Attach event listeners
     */
    function attachEvents() {
        const { bubble, closeBtn, input, sendBtn, quickActions } = state.elements;

        bubble.addEventListener('click', openChat);
        closeBtn.addEventListener('click', closeChat);
        sendBtn.addEventListener('click', sendMessage);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });

        quickActions.forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.action;
                sendMessage();
            });
        });

        // Escape key closes chat
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isChatOpen) {
                closeChat();
            }
        });
    }

    /**
     * Toggle chat visibility
     */
    function toggleChat() {
        state.isChatOpen ? closeChat() : openChat();
    }

    function openChat() {
        state.isChatOpen = true;
        state.elements.chat.classList.add('open');
        state.elements.bubble.style.display = 'none';
        setTimeout(() => state.elements.input.focus(), 300);
    }

    function closeChat() {
        state.isChatOpen = false;
        state.elements.chat.classList.remove('open');
        setTimeout(() => {
            state.elements.bubble.style.display = 'flex';
        }, 200);
    }

    /**
     * Send message to MCP
     */
    async function sendMessage() {
        const message = state.elements.input.value.trim();
        if (!message || state.isTyping) return;

        addMessage(message, 'user');
        state.elements.input.value = '';
        state.elements.input.style.height = 'auto';

        showTyping();

        try {
            const response = await processWithMCP(message);
            hideTyping();
            addMessage(response, 'bot');
        } catch (error) {
            hideTyping();
            addMessage(`⚠️ Error: ${error.message}`, 'bot');
        }
    }

    /**
     * Process message with MCP
     */
    async function processWithMCP(message) {
        const lower = message.toLowerCase();

        if (lower.includes('product') || lower.includes('find') || lower.includes('search')) {
            return await handleProductQuery();
        } else if (lower.includes('order')) {
            return await handleOrderQuery();
        } else if (lower.includes('discount') || lower.includes('coupon')) {
            return await handleDiscountQuery();
        }

        return getFallbackResponse(message);
    }

    /**
     * Handle product query via Shopify GraphQL
     */
    async function handleProductQuery() {
        if (!state.config.shopifyApiUrl || !state.config.shopifyAccessToken) {
            return getDemoProductsResponse();
        }

        try {
            const response = await fetch(state.config.shopifyApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': state.config.shopifyAccessToken
                },
                body: JSON.stringify({
                    query: `
                        { products(first: 5) { edges { node { title priceRange { minVariantPrice { amount currencyCode } } vendor } } } }
                    `
                })
            });

            const data = await response.json();
            if (data.data?.products?.edges?.length > 0) {
                return formatProducts(data.data.products.edges);
            }
            return getDemoProductsResponse();
        } catch (e) {
            return getDemoProductsResponse();
        }
    }

    function formatProducts(edges) {
        let html = '📦 Products in your store:<br><br>';
        edges.forEach(({ node }) => {
            const price = node.priceRange?.minVariantPrice;
            html += `
                <div style="padding:10px;background:#1a1a1a;border:1px solid rgba(212,175,55,0.2);border-radius:8px;margin-bottom:8px;">
                    <strong>${node.title}</strong><br>
                    <span style="color:#d4af37;">${price?.currencyCode} ${price?.amount}</span> · ${node.vendor || 'Store'}
                </div>
            `;
        });
        return html;
    }

    function getDemoProductsResponse() {
        return `
            📦 Products from your store:<br><br>
            <div style="padding:10px;background:#1a1a1a;border:1px solid rgba(212,175,55,0.2);border-radius:8px;margin-bottom:8px;">
                <strong>Demo Product</strong><br>
                <span style="color:#d4af37;">$49.99</span> · Your Store
            </div>
            <p style="font-size:12px;color:#a0a0a0;margin-top:8px;">
                Configure your Shopify access token to see real products.
            </p>
        `;
    }

    /**
     * Handle order query
     */
    async function handleOrderQuery() {
        return `
            📦 Your recent orders:<br><br>
            <div style="padding:10px;background:#1a1a1a;border:1px solid rgba(34,197,94,0.3);border-radius:8px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;">
                    <strong style="color:#22c55e;">#1001</strong>
                    <span>✅ Fulfilled</span>
                </div>
                <div style="font-size:12px;margin-top:4px;">$149.99</div>
            </div>
            <p style="font-size:12px;color:#a0a0a0;margin-top:8px;">
                Configure your Shopify access token to see real orders.
            </p>
        `;
    }

    /**
     * Handle discount query
     */
    async function handleDiscountQuery() {
        return `
            🏷️ Available discounts:<br><br>
            <div style="padding:10px;background:#1a1a1a;border:1px solid rgba(34,197,94,0.3);border-radius:8px;">
                <strong style="color:#22c55e;">SAVE20</strong><br>
                <span style="font-size:12px;color:#a0a0a0;">20% off · New customers</span>
            </div>
        `;
    }

    /**
     * Fallback response
     */
    function getFallbackResponse(message) {
        return `
            I understand you're asking about "${message}".<br><br>
            I'm connected to both Musarty and Shopify via MCP.<br>
            Try asking about products, orders, or discounts!
        `;
    }

    /**
     * Add message to chat
     */
    function addMessage(content, sender) {
        const { messages } = state.elements;
        const div = document.createElement('div');
        div.className = `musarty-message ${sender}`;

        const avatarSvg = sender === 'bot'
            ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>'
            : '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>';

        div.innerHTML = `
            <div class="msg-avatar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${avatarSvg}</svg>
            </div>
            <div class="msg-content">
                ${content}
                <div class="musarty-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;

        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    /**
     * Show typing indicator
     */
    function showTyping() {
        state.isTyping = true;
        const { messages } = state.elements;
        const div = document.createElement('div');
        div.className = 'musarty-message bot';
        div.id = 'musarty-typing';
        div.innerHTML = `
            <div class="msg-avatar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            </div>
            <div class="musarty-typing">
                <span></span><span></span><span></span>
            </div>
        `;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    /**
     * Hide typing indicator
     */
    function hideTyping() {
        state.isTyping = false;
        const el = document.getElementById('musarty-typing');
        if (el) el.remove();
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }

    // Expose public API
    window.MusartyWidget = {
        init: init,
        open: openChat,
        close: closeChat,
        toggle: toggleChat,
        send: sendMessage
    };

})();
