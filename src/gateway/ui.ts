// Production-compiled React 18 Admin Dashboard
// Redesigned with Herbora Naturals botanical luxury aesthetic (earthy forest olive, linen cream, editorial typography)
// Generated with pre-compiled JSX to eliminate client-side Babel dependencies.

export function getInteractiveUiHtml(options: {
  serviceName: string;
  version: string;
  authRequired: boolean;
}): string {
  const { serviceName, version, authRequired } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${serviceName} — HERBORA NATURALS Dashboard</title>
  
  <!-- Google Fonts: Editorial Serif + Modern Clean Sans + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- React 18 & ReactDOM via CDN (cdnjs with unpkg fallback) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script>
    if (!window.React) {
      document.write('<script src="https://unpkg.com/react@18/umd/react.production.min.js"><\\/script>');
      document.write('<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\\/script>');
    }
  </script>

  <style>
    :root {
      /* Herbora Naturals Botanical Luxury Green & White Palette */
      --bg: #F8F6F0;
      --bg-surface: #FFFFFF;
      --card-bg: #FFFFFF;
      --card-border: #E5E0D3;
      --card-hover: #D7D0C0;
      
      --primary: #243E1B;
      --primary-hover: #1A2F14;
      --primary-light: #EEF4EA;
      --primary-border: #D2E2CB;
      --primary-glow: rgba(36, 62, 27, 0.16);
      
      --accent: #446C34;
      --accent-gold: #C29B38;
      --accent-warm: #EFECE3;
      
      --text: #1E2819;
      --text-muted: #56644F;
      --text-dim: #7F8D78;
      
      --success: #2E7D32;
      --success-bg: #EAF5EA;
      --success-border: #C6E4C6;
      
      --warning: #B45309;
      --warning-bg: #FEF3C7;
      
      --danger: #B91C1C;
      --danger-bg: #FDF0ED;
      --danger-border: #F8D2CC;
      
      --code-bg: #F5F2EA;
      --code-color: #243E1B;
      --code-border: #E2DDD0;
      
      --radius: 18px;
      --radius-sm: 10px;
      --radius-pill: 9999px;
      
      --font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-heading: 'Newsreader', 'Cormorant Garamond', Georgia, serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(68, 108, 52, 0.05) 0px, transparent 45%),
        radial-gradient(at 100% 0%, rgba(239, 236, 227, 0.9) 0px, transparent 40%),
        radial-gradient(at 100% 100%, rgba(68, 108, 52, 0.04) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(238, 244, 234, 0.8) 0px, transparent 45%);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3, h4, .brand-title {
      font-family: var(--font-heading);
      letter-spacing: -0.015em;
      color: var(--text);
    }

    #root { display: flex; flex-direction: column; min-height: 100vh; }

    /* Top Botanical Notice Strip */
    .announcement-bar {
      background: var(--primary);
      color: #FAF8F4;
      text-align: center;
      padding: 7px 16px;
      font-size: 11.5px;
      font-weight: 500;
      letter-spacing: 0.03em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .announcement-bar span { display: inline-flex; align-items: center; gap: 6px; }
    .announcement-dot { opacity: 0.45; font-size: 9px; }

    /* Header Navigation */
    header {
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      padding: 12px 32px;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 14px rgba(36, 62, 27, 0.03);
    }

    .brand {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      cursor: pointer;
      user-select: none;
    }
    .brand-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .brand-name {
      font-family: var(--font-heading);
      font-size: 21px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--primary);
      text-transform: uppercase;
      line-height: 1;
    }
    .brand-sub {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.32em;
      color: var(--accent);
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Nav Tabs Segments (Herbora Pill Bar) */
    .nav-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #EFECE3;
      padding: 4px;
      border-radius: var(--radius-pill);
      border: 1px solid #E2DCCF;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .nav-tab-btn {
      background: transparent;
      border: none;
      color: #56644F;
      padding: 8px 18px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 500;
      font-family: var(--font);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .nav-tab-btn:hover {
      color: var(--primary);
      background: rgba(255, 255, 255, 0.7);
    }
    .nav-tab-btn.active {
      color: #FAF8F4;
      background: var(--primary);
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(36, 62, 27, 0.25);
    }

    .header-user-controls { display: flex; align-items: center; gap: 14px; }

    /* Role Badges */
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: var(--font);
    }
    .role-admin {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--primary-border);
    }
    .role-member {
      background: #F2EFE8;
      color: #56644F;
      border: 1px solid #DFD9CE;
    }

    /* API Key Input Field */
    .api-key-input-wrapper { position: relative; display: flex; align-items: center; }
    .api-key-input {
      background: #FFFFFF;
      border: 1px solid #DCD5C7;
      border-radius: var(--radius-pill);
      color: var(--text);
      font-family: var(--mono);
      font-size: 12px;
      padding: 7px 14px 7px 32px;
      width: 220px;
      transition: all 0.2s;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .api-key-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(36, 62, 27, 0.15);
      background: #FFFFFF;
    }
    .api-key-icon { position: absolute; left: 11px; color: #56644F; font-size: 13px; }

    /* Main Container */
    main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 26px;
      box-shadow: 0 4px 20px rgba(36, 62, 27, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      border-color: var(--card-hover);
      box-shadow: 0 8px 28px rgba(36, 62, 27, 0.07);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 9px 20px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: var(--font);
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: var(--primary);
      color: #FAF8F4;
      border: 1px solid var(--primary-hover);
      box-shadow: 0 3px 12px rgba(36, 62, 27, 0.22);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 5px 16px rgba(36, 62, 27, 0.28);
    }
    .btn-secondary {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--primary-border);
    }
    .btn-secondary:hover {
      background: #E2ECE0;
      border-color: #C3DAC0;
      transform: translateY(-1px);
    }
    .btn-danger {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid var(--danger-border);
    }
    .btn-danger:hover {
      background: #FBE4DF;
      color: #991B1B;
    }
    .btn-sm { padding: 6px 14px; font-size: 12px; }

    /* Tables */
    .data-table-wrapper {
      overflow-x: auto;
      margin-top: 16px;
      border-radius: 14px;
      border: 1px solid var(--card-border);
      background: #FFFFFF;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    table.data-table th {
      padding: 13px 16px;
      background: #F4F1E8;
      border-bottom: 1px solid var(--card-border);
      color: #56644F;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.06em;
      font-family: var(--font);
    }
    table.data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #EFEAE0;
      color: var(--text);
      vertical-align: middle;
    }
    table.data-table tr:hover td {
      background: #F7FAF5;
    }

    /* Badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 11px;
      border-radius: var(--radius-pill);
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font);
    }
    .status-healthy {
      background: var(--success-bg);
      color: var(--success);
      border: 1px solid var(--success-border);
    }
    .status-unreachable {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid var(--danger-border);
    }
    .status-disabled {
      background: #EFECE5;
      color: #6C665D;
      border: 1px solid #DFD9CE;
    }

    code {
      font-family: var(--mono);
      background: var(--code-bg);
      border: 1px solid var(--code-border);
      color: var(--code-color);
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 12px;
    }

    /* Chat view styles */
    .chat-layout { display: flex; flex-direction: column; height: 680px; }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .chat-bubble {
      max-width: 80%;
      padding: 15px 22px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.6;
      position: relative;
    }
    .chat-bubble-user {
      align-self: flex-end;
      background: var(--primary);
      color: #FAF8F4;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 16px rgba(36, 62, 27, 0.2);
    }
    .chat-bubble-assistant {
      align-self: flex-start;
      background: #FFFFFF;
      border: 1px solid var(--card-border);
      color: var(--text);
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
    }
    .tool-call-card {
      margin-top: 12px;
      background: #F3F8F1;
      border: 1px solid var(--primary-border);
      border-radius: 12px;
      padding: 12px;
      font-family: var(--mono);
      font-size: 11px;
    }
    .tool-call-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--primary);
      font-weight: 700;
      cursor: pointer;
    }
    .chat-input-bar {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid var(--card-border);
      background: #FAF8F4;
      border-radius: 0 0 var(--radius) var(--radius);
    }
    .chat-input-field {
      flex: 1;
      background: #FFFFFF;
      border: 1px solid #DCD5C7;
      border-radius: var(--radius-pill);
      padding: 12px 20px;
      color: var(--text);
      font-family: var(--font);
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .chat-input-field:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(36, 62, 27, 0.15);
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(30, 40, 25, 0.5);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: #FFFFFF;
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      width: 100%;
      max-width: 520px;
      padding: 28px;
      box-shadow: 0 24px 60px rgba(36, 62, 27, 0.16);
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .form-group input, .form-group select, .form-group textarea {
      background: #FAF8F4;
      border: 1px solid #DCD5C7;
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(36, 62, 27, 0.15);
    }

    /* Herbora Storefront Showcase Styles */
    .hero-banner {
      background: #FFFFFF;
      border-radius: 24px;
      border: 1px solid var(--card-border);
      padding: 44px 48px;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      align-items: center;
      gap: 36px;
      box-shadow: 0 8px 30px rgba(36, 62, 27, 0.04);
      position: relative;
    }
    .hero-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 12px;
    }
    .hero-title {
      font-size: 44px;
      line-height: 1.15;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 16px;
    }
    .hero-desc {
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-muted);
      max-width: 480px;
      margin-bottom: 26px;
    }
    .hero-features {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-top: 28px;
      padding-top: 22px;
      border-top: 1px solid var(--card-border);
    }
    .hero-feature-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hero-feature-icon { font-size: 24px; }
    .hero-feature-title { font-size: 12.5px; font-weight: 700; color: var(--text); }
    .hero-feature-sub { font-size: 11px; color: var(--text-dim); }

    .hero-visual {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      background: var(--accent-warm);
      border-radius: 18px;
      padding: 30px 20px;
      border: 1px solid #E2DEC8;
    }
    .product-mock-pill {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 20px 14px;
      text-align: center;
      box-shadow: 0 6px 18px rgba(36, 62, 27, 0.06);
      flex: 1;
      border: 1px solid var(--card-border);
      transition: transform 0.2s ease;
    }
    .product-mock-pill:hover { transform: translateY(-3px); }
    .product-mock-pill.featured {
      transform: scale(1.06);
      border-color: var(--primary);
      box-shadow: 0 10px 24px rgba(36, 62, 27, 0.12);
    }
    .product-mock-emoji { font-size: 38px; margin-bottom: 8px; display: block; }
    .product-mock-label { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
    .product-mock-sub { font-size: 10px; color: var(--text-dim); }

    .guarantees-bar {
      background: var(--primary);
      color: #FAF8F4;
      border-radius: var(--radius);
      padding: 20px 40px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      align-items: center;
      gap: 24px;
      box-shadow: 0 8px 24px rgba(36, 62, 27, 0.15);
    }
    .guarantee-item { display: flex; align-items: center; gap: 14px; }
    .guarantee-icon {
      font-size: 24px;
      background: rgba(255, 255, 255, 0.12);
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .guarantee-title { font-size: 13.5px; font-weight: 700; color: #FAF8F4; }
    .guarantee-desc { font-size: 12px; opacity: 0.85; color: #E2ECE0; }

    .section-header { text-align: center; margin-bottom: 22px; }
    .section-title {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text);
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 16px;
    }
    .category-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 22px 14px;
      text-align: center;
      border: 1px solid var(--card-border);
      box-shadow: 0 4px 16px rgba(36, 62, 27, 0.03);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .category-card:hover {
      transform: translateY(-3px);
      border-color: var(--primary);
      box-shadow: 0 8px 24px rgba(36, 62, 27, 0.08);
    }
    .category-icon { font-size: 36px; margin-bottom: 10px; display: block; }
    .category-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
    .category-link { font-size: 11px; color: var(--accent); font-weight: 600; }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
    }
    .product-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 20px 16px;
      border: 1px solid var(--card-border);
      box-shadow: 0 4px 16px rgba(36, 62, 27, 0.03);
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(36, 62, 27, 0.08);
    }
    .product-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: var(--primary);
      color: #FAF8F4;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: var(--radius-pill);
      text-transform: uppercase;
    }
    .product-badge.new { background: #2E7D32; }
    .product-image { font-size: 50px; text-align: center; padding: 14px 0; }
    .product-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .product-rating {
      font-size: 11px;
      color: #C29B38;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .product-rating span { color: var(--text-dim); }
    .product-price { font-size: 14.5px; font-weight: 700; color: var(--primary); margin: 2px 0 8px 0; }

    .promo-banner {
      background: var(--accent-warm);
      border-radius: 20px;
      border: 1px solid #E2DEC8;
      padding: 36px 44px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }
    .promo-title { font-size: 26px; font-weight: 600; margin-bottom: 8px; }
    .promo-desc { font-size: 13.5px; color: var(--text-muted); max-width: 540px; }

    .trust-bar {
      background: #FFFFFF;
      border-radius: var(--radius);
      padding: 20px 32px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      border: 1px solid var(--card-border);
    }
    .trust-item { display: flex; align-items: center; gap: 10px; }
    .trust-icon { font-size: 22px; }
    .trust-title { font-size: 12px; font-weight: 700; color: var(--text); }
    .trust-desc { font-size: 11px; color: var(--text-dim); }
  </style>
</head>
<body>
  <div id="root">
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;color:#56644F;font-family:serif;font-size:18px;">
      🌿 Loading HERBORA NATURALS Gateway...
    </div>
  </div>

  <script>
    window.__GATEWAY_CONFIG__ = {
      serviceName: "${serviceName}",
      version: "${version}",
      authRequired: ${authRequired}
    };

"use strict";
const { useState, useEffect, useRef } = React;

function MCPApp() {
  const [activeTab, setActiveTab] = useState("store");
  const [apiKey, setApiKey] = useState(localStorage.getItem("mcp_api_key") || "gw_sec_dev_local_key_123");
  const [currentUser, setCurrentUser] = useState({ username: "admin", role: "admin" });
  const [upstreams, setUpstreams] = useState([]);
  const [tools, setTools] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your **Herbora Naturals Store & MCP Gateway Assistant**. I can help you inspect organic products, query recent customer orders, check warehouse stock, or manage store catalog tools.",
      toolsCalled: []
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolArgs, setToolArgs] = useState({});
  const [toolResult, setToolResult] = useState(null);
  const [executingTool, setExecutingTool] = useState(false);
  const [showAddUpstream, setShowAddUpstream] = useState(false);
  const [newUpstream, setNewUpstream] = useState({ name: "", prefix: "", url: "http://127.0.0.1:3000/upstream/inventory/mcp", transport: "streamable-http" });
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [newKeyName, setNewKeyName] = useState("New Agent Key");
  const messagesEndRef = useRef(null);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": apiKey ? \`Bearer \${apiKey.trim()}\` : ""
  });

  useEffect(() => {
    if (!apiKey) return;
    localStorage.setItem("mcp_api_key", apiKey);
    fetch("/api/auth/me", { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, [apiKey]);

  useEffect(() => {
    if (activeTab === "upstreams") loadUpstreams();
    if (activeTab === "tools") loadTools();
    if (activeTab === "audit" && currentUser.role === "admin") loadAudit();
    if (activeTab === "keys" && currentUser.role === "admin") loadKeysAndUsers();
  }, [activeTab, apiKey]);

  const loadUpstreams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/upstreams", { headers: getHeaders() });
      if (res.ok) setUpstreams(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTools(data);
        if (data.length > 0 && !selectedTool) setSelectedTool(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit?limit=50", { headers: getHeaders() });
      if (res.ok) setAuditLogs(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const loadKeysAndUsers = async () => {
    setLoading(true);
    try {
      const [kRes, uRes] = await Promise.all([
        fetch("/api/keys", { headers: getHeaders() }),
        fetch("/api/users", { headers: getHeaders() })
      ]);
      if (kRes.ok) setApiKeys(await kRes.json());
      if (uRes.ok) setUsers(await uRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!chatInput.trim() || chatSending) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg, toolsCalled: [] }]);
    setChatSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            toolsCalled: data.toolsCalled || []
          }
        ]);
      } else {
        const err = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: \`❌ Error: \${err.error?.message || err.message || "Failed to process chat"}\`,
            toolsCalled: []
          }
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: \`❌ Network error: \${err.message}\`,
          toolsCalled: []
        }
      ]);
    } finally {
      setChatSending(false);
    }
  };

  const handleToggleUpstream = async (id, currentEnabled) => {
    try {
      const res = await fetch(\`/api/upstreams/\${id}\`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      if (res.ok) {
        notify(\`Upstream \${!currentEnabled ? "enabled" : "disabled"}\`);
        loadUpstreams();
      }
    } catch {
      notify("Failed to toggle upstream", "error");
    }
  };

  const handleCheckHealth = async (id) => {
    try {
      const res = await fetch(\`/api/upstreams/\${id}/health\`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await res.json();
      notify(\`Health check: \${data.status} (\${data.latencyMs}ms)\`, data.status === "healthy" ? "success" : "error");
      loadUpstreams();
    } catch {
      notify("Health check failed", "error");
    }
  };

  const handleAddUpstream = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/upstreams", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newUpstream)
      });
      if (res.ok) {
        notify("Registered new upstream server");
        setShowAddUpstream(false);
        setNewUpstream({ name: "", prefix: "", url: "", transport: "streamable-http" });
        loadUpstreams();
      } else {
        const err = await res.json();
        notify(err.error || "Registration failed", "error");
      }
    } catch {
      notify("Error registering upstream", "error");
    }
  };

  const handleDeleteUpstream = async (id) => {
    if (!confirm("Are you sure you want to remove this upstream server?")) return;
    try {
      const res = await fetch(\`/api/upstreams/\${id}\`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (res.ok) {
        notify("Upstream server deleted");
        loadUpstreams();
      }
    } catch {
      notify("Failed to delete upstream", "error");
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId: currentUser.id || "usr_admin_seed", name: newKeyName })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.rawKey);
        loadKeysAndUsers();
      }
    } catch {
      notify("Failed to create key", "error");
    }
  };

  const handleRevokeKey = async (id) => {
    if (!confirm("Revoke this API key? Authenticated clients will immediately be denied.")) return;
    try {
      const res = await fetch(\`/api/keys/\${id}\`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (res.ok) {
        notify("API key revoked successfully");
        loadKeysAndUsers();
      }
    } catch {
      notify("Failed to revoke key", "error");
    }
  };

  const handleRunTool = async () => {
    if (!selectedTool) return;
    setExecutingTool(true);
    setToolResult(null);
    try {
      const res = await fetch("/mcp", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: selectedTool.name,
            arguments: toolArgs
          }
        })
      });
      const data = await res.json();
      setToolResult(data);
    } catch (err) {
      setToolResult({ error: err.message });
    } finally {
      setExecutingTool(false);
    }
  };

  const askProductToChat = (productName) => {
    setActiveTab("chat");
    setChatInput(\`Tell me about \${productName} and check inventory stock in store\`);
  };

  return /* @__PURE__ */ React.createElement("div", null, 
    /* Top Announcement Strip (Herbora Style) */
    /* @__PURE__ */ React.createElement("div", { className: "announcement-bar" },
      /* @__PURE__ */ React.createElement("span", null, "🌿 Free Shipping on Orders Over $50"),
      /* @__PURE__ */ React.createElement("span", { className: "announcement-dot" }, "●"),
      /* @__PURE__ */ React.createElement("span", null, "✓ 100% Natural & Safe"),
      /* @__PURE__ */ React.createElement("span", { className: "announcement-dot" }, "●"),
      /* @__PURE__ */ React.createElement("span", null, "⚡ Unified WooCommerce MCP Gateway")
    ),

    /* Main Herbora Navigation Header */
    /* @__PURE__ */ React.createElement("header", null, 
      /* Brand Logo */
      /* @__PURE__ */ React.createElement("div", { className: "brand", onClick: () => setActiveTab("store") }, 
        /* @__PURE__ */ React.createElement("div", { className: "brand-top" }, 
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "20px" } }, "🌿"),
          /* @__PURE__ */ React.createElement("span", { className: "brand-name" }, "HERBORA")
        ),
        /* @__PURE__ */ React.createElement("span", { className: "brand-sub" }, "NATURALS")
      ), 

      /* Nav Tabs */
      /* @__PURE__ */ React.createElement("nav", { className: "nav-tabs" }, 
        /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "store" ? "active" : ""}\`, onClick: () => setActiveTab("store") }, "🌿 Storefront"), 
        /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "chat" ? "active" : ""}\`, onClick: () => setActiveTab("chat") }, "🤖 Chat Agent"), 
        /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "upstreams" ? "active" : ""}\`, onClick: () => setActiveTab("upstreams") }, "🌐 Upstreams (", upstreams.length || 3, ")"), 
        /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "tools" ? "active" : ""}\`, onClick: () => setActiveTab("tools") }, "🛠️ Tools Catalog"), 
        currentUser.role === "admin" && /* @__PURE__ */ React.createElement(React.Fragment, null, 
          /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "keys" ? "active" : ""}\`, onClick: () => setActiveTab("keys") }, "🔑 API Keys"), 
          /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "audit" ? "active" : ""}\`, onClick: () => setActiveTab("audit") }, "📋 Audit Logs")
        )
      ), 

      /* User Controls */
      /* @__PURE__ */ React.createElement("div", { className: "header-user-controls" }, 
        /* @__PURE__ */ React.createElement("span", { className: \`role-badge \${currentUser.role === "admin" ? "role-admin" : "role-member"}\` }, "@", currentUser.username, " (", currentUser.role, ")"), 
        /* @__PURE__ */ React.createElement("div", { className: "api-key-input-wrapper" }, 
          /* @__PURE__ */ React.createElement("span", { className: "api-key-icon" }, "🔒"), 
          /* @__PURE__ */ React.createElement("input", {
            type: "password",
            className: "api-key-input",
            placeholder: "Bearer API Key...",
            value: apiKey,
            onChange: (e) => setApiKey(e.target.value),
            title: "Session API Key for authenticated requests"
          })
        )
      )
    ), 

    /* Toast Notification */
    notification && /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      top: "85px",
      right: "28px",
      zIndex: 1000,
      background: notification.type === "error" ? "rgba(185, 28, 28, 0.95)" : "rgba(36, 62, 27, 0.95)",
      color: "#FAF8F4",
      padding: "10px 20px",
      borderRadius: "var(--radius-pill)",
      fontSize: "13px",
      fontWeight: "600",
      backdropFilter: "blur(10px)",
      boxShadow: "0 8px 24px rgba(36, 62, 27, 0.2)"
    } }, notification.msg), 

    /* Main Content */
    /* @__PURE__ */ React.createElement("main", null, 

      /* Herbora Storefront Tab (Matches Provided Assignment Design) */
      activeTab === "store" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "32px" } }, 
        
        /* 1. Hero Section */
        /* @__PURE__ */ React.createElement("section", { className: "hero-banner" }, 
          /* Left Column */
          /* @__PURE__ */ React.createElement("div", null, 
            /* @__PURE__ */ React.createElement("span", { className: "hero-badge" }, "100% NATURAL & HERBAL"), 
            /* @__PURE__ */ React.createElement("h1", { className: "hero-title" }, "Nature's Goodness\nFor a Better You"), 
            /* @__PURE__ */ React.createElement("p", { className: "hero-desc" }, "Discover the power of nature with our premium herbal products crafted for your health and wellness. Integrated live with WooCommerce MCP Gateway."), 
            /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "12px", alignItems: "center" } }, 
              /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { padding: "12px 30px", fontSize: "14px" }, onClick: () => setActiveTab("chat") }, "SHOP NOW →"), 
              /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "12px 24px", fontSize: "14px" }, onClick: () => setActiveTab("tools") }, "Explore MCP Tools 🛠️")
            ), 
            /* 3 Feature Badges */
            /* @__PURE__ */ React.createElement("div", { className: "hero-features" }, 
              /* @__PURE__ */ React.createElement("div", { className: "hero-feature-item" }, 
                /* @__PURE__ */ React.createElement("span", { className: "hero-feature-icon" }, "🌿"), 
                /* @__PURE__ */ React.createElement("div", null, 
                  /* @__PURE__ */ React.createElement("div", { className: "hero-feature-title" }, "100% Natural"), 
                  /* @__PURE__ */ React.createElement("div", { className: "hero-feature-sub" }, "Pure & Safe")
                )
              ), 
              /* @__PURE__ */ React.createElement("div", { className: "hero-feature-item" }, 
                /* @__PURE__ */ React.createElement("span", { className: "hero-feature-icon" }, "🥣"), 
                /* @__PURE__ */ React.createElement("div", null, 
                  /* @__PURE__ */ React.createElement("div", { className: "hero-feature-title" }, "Herbal Expertise"), 
                  /* @__PURE__ */ React.createElement("div", { className: "hero-feature-sub" }, "Trusted & Proven")
                )
              ), 
              /* @__PURE__ */ React.createElement("div", { className: "hero-feature-item" }, 
                /* @__PURE__ */ React.createElement("span", { className: "hero-feature-icon" }, "⚗️"), 
                /* @__PURE__ */ React.createElement("div", null, 
                  /* @__PURE__ */ React.createElement("div", { className: "hero-feature-title" }, "No Chemicals"), 
                  /* @__PURE__ */ React.createElement("div", { className: "hero-feature-sub" }, "Just Nature")
                )
              )
            )
          ), 
          /* Right Visual Showcase */
          /* @__PURE__ */ React.createElement("div", { className: "hero-visual" }, 
            /* @__PURE__ */ React.createElement("div", { className: "product-mock-pill", onClick: () => askProductToChat("Ashwagandha Root") }, 
              /* @__PURE__ */ React.createElement("span", { className: "product-mock-emoji" }, "🌿"), 
              /* @__PURE__ */ React.createElement("div", { className: "product-mock-label" }, "Ashwagandha"), 
              /* @__PURE__ */ React.createElement("div", { className: "product-mock-sub" }, "Root Extract")
            ), 
            /* @__PURE__ */ React.createElement("div", { className: "product-mock-pill featured", onClick: () => askProductToChat("Neem Oil") }, 
              /* @__PURE__ */ React.createElement("span", { className: "product-mock-emoji" }, "🧪"), 
              /* @__PURE__ */ React.createElement("div", { className: "product-mock-label" }, "Neem Oil"), 
              /* @__PURE__ */ React.createElement("div", { className: "product-mock-sub" }, "Skin & Hair Care")
            ), 
            /* @__PURE__ */ React.createElement("div", { className: "product-mock-pill", onClick: () => askProductToChat("Tulsi Powder") }, 
              /* @__PURE__ */ React.createElement("span", { className: "product-mock-emoji" }, "🍵"), 
              /* @__PURE__ */ React.createElement("div", { className: "product-mock-label" }, "Tulsi Powder"), 
              /* @__PURE__ */ React.createElement("div", { className: "product-mock-sub" }, "Immunity Booster")
            )
          )
        ), 

        /* 2. Deep Green Guarantees Bar */
        /* @__PURE__ */ React.createElement("section", { className: "guarantees-bar" }, 
          /* @__PURE__ */ React.createElement("div", { className: "guarantee-item" }, 
            /* @__PURE__ */ React.createElement("div", { className: "guarantee-icon" }, "🛡️"), 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("div", { className: "guarantee-title" }, "Secure Payments"), 
              /* @__PURE__ */ React.createElement("div", { className: "guarantee-desc" }, "100% secure checkout")
            )
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "guarantee-item" }, 
            /* @__PURE__ */ React.createElement("div", { className: "guarantee-icon" }, "🔄"), 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("div", { className: "guarantee-title" }, "Easy Returns"), 
              /* @__PURE__ */ React.createElement("div", { className: "guarantee-desc" }, "30 days return policy")
            )
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "guarantee-item" }, 
            /* @__PURE__ */ React.createElement("div", { className: "guarantee-icon" }, "🎧"), 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("div", { className: "guarantee-title" }, "Customer Support"), 
              /* @__PURE__ */ React.createElement("div", { className: "guarantee-desc" }, "We're here to help")
            )
          )
        ), 

        /* 3. Shop By Category */
        /* @__PURE__ */ React.createElement("section", null, 
          /* @__PURE__ */ React.createElement("div", { className: "section-header" }, 
            /* @__PURE__ */ React.createElement("h2", { className: "section-title" }, "🌿 SHOP BY CATEGORY 🌿")
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "categories-grid" }, 
            [
              { name: "Supplements", icon: "💊" },
              { name: "Herbal Powders", icon: "🥣" },
              { name: "Essential Oils", icon: "🌿" },
              { name: "Herbal Teas", icon: "🍵" },
              { name: "Personal Care", icon: "🧼" },
              { name: "Wellness", icon: "🧘" }
            ].map((cat) => /* @__PURE__ */ React.createElement("div", { key: cat.name, className: "category-card", onClick: () => askProductToChat(cat.name) }, 
              /* @__PURE__ */ React.createElement("span", { className: "category-icon" }, cat.icon), 
              /* @__PURE__ */ React.createElement("div", { className: "category-name" }, cat.name), 
              /* @__PURE__ */ React.createElement("div", { className: "category-link" }, "Shop Now →")
            ))
          )
        ), 

        /* 4. Best Sellers Showcase */
        /* @__PURE__ */ React.createElement("section", null, 
          /* @__PURE__ */ React.createElement("div", { className: "section-header" }, 
            /* @__PURE__ */ React.createElement("h2", { className: "section-title" }, "BEST SELLERS")
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "products-grid" }, 
            [
              { name: "Ashwagandha Capsules", badge: "BEST SELLER", price: "$24.99", rating: "★★★★★", reviews: 128, icon: "💊" },
              { name: "Moringa Powder", price: "$19.99", rating: "★★★★★", reviews: 96, icon: "🥣" },
              { name: "Neem Oil", price: "$18.99", rating: "★★★★★", reviews: 75, icon: "🧪" },
              { name: "Detox Herbal Tea", price: "$14.99", rating: "★★★★★", reviews: 112, icon: "🍵" },
              { name: "Aloe Vera Gel", badge: "NEW", price: "$16.99", rating: "★★★★★", reviews: 58, icon: "🧴" }
            ].map((prod) => /* @__PURE__ */ React.createElement("div", { key: prod.name, className: "product-card" }, 
              prod.badge && /* @__PURE__ */ React.createElement("span", { className: \`product-badge \${prod.badge === "NEW" ? "new" : ""}\` }, prod.badge), 
              /* @__PURE__ */ React.createElement("div", { className: "product-image" }, prod.icon), 
              /* @__PURE__ */ React.createElement("div", { className: "product-name" }, prod.name), 
              /* @__PURE__ */ React.createElement("div", { className: "product-rating" }, prod.rating, " ", /* @__PURE__ */ React.createElement("span", null, "(", prod.reviews, ")")), 
              /* @__PURE__ */ React.createElement("div", { className: "product-price" }, prod.price), 
              /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => askProductToChat(prod.name) }, "💬 Ask AI Agent")
            ))
          )
        ), 

        /* 5. Pure Herbal Care Promotional Banner */
        /* @__PURE__ */ React.createElement("section", { className: "promo-banner" }, 
          /* @__PURE__ */ React.createElement("div", null, 
            /* @__PURE__ */ React.createElement("h2", { className: "promo-title" }, "Pure Herbal Care For Your Everyday Wellness"), 
            /* @__PURE__ */ React.createElement("p", { className: "promo-desc" }, "Our products are made with carefully selected herbs to support your health naturally. Test them via unified WooCommerce tools and inventory streams.")
          ), 
          /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { padding: "12px 28px" }, onClick: () => setActiveTab("tools") }, "EXPLORE COLLECTION →")
        ), 

        /* 6. Bottom Trust Strip */
        /* @__PURE__ */ React.createElement("section", { className: "trust-bar" }, 
          /* @__PURE__ */ React.createElement("div", { className: "trust-item" }, 
            /* @__PURE__ */ React.createElement("span", { className: "trust-icon" }, "🌱"), 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("div", { className: "trust-title" }, "Sustainably Sourced"), 
              /* @__PURE__ */ React.createElement("div", { className: "trust-desc" }, "From nature, responsibly")
            )
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "trust-item" }, 
            /* @__PURE__ */ React.createElement("span", { className: "trust-icon" }, "🏆"), 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("div", { className: "trust-title" }, "Premium Quality"), 
              /* @__PURE__ */ React.createElement("div", { className: "trust-desc" }, "Lab tested & trusted")
            )
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "trust-item" }, 
            /* @__PURE__ */ React.createElement("span", { className: "trust-icon" }, "💚"), 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("div", { className: "trust-title" }, "Made with Care"), 
              /* @__PURE__ */ React.createElement("div", { className: "trust-desc" }, "For you and your family")
            )
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "trust-item" }, 
            /* @__PURE__ */ React.createElement("span", { className: "trust-icon" }, "🌍"), 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("div", { className: "trust-title" }, "Eco Friendly"), 
              /* @__PURE__ */ React.createElement("div", { className: "trust-desc" }, "Good for you, good for earth")
            )
          )
        )
      ), 

      /* Chat Agent Tab */
      activeTab === "chat" && /* @__PURE__ */ React.createElement("div", { className: "card chat-layout" }, 
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "14px" } }, 
          /* @__PURE__ */ React.createElement("div", null, 
            /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontWeight: "600" } }, "AI Store Chat Agent"), 
            /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" } }, "Executes live tools through the unified MCP Gateway across all registered upstream servers.")
          ), 
          /* Quick Action Pills */
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px" } }, 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("List today's store orders") }, "📦 Orders"), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("Check warehouse stock for SKU WOO-HOODIE") }, "🏭 Warehouse"), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("Create a product called Organic Coffee Beans with price 19.99") }, "🌿 New Product")
          )
        ), 
        /* @__PURE__ */ React.createElement("div", { className: "chat-messages" }, 
          chatMessages.map((msg, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: \`chat-bubble \${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}\` }, 
            /* @__PURE__ */ React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, msg.content), 
            msg.toolsCalled && msg.toolsCalled.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" } }, 
              /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "var(--primary)", fontWeight: "700", textTransform: "uppercase" } }, "⚡ Tools Called (", msg.toolsCalled.length, "):"), 
              msg.toolsCalled.map((tc, tcIdx) => /* @__PURE__ */ React.createElement("div", { key: tcIdx, className: "tool-call-card" }, 
                /* @__PURE__ */ React.createElement("div", { className: "tool-call-header" }, 
                  /* @__PURE__ */ React.createElement("span", null, tc.tool), 
                  /* @__PURE__ */ React.createElement("span", { style: { color: tc.success ? "var(--success)" : "var(--danger)" } }, tc.durationMs, "ms · ", tc.success ? "Success" : "Error")
                ), 
                /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" } }, 
                  /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--text)" } }, "Args:"), " ", JSON.stringify(tc.arguments)
                )
              ))
            )
          )), 
          chatSending && /* @__PURE__ */ React.createElement("div", { className: "chat-bubble chat-bubble-assistant", style: { fontStyle: "italic", color: "var(--text-muted)" } }, "🌿 Executing tool calling loop through gateway..."), 
          /* @__PURE__ */ React.createElement("div", { ref: messagesEndRef })
        ), 
        /* @__PURE__ */ React.createElement("form", { onSubmit: handleSendMessage, className: "chat-input-bar" }, 
          /* @__PURE__ */ React.createElement("input", {
            type: "text",
            className: "chat-input-field",
            placeholder: "Ask about organic products, orders, physical stock, or returns...",
            value: chatInput,
            onChange: (e) => setChatInput(e.target.value),
            disabled: chatSending
          }), 
          /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-primary", disabled: chatSending || !chatInput.trim() }, chatSending ? "Calling..." : "Send")
        )
      ), 

      /* Upstreams Tab */
      activeTab === "upstreams" && /* @__PURE__ */ React.createElement("div", { className: "card" }, 
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, 
          /* @__PURE__ */ React.createElement("div", null, 
            /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontWeight: "600" } }, "Registered Upstream MCP Servers"), 
            /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" } }, "Aggregated upstream servers with isolation, prefix routing, and health probes.")
          ), 
          currentUser.role === "admin" && /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-sm", onClick: () => setShowAddUpstream(true) }, "+ Register Upstream")
        ), 
        /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, 
          /* @__PURE__ */ React.createElement("table", { className: "data-table" }, 
            /* @__PURE__ */ React.createElement("thead", null, 
              /* @__PURE__ */ React.createElement("tr", null, 
                /* @__PURE__ */ React.createElement("th", null, "Prefix"), 
                /* @__PURE__ */ React.createElement("th", null, "Server Name"), 
                /* @__PURE__ */ React.createElement("th", null, "Target URL"), 
                /* @__PURE__ */ React.createElement("th", null, "Transport"), 
                /* @__PURE__ */ React.createElement("th", null, "Status"), 
                /* @__PURE__ */ React.createElement("th", null, "Last Checked"), 
                /* @__PURE__ */ React.createElement("th", null, "Actions")
              )
            ), 
            /* @__PURE__ */ React.createElement("tbody", null, 
              upstreams.map((ups) => /* @__PURE__ */ React.createElement("tr", { key: ups.id }, 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", { style: { fontWeight: "700" } }, ups.prefix, "__")), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, ups.name)), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-muted)" } }, ups.url)), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", textTransform: "uppercase" } }, ups.transport)), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`status-badge status-\${ups.status || "healthy"}\` }, "● ", ups.status || "healthy", " ", ups.latencyMs ? \`(\${ups.latencyMs}ms)\` : "")), 
                /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, ups.lastCheckedAt ? new Date(ups.lastCheckedAt).toLocaleTimeString() : "Never"), 
                /* @__PURE__ */ React.createElement("td", null, 
                  /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px" } }, 
                    /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => handleCheckHealth(ups.id) }, "Ping"), 
                    currentUser.role === "admin" && /* @__PURE__ */ React.createElement(React.Fragment, null, 
                      /* @__PURE__ */ React.createElement("button", {
                        className: \`btn btn-sm \${ups.enabled ? "btn-secondary" : "btn-primary"}\`,
                        onClick: () => handleToggleUpstream(ups.id, ups.enabled)
                      }, ups.enabled ? "Disable" : "Enable"), 
                      /* @__PURE__ */ React.createElement("button", { className: "btn btn-danger btn-sm", onClick: () => handleDeleteUpstream(ups.id) }, "Delete")
                    )
                  )
                )
              ))
            )
          )
        )
      ), 

      /* Tools Catalog Tab */
      activeTab === "tools" && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px" } }, 
        /* @__PURE__ */ React.createElement("div", { className: "card", style: { padding: "18px" } }, 
          /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "13px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px", fontFamily: "var(--font)" } }, "Available Tools (", tools.length, ")"), 
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "6px", maxHeight: "600px", overflowY: "auto" } }, 
            tools.map((t) => /* @__PURE__ */ React.createElement("div", {
              key: t.name,
              onClick: () => {
                setSelectedTool(t);
                setToolArgs({});
                setToolResult(null);
              },
              style: {
                padding: "10px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                background: selectedTool?.name === t.name ? "var(--primary-light)" : "transparent",
                border: selectedTool?.name === t.name ? "1px solid var(--primary-border)" : "1px solid transparent"
              }
            }, 
              /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: "12px", fontWeight: "600", color: selectedTool?.name === t.name ? "var(--primary)" : "var(--text)" } }, t.name), 
              /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, t.description || "No description provided.")
            ))
          )
        ), 
        /* @__PURE__ */ React.createElement("div", { className: "card" }, 
          selectedTool ? /* @__PURE__ */ React.createElement("div", null, 
            /* @__PURE__ */ React.createElement("div", { style: { borderBottom: "1px solid var(--card-border)", paddingBottom: "14px", marginBottom: "16px" } }, 
              /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, 
                /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontFamily: "var(--font-heading)", color: "var(--text)" } }, selectedTool.name), 
                /* @__PURE__ */ React.createElement("span", { className: "role-badge role-admin" }, selectedTool.upstreamName || "Aggregated")
              ), 
              /* @__PURE__ */ React.createElement("p", { style: { fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" } }, selectedTool.description)
            ), 
            /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "16px" } }, 
              /* @__PURE__ */ React.createElement("h4", { style: { fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "8px", fontFamily: "var(--font)" } }, "Input Arguments (JSON):"), 
              /* @__PURE__ */ React.createElement("textarea", {
                rows: "4",
                style: { width: "100%", background: "var(--code-bg)", border: "1px solid var(--card-border)", borderRadius: "10px", padding: "12px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: "12px" },
                value: JSON.stringify(toolArgs, null, 2),
                onChange: (e) => {
                  try {
                    setToolArgs(JSON.parse(e.target.value));
                  } catch {}
                }
              })
            ), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleRunTool, disabled: executingTool }, executingTool ? "Executing Tool..." : "⚡ Execute Tool"), 
            toolResult && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px" } }, 
              /* @__PURE__ */ React.createElement("h4", { style: { fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "8px", fontFamily: "var(--font)" } }, "Tool Response:"), 
              /* @__PURE__ */ React.createElement("pre", { style: { background: "var(--code-bg)", border: "1px solid var(--card-border)", borderRadius: "10px", padding: "14px", fontSize: "12px", color: "var(--primary)", overflowX: "auto", maxHeight: "350px" } }, JSON.stringify(toolResult, null, 2))
            )
          ) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px", color: "var(--text-dim)" } }, "Select a tool from the catalog to inspect schema and test.")
        )
      ), 

      /* API Keys Tab */
      activeTab === "keys" && currentUser.role === "admin" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } }, 
        /* @__PURE__ */ React.createElement("div", { className: "card" }, 
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontWeight: "600" } }, "API Key Management"), 
              /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" } }, "Cryptographically hashed API keys for external MCP clients and agents. Revocation is instant.")
            ), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-sm", onClick: () => setShowNewKeyModal(true) }, "+ Create API Key")
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, 
            /* @__PURE__ */ React.createElement("table", { className: "data-table" }, 
              /* @__PURE__ */ React.createElement("thead", null, 
                /* @__PURE__ */ React.createElement("tr", null, 
                  /* @__PURE__ */ React.createElement("th", null, "Key Name"), 
                  /* @__PURE__ */ React.createElement("th", null, "Key Prefix"), 
                  /* @__PURE__ */ React.createElement("th", null, "User ID"), 
                  /* @__PURE__ */ React.createElement("th", null, "Created"), 
                  /* @__PURE__ */ React.createElement("th", null, "Status"), 
                  /* @__PURE__ */ React.createElement("th", null, "Action")
                )
              ), 
              /* @__PURE__ */ React.createElement("tbody", null, 
                apiKeys.map((k) => /* @__PURE__ */ React.createElement("tr", { key: k.id }, 
                  /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, k.name)), 
                  /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, k.keyPrefix)), 
                  /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-muted)" } }, k.userId), 
                  /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, new Date(k.createdAt).toLocaleDateString()), 
                  /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`status-badge \${k.revoked ? "status-unreachable" : "status-healthy"}\` }, k.revoked ? "Revoked" : "Active")), 
                  /* @__PURE__ */ React.createElement("td", null, !k.revoked && /* @__PURE__ */ React.createElement("button", { className: "btn btn-danger btn-sm", onClick: () => handleRevokeKey(k.id) }, "Revoke"))
                ))
              )
            )
          )
        ), 
        /* Identities Card */
        /* @__PURE__ */ React.createElement("div", { className: "card" }, 
          /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontWeight: "600" } }, "Identities & Roles"), 
          /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, 
            /* @__PURE__ */ React.createElement("table", { className: "data-table" }, 
              /* @__PURE__ */ React.createElement("thead", null, 
                /* @__PURE__ */ React.createElement("tr", null, 
                  /* @__PURE__ */ React.createElement("th", null, "User ID"), 
                  /* @__PURE__ */ React.createElement("th", null, "Username"), 
                  /* @__PURE__ */ React.createElement("th", null, "Role"), 
                  /* @__PURE__ */ React.createElement("th", null, "Created At")
                )
              ), 
              /* @__PURE__ */ React.createElement("tbody", null, 
                users.map((u) => /* @__PURE__ */ React.createElement("tr", { key: u.id }, 
                  /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, u.id)), 
                  /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, "@", u.username)), 
                  /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`role-badge \${u.role === "admin" ? "role-admin" : "role-member"}\` }, u.role)), 
                  /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, new Date(u.createdAt).toLocaleDateString())
                ))
              )
            )
          )
        )
      ), 

      /* Audit Logs Tab */
      activeTab === "audit" && currentUser.role === "admin" && /* @__PURE__ */ React.createElement("div", { className: "card" }, 
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, 
          /* @__PURE__ */ React.createElement("div", null, 
            /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontWeight: "600" } }, "Gateway Tool Audit Logs"), 
            /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" } }, "Immutable execution trail of all tool invocations across the unified gateway.")
          ), 
          /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: loadAudit }, "🔄 Refresh Logs")
        ), 
        /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, 
          /* @__PURE__ */ React.createElement("table", { className: "data-table" }, 
            /* @__PURE__ */ React.createElement("thead", null, 
              /* @__PURE__ */ React.createElement("tr", null, 
                /* @__PURE__ */ React.createElement("th", null, "Timestamp"), 
                /* @__PURE__ */ React.createElement("th", null, "User"), 
                /* @__PURE__ */ React.createElement("th", null, "Upstream Server"), 
                /* @__PURE__ */ React.createElement("th", null, "Tool Name"), 
                /* @__PURE__ */ React.createElement("th", null, "Duration"), 
                /* @__PURE__ */ React.createElement("th", null, "Outcome")
              )
            ), 
            /* @__PURE__ */ React.createElement("tbody", null, 
              auditLogs.map((log) => /* @__PURE__ */ React.createElement("tr", { key: log.id }, 
                /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, new Date(log.timestamp).toLocaleTimeString()), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, "@", log.username)), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, log.upstreamName)), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", { style: { color: "var(--primary)", fontWeight: "600" } }, log.toolName)), 
                /* @__PURE__ */ React.createElement("td", { style: { fontFamily: "var(--mono)", fontSize: "11px" } }, log.durationMs, "ms"), 
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`status-badge \${log.success ? "status-healthy" : "status-unreachable"}\` }, log.success ? "Success" : "Error"))
              ))
            )
          )
        )
      )
    ), 

    /* Modals */
    showAddUpstream && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay" }, 
      /* @__PURE__ */ React.createElement("div", { className: "modal-content" }, 
        /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "18px", fontWeight: "600", marginBottom: "16px" } }, "Register Streamable HTTP Upstream Server"), 
        /* @__PURE__ */ React.createElement("form", { onSubmit: handleAddUpstream }, 
          /* @__PURE__ */ React.createElement("div", { className: "form-group" }, 
            /* @__PURE__ */ React.createElement("label", null, "Server Display Name"), 
            /* @__PURE__ */ React.createElement("input", { type: "text", required: true, placeholder: "e.g. Analytics MCP Server", value: newUpstream.name, onChange: (e) => setNewUpstream({ ...newUpstream, name: e.target.value }) })
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "form-group" }, 
            /* @__PURE__ */ React.createElement("label", null, "Unique Prefix (Collision Prevention)"), 
            /* @__PURE__ */ React.createElement("input", { type: "text", required: true, placeholder: "e.g. ana", value: newUpstream.prefix, onChange: (e) => setNewUpstream({ ...newUpstream, prefix: e.target.value }) })
          ), 
          /* @__PURE__ */ React.createElement("div", { className: "form-group" }, 
            /* @__PURE__ */ React.createElement("label", null, "Streamable HTTP URL"), 
            /* @__PURE__ */ React.createElement("input", { type: "url", required: true, placeholder: "http://service:3000/mcp", value: newUpstream.url, onChange: (e) => setNewUpstream({ ...newUpstream, url: e.target.value }) })
          ), 
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" } }, 
            /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowAddUpstream(false) }, "Cancel"), 
            /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-primary" }, "Register")
          )
        )
      )
    ), 

    showNewKeyModal && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay" }, 
      /* @__PURE__ */ React.createElement("div", { className: "modal-content" }, 
        /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "18px", fontWeight: "600", marginBottom: "16px" } }, "Generate New API Key"), 
        generatedKey ? /* @__PURE__ */ React.createElement("div", null, 
          /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "#B45309", marginBottom: "10px", background: "var(--warning-bg)", padding: "10px", borderRadius: "8px" } }, "⚠️ ", /* @__PURE__ */ React.createElement("strong", null, "Important"), ": Copy your API key now. It is hashed immediately and will never be shown again!"), 
          /* @__PURE__ */ React.createElement("input", {
            type: "text",
            readOnly: true,
            value: generatedKey,
            style: { width: "100%", padding: "10px", fontFamily: "var(--mono)", fontSize: "12px", background: "var(--code-bg)", border: "1px solid var(--primary)", borderRadius: "8px", color: "var(--primary)" }
          }), 
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" } }, 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => {
              navigator.clipboard.writeText(generatedKey);
              notify("Copied API Key to clipboard");
            } }, "📋 Copy Key"), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => {
              setShowNewKeyModal(false);
              setGeneratedKey(null);
            } }, "Close")
          )
        ) : /* @__PURE__ */ React.createElement("form", { onSubmit: handleCreateKey }, 
          /* @__PURE__ */ React.createElement("div", { className: "form-group" }, 
            /* @__PURE__ */ React.createElement("label", null, "Key Name / Description"), 
            /* @__PURE__ */ React.createElement("input", { type: "text", required: true, placeholder: "e.g. Production Claude Desktop Key", value: newKeyName, onChange: (e) => setNewKeyName(e.target.value) })
          ), 
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" } }, 
            /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowNewKeyModal(false) }, "Cancel"), 
            /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-primary" }, "Generate")
          )
        )
      )
    )
  );
}

    function mountDashboard() {
      var rootEl = document.getElementById('root');
      if (rootEl && window.React && window.ReactDOM) {
        var root = ReactDOM.createRoot(rootEl);
        root.render(React.createElement(MCPApp, null));
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountDashboard);
    } else {
      mountDashboard();
    }
  </script>
</body>
</html>`;
}
