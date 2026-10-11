// Production-compiled React 18 Admin Dashboard
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
  <title>${serviceName} — Unified MCP Platform Dashboard</title  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
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
      --bg: #0b0f19;
      --bg-surface: #111827;
      --card-bg: rgba(17, 24, 43, 0.75);
      --card-border: rgba(99, 102, 241, 0.2);
      --card-hover: rgba(99, 102, 241, 0.35);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.45);
      --accent: #a855f7;
      --accent-glow: rgba(168, 85, 247, 0.35);
      --cyan: #06b6d4;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.3);
      --warning: #f59e0b;
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.3);
      --code-bg: #060913;
      --radius: 14px;
      --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-heading: 'Outfit', sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: #0b0f19;
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.22) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.2) 0px, transparent 45%),
        radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.16) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(99, 102, 241, 0.18) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(15, 23, 42, 0.75) 0px, transparent 100%);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    h1, h2, h3, h4, .brand-title {
      font-family: var(--font-heading);
      letter-spacing: -0.02em;
    }

    #root { display: flex; flex-direction: column; min-height: 100vh; }

    header {
      background: rgba(11, 15, 25, 0.88);
      backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 14px 32px;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px; color: #fff;
      box-shadow: 0 0 24px rgba(99, 102, 241, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4);
    }
    .brand-title {
      font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
      display: flex; align-items: center; gap: 10px; color: #fff;
    }

    .nav-tabs {
      display: flex; align-items: center; gap: 6px;
      background: rgba(15, 23, 42, 0.7);
      padding: 5px; border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .nav-tab-btn {
      background: transparent; border: none; color: #94a3b8;
      padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex; align-items: center; gap: 7px;
    }
    .nav-tab-btn:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.06); }
    .nav-tab-btn.active {
      color: #fff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }

    .header-user-controls { display: flex; align-items: center; gap: 14px; }

    .role-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; border-radius: 9999px; font-size: 11px;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .role-admin {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25));
      color: #a5b4fc; border: 1px solid rgba(168, 85, 247, 0.45);
      box-shadow: 0 0 14px rgba(99, 102, 241, 0.25);
    }
    .role-member {
      background: rgba(20, 184, 166, 0.2); color: #2dd4bf;
      border: 1px solid rgba(20, 184, 166, 0.35);
      box-shadow: 0 0 14px rgba(20, 184, 166, 0.25);
    }

    .api-key-input-wrapper { position: relative; display: flex; align-items: center; }
    .api-key-input {
      background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px; color: #f8fafc; font-family: var(--mono);
      font-size: 12px; padding: 8px 12px 8px 32px; width: 230px; transition: all 0.2s;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .api-key-input:focus {
      outline: none; border-color: #818cf8;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
      background: rgba(15, 23, 42, 0.95);
    }
    .api-key-icon { position: absolute; left: 10px; color: #818cf8; font-size: 13px; }

    main {
      flex: 1; max-width: 1400px; width: 100%; margin: 0 auto;
      padding: 28px; display: flex; flex-direction: column; gap: 24px;
    }

    .card {
      background: linear-gradient(180deg, rgba(20, 27, 45, 0.75) 0%, rgba(13, 19, 33, 0.82) 100%);
      backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      border-color: rgba(99, 102, 241, 0.28);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 24px rgba(99, 102, 241, 0.1);
    }

    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 7px; padding: 9px 18px; border-radius: 9px; font-size: 13px;
      font-weight: 600; cursor: pointer; border: none; transition: all 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%);
      color: #fff;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.55);
      filter: brightness(1.08);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06); color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn-danger {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.25) 100%);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }
    .btn-sm { padding: 6px 12px; font-size: 12px; }

    /* Tables */
    .data-table-wrapper {
      overflow-x: auto; margin-top: 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(11, 15, 25, 0.6);
    }
    table.data-table {
      width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;
    }
    table.data-table th {
      padding: 12px 16px;
      background: rgba(99, 102, 241, 0.08);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em;
    }
    table.data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #f1f5f9; vertical-align: middle;
    }
    table.data-table tr:hover td {
      background: rgba(99, 102, 241, 0.05);
    }

    /* Badges */
    .status-badge {
      display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
      border-radius: 9999px; font-size: 11px; font-weight: 700;
    }
    .status-healthy {
      background: rgba(16, 185, 129, 0.2); color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
    }
    .status-unreachable {
      background: rgba(239, 68, 68, 0.2); color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.25);
    }
    .status-disabled {
      background: rgba(148, 163, 184, 0.15); color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    code {
      font-family: var(--mono);
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.22);
      color: #c7d2fe;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 12px;
    }

    /* Chat view styles */
    .chat-layout { display: flex; flex-direction: column; height: 680px; }
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 20px; display: flex;
      flex-direction: column; gap: 18px;
    }
    .chat-bubble {
      max-width: 80%; padding: 14px 20px; border-radius: 16px;
      font-size: 14px; line-height: 1.6; position: relative;
    }
    .chat-bubble-user {
      align-self: flex-end;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #fff; border-bottom-right-radius: 4px;
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.35);
    }
    .chat-bubble-assistant {
      align-self: flex-start;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e2e8f0; border-bottom-left-radius: 4px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }
    .tool-call-card {
      margin-top: 12px; background: rgba(6, 9, 19, 0.7);
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 10px; padding: 12px; font-family: var(--mono); font-size: 11px;
    }
    .tool-call-header {
      display: flex; justify-content: space-between; align-items: center;
      color: #a5b4fc; font-weight: 600; cursor: pointer;
    }
    .chat-input-bar {
      display: flex; gap: 12px; padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(11, 15, 25, 0.6);
    }
    .chat-input-field {
      flex: 1; background: var(--code-bg);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px; padding: 12px 16px; color: #fff; font-family: var(--font);
      font-size: 14px; transition: border-color 0.2s;
    }
    .chat-input-field:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
    }

    /* Modals */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content {
      background: #0f172a; border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius); width: 100%; max-width: 520px; padding: 28px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-group label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }
    .form-group input, .form-group select, .form-group textarea {
      background: var(--code-bg); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9px; padding: 10px 14px; color: var(--text); font-family: var(--font);
      font-size: 13px;
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary); }
  </style>
</head>
<body>
  <div id="root">
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;color:#9ca3af;font-family:sans-serif;">
      Loading WooCommerce MCP Gateway Dashboard...
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
  const [activeTab, setActiveTab] = useState("chat");
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
      content: "Hello! I am your **WooCommerce MCP Gateway Assistant**. I can help you inspect products, query recent orders, check warehouse stock, or look up customer support data through unified MCP tools.",
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
    setTimeout(() => setNotification(null), 4e3);
  };
  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": apiKey ? \`Bearer \${apiKey.trim()}\` : ""
  });
  useEffect(() => {
    if (!apiKey) return;
    localStorage.setItem("mcp_api_key", apiKey);
    fetch("/api/auth/me", { headers: getHeaders() }).then((r) => r.json()).then((data) => {
      if (data.user) setCurrentUser(data.user);
    }).catch(() => {
    });
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
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatSending) return;
    const userMsg = { role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          message: text,
          history: chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chat request failed");
      }
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          toolsCalled: data.toolsCalled || [],
          durationMs: data.durationMs
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: \`\\u26A0\\uFE0F **Error processing request**: \${err.message}\`,
          toolsCalled: []
        }
      ]);
    } finally {
      setChatSending(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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
        notify(\`Upstream server \${!currentEnabled ? "enabled" : "disabled"}\`);
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
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("div", { className: "brand" }, /* @__PURE__ */ React.createElement("div", { className: "brand-icon" }, "\\u26A1"), /* @__PURE__ */ React.createElement("div", { className: "brand-title" }, window.__GATEWAY_CONFIG__.serviceName, /* @__PURE__ */ React.createElement("span", { className: "role-badge role-admin" }, ("v" + window.__GATEWAY_CONFIG__.version)))), /* @__PURE__ */ React.createElement("nav", { className: "nav-tabs" }, /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "chat" ? "active" : ""}\`, onClick: () => setActiveTab("chat") }, "\\u{1F916} Chat Agent"), /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "upstreams" ? "active" : ""}\`, onClick: () => setActiveTab("upstreams") }, "\\u{1F310} Upstreams (", upstreams.length || 3, ")"), /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "tools" ? "active" : ""}\`, onClick: () => setActiveTab("tools") }, "\\u{1F6E0}\\uFE0F Tools Catalog"), currentUser.role === "admin" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "keys" ? "active" : ""}\`, onClick: () => setActiveTab("keys") }, "\\u{1F511} API Keys"), /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "audit" ? "active" : ""}\`, onClick: () => setActiveTab("audit") }, "\\u{1F4CB} Audit Logs"))), /* @__PURE__ */ React.createElement("div", { className: "header-user-controls" }, /* @__PURE__ */ React.createElement("span", { className: \`role-badge \${currentUser.role === "admin" ? "role-admin" : "role-member"}\` }, "@", currentUser.username, " (", currentUser.role, ")"), /* @__PURE__ */ React.createElement("div", { className: "api-key-input-wrapper" }, /* @__PURE__ */ React.createElement("span", { className: "api-key-icon" }, "\\u{1F512}"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      className: "api-key-input",
      placeholder: "Bearer API Key...",
      value: apiKey,
      onChange: (e) => setApiKey(e.target.value),
      title: "Session API Key for authenticated requests"
    }
  )))), notification && /* @__PURE__ */ React.createElement("div", { style: {
    position: "fixed",
    top: "75px",
    right: "28px",
    zIndex: 1e3,
    background: notification.type === "error" ? "rgba(239, 68, 68, 0.9)" : "rgba(16, 185, 129, 0.9)",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
  } }, notification.msg), /* @__PURE__ */ React.createElement("main", null, activeTab === "chat" && /* @__PURE__ */ React.createElement("div", { className: "card chat-layout" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "16px", fontWeight: "700" } }, "AI Store Chat Agent"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)" } }, "Executes live tools through the unified MCP Gateway across all registered upstream servers.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("List today's store orders") }, "\\u{1F4E6} Orders"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("Check warehouse stock for SKU WOO-HOODIE") }, "\\u{1F3ED} Warehouse"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("Create a product called Organic Coffee Beans with price 19.99") }, "\\u{1F6CD}\\uFE0F New Product"))), /* @__PURE__ */ React.createElement("div", { className: "chat-messages" }, chatMessages.map((msg, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: \`chat-bubble \${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}\` }, /* @__PURE__ */ React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, msg.content), msg.toolsCalled && msg.toolsCalled.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#a5b4fc", fontWeight: "600", textTransform: "uppercase" } }, "\\u26A1 Tools Called (", msg.toolsCalled.length, "):"), msg.toolsCalled.map((tc, tcIdx) => /* @__PURE__ */ React.createElement("div", { key: tcIdx, className: "tool-call-card" }, /* @__PURE__ */ React.createElement("div", { className: "tool-call-header" }, /* @__PURE__ */ React.createElement("span", null, tc.tool), /* @__PURE__ */ React.createElement("span", { style: { color: tc.success ? "#34d399" : "#f87171" } }, tc.durationMs, "ms \\xB7 ", tc.success ? "Success" : "Error")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", fontSize: "11px", color: "#9ca3af" } }, /* @__PURE__ */ React.createElement("strong", null, "Args:"), " ", JSON.stringify(tc.arguments))))))), chatSending && /* @__PURE__ */ React.createElement("div", { className: "chat-bubble chat-bubble-assistant", style: { fontStyle: "italic", color: "var(--text-muted)" } }, "\\u26A1 Executing tool calling loop through gateway..."), /* @__PURE__ */ React.createElement("div", { ref: messagesEndRef })), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSendMessage, className: "chat-input-bar" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      className: "chat-input-field",
      placeholder: "Ask about products, orders, physical stock, or returns...",
      value: chatInput,
      onChange: (e) => setChatInput(e.target.value),
      disabled: chatSending
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-primary", disabled: chatSending || !chatInput.trim() }, chatSending ? "Calling..." : "Send"))), activeTab === "upstreams" && /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "16px", fontWeight: "700" } }, "Registered Upstream MCP Servers"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)" } }, "Aggregated upstream servers with isolation, prefix routing, and health probes.")), currentUser.role === "admin" && /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-sm", onClick: () => setShowAddUpstream(true) }, "+ Register Upstream")), /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Prefix"), /* @__PURE__ */ React.createElement("th", null, "Server Name"), /* @__PURE__ */ React.createElement("th", null, "Target URL"), /* @__PURE__ */ React.createElement("th", null, "Transport"), /* @__PURE__ */ React.createElement("th", null, "Status"), /* @__PURE__ */ React.createElement("th", null, "Last Checked"), /* @__PURE__ */ React.createElement("th", null, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, upstreams.map((ups) => /* @__PURE__ */ React.createElement("tr", { key: ups.id }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", { style: { color: "#a5b4fc", fontWeight: "700" } }, ups.prefix, "__")), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, ups.name)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-muted)" } }, ups.url)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", textTransform: "uppercase" } }, ups.transport)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`status-badge status-\${ups.status || "healthy"}\` }, "\\u25CF ", ups.status || "healthy", " ", ups.latencyMs ? \`(\${ups.latencyMs}ms)\` : "")), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, ups.lastCheckedAt ? new Date(ups.lastCheckedAt).toLocaleTimeString() : "Never"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => handleCheckHealth(ups.id) }, "Ping"), currentUser.role === "admin" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: \`btn btn-sm \${ups.enabled ? "btn-secondary" : "btn-primary"}\`,
      onClick: () => handleToggleUpstream(ups.id, ups.enabled)
    },
    ups.enabled ? "Disable" : "Enable"
  ), /* @__PURE__ */ React.createElement("button", { className: "btn btn-danger btn-sm", onClick: () => handleDeleteUpstream(ups.id) }, "Delete")))))))))), activeTab === "tools" && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px" } }, /* @__PURE__ */ React.createElement("div", { className: "card", style: { padding: "16px" } }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "13px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" } }, "Available Tools (", tools.length, ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "6px", maxHeight: "600px", overflowY: "auto" } }, tools.map((t) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: t.name,
      onClick: () => {
        setSelectedTool(t);
        setToolArgs({});
        setToolResult(null);
      },
      style: {
        padding: "10px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        background: selectedTool?.name === t.name ? "rgba(99, 102, 241, 0.18)" : "rgba(255, 255, 255, 0.02)",
        border: selectedTool?.name === t.name ? "1px solid var(--primary)" : "1px solid transparent"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: "12px", fontWeight: "600", color: selectedTool?.name === t.name ? "#a5b4fc" : "#e5e7eb" } }, t.name),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, t.description || "No description provided.")
  )))), /* @__PURE__ */ React.createElement("div", { className: "card" }, selectedTool ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { borderBottom: "1px solid var(--card-border)", paddingBottom: "14px", marginBottom: "16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "18px", fontFamily: "var(--mono)", color: "#fff" } }, selectedTool.name), /* @__PURE__ */ React.createElement("span", { className: "role-badge role-admin" }, selectedTool.upstreamName || "Aggregated")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" } }, selectedTool.description)), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "16px" } }, /* @__PURE__ */ React.createElement("h4", { style: { fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "8px" } }, "Input Arguments (JSON):"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      rows: "4",
      style: { width: "100%", background: "var(--code-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "10px", color: "#fff", fontFamily: "var(--mono)", fontSize: "12px" },
      value: JSON.stringify(toolArgs, null, 2),
      onChange: (e) => {
        try {
          setToolArgs(JSON.parse(e.target.value));
        } catch {
        }
      }
    }
  )), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleRunTool, disabled: executingTool }, executingTool ? "Executing Tool..." : "\\u26A1 Execute Tool"), toolResult && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px" } }, /* @__PURE__ */ React.createElement("h4", { style: { fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "8px" } }, "Tool Response:"), /* @__PURE__ */ React.createElement("pre", { style: { background: "var(--code-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "14px", fontSize: "12px", color: "#34d399", overflowX: "auto", maxHeight: "350px" } }, JSON.stringify(toolResult, null, 2)))) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px", color: "var(--text-dim)" } }, "Select a tool from the catalog to inspect schema and test."))), activeTab === "keys" && currentUser.role === "admin" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } }, /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "16px", fontWeight: "700" } }, "API Key Management"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)" } }, "Cryptographically hashed API keys for external MCP clients and agents. Revocation is instant.")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-sm", onClick: () => setShowNewKeyModal(true) }, "+ Create API Key")), /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Key Name"), /* @__PURE__ */ React.createElement("th", null, "Key Prefix"), /* @__PURE__ */ React.createElement("th", null, "User ID"), /* @__PURE__ */ React.createElement("th", null, "Created"), /* @__PURE__ */ React.createElement("th", null, "Status"), /* @__PURE__ */ React.createElement("th", null, "Action"))), /* @__PURE__ */ React.createElement("tbody", null, apiKeys.map((k) => /* @__PURE__ */ React.createElement("tr", { key: k.id }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, k.name)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", { style: { fontFamily: "var(--mono)", color: "#a5b4fc" } }, k.keyPrefix)), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-muted)" } }, k.userId), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, new Date(k.createdAt).toLocaleDateString()), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`status-badge \${k.revoked ? "status-unreachable" : "status-healthy"}\` }, k.revoked ? "Revoked" : "Active")), /* @__PURE__ */ React.createElement("td", null, !k.revoked && /* @__PURE__ */ React.createElement("button", { className: "btn btn-danger btn-sm", onClick: () => handleRevokeKey(k.id) }, "Revoke")))))))), /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "16px", fontWeight: "700" } }, "Identities & Roles"), /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "User ID"), /* @__PURE__ */ React.createElement("th", null, "Username"), /* @__PURE__ */ React.createElement("th", null, "Role"), /* @__PURE__ */ React.createElement("th", null, "Created At"))), /* @__PURE__ */ React.createElement("tbody", null, users.map((u) => /* @__PURE__ */ React.createElement("tr", { key: u.id }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, u.id)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, "@", u.username)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`role-badge \${u.role === "admin" ? "role-admin" : "role-member"}\` }, u.role)), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, new Date(u.createdAt).toLocaleDateString())))))))), activeTab === "audit" && currentUser.role === "admin" && /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "16px", fontWeight: "700" } }, "Gateway Tool Audit Logs"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)" } }, "Immutable execution trail of all tool invocations across the unified gateway.")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: loadAudit }, "\\u{1F504} Refresh Logs")), /* @__PURE__ */ React.createElement("div", { className: "data-table-wrapper" }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Timestamp"), /* @__PURE__ */ React.createElement("th", null, "User"), /* @__PURE__ */ React.createElement("th", null, "Upstream Server"), /* @__PURE__ */ React.createElement("th", null, "Tool Name"), /* @__PURE__ */ React.createElement("th", null, "Duration"), /* @__PURE__ */ React.createElement("th", null, "Outcome"))), /* @__PURE__ */ React.createElement("tbody", null, auditLogs.map((log) => /* @__PURE__ */ React.createElement("tr", { key: log.id }, /* @__PURE__ */ React.createElement("td", { style: { fontSize: "11px", color: "var(--text-dim)" } }, new Date(log.timestamp).toLocaleTimeString()), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, "@", log.username)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, log.upstreamName)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", { style: { color: "#a5b4fc" } }, log.toolName)), /* @__PURE__ */ React.createElement("td", { style: { fontFamily: "var(--mono)", fontSize: "11px" } }, log.durationMs, "ms"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: \`status-badge \${log.success ? "status-healthy" : "status-unreachable"}\` }, log.success ? "Success" : "Error"))))))))), showAddUpstream && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React.createElement("div", { className: "modal-content" }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "16px", fontWeight: "700", marginBottom: "16px" } }, "Register Streamable HTTP Upstream Server"), /* @__PURE__ */ React.createElement("form", { onSubmit: handleAddUpstream }, /* @__PURE__ */ React.createElement("div", { className: "form-group" }, /* @__PURE__ */ React.createElement("label", null, "Server Display Name"), /* @__PURE__ */ React.createElement("input", { type: "text", required: true, placeholder: "e.g. Analytics MCP Server", value: newUpstream.name, onChange: (e) => setNewUpstream({ ...newUpstream, name: e.target.value }) })), /* @__PURE__ */ React.createElement("div", { className: "form-group" }, /* @__PURE__ */ React.createElement("label", null, "Unique Prefix (Collision Prevention)"), /* @__PURE__ */ React.createElement("input", { type: "text", required: true, placeholder: "e.g. ana", value: newUpstream.prefix, onChange: (e) => setNewUpstream({ ...newUpstream, prefix: e.target.value }) })), /* @__PURE__ */ React.createElement("div", { className: "form-group" }, /* @__PURE__ */ React.createElement("label", null, "Streamable HTTP URL"), /* @__PURE__ */ React.createElement("input", { type: "url", required: true, placeholder: "http://service:3000/mcp", value: newUpstream.url, onChange: (e) => setNewUpstream({ ...newUpstream, url: e.target.value }) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" } }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowAddUpstream(false) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-primary" }, "Register"))))), showNewKeyModal && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React.createElement("div", { className: "modal-content" }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "16px", fontWeight: "700", marginBottom: "16px" } }, "Generate New API Key"), generatedKey ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "#fbbf24", marginBottom: "10px" } }, "\\u26A0\\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, "Important"), ": Copy your API key now. It is hashed immediately and will never be shown again!"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      readOnly: true,
      value: generatedKey,
      style: { width: "100%", padding: "10px", fontFamily: "var(--mono)", fontSize: "12px", background: "var(--code-bg)", border: "1px solid var(--primary)", borderRadius: "8px", color: "#34d399" }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => {
    navigator.clipboard.writeText(generatedKey);
    notify("Copied API Key to clipboard");
  } }, "\\u{1F4CB} Copy Key"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => {
    setShowNewKeyModal(false);
    setGeneratedKey(null);
  } }, "Close"))) : /* @__PURE__ */ React.createElement("form", { onSubmit: handleCreateKey }, /* @__PURE__ */ React.createElement("div", { className: "form-group" }, /* @__PURE__ */ React.createElement("label", null, "Key Name / Description"), /* @__PURE__ */ React.createElement("input", { type: "text", required: true, placeholder: "e.g. Production Claude Desktop Key", value: newKeyName, onChange: (e) => setNewKeyName(e.target.value) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" } }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowNewKeyModal(false) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-primary" }, "Generate"))))));
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
