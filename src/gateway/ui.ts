// Production-compiled React 18 Admin Dashboard
// Redesigned with clean Green & White theme for Urumi AI FDE Internship: Team MCP Gateway on Kubernetes
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
  <title>${serviceName} — Unified MCP Platform Dashboard</title>
  
  <!-- Google Fonts: Plus Jakarta Sans + Inter + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
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
      /* Clean Green and White Aesthetic */
      --bg: #F7FAF7;
      --bg-surface: #FFFFFF;
      --card-bg: #FFFFFF;
      --card-border: #E2E8F0;
      --card-hover: #CBD5E1;
      
      --primary: #166534;
      --primary-hover: #14532D;
      --primary-light: #F0FDF4;
      --primary-border: #BBF7D0;
      --primary-glow: rgba(22, 101, 52, 0.2);
      
      --accent: #15803D;
      --accent-glow: rgba(21, 128, 61, 0.2);
      
      --text: #0F172A;
      --text-muted: #475569;
      --text-dim: #94A3B8;
      
      --success: #16A34A;
      --success-bg: #DCFCE7;
      --success-border: #86EFAC;
      
      --warning: #D97706;
      --warning-bg: #FEF3C7;
      --warning-border: #FDE68A;
      
      --danger: #DC2626;
      --danger-bg: #FEE2E2;
      --danger-border: #FECACA;
      
      --code-bg: #F8FAF8;
      --code-color: #166534;
      --code-border: #E2E8F0;
      
      --radius: 14px;
      --radius-sm: 8px;
      --radius-pill: 9999px;
      
      --font: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(22, 101, 52, 0.05) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(34, 197, 94, 0.04) 0px, transparent 45%),
        radial-gradient(at 100% 100%, rgba(22, 101, 52, 0.04) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(240, 253, 244, 0.8) 0px, transparent 50%);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    #root { display: flex; flex-direction: column; min-height: 100vh; }

    /* Header */
    header {
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      padding: 14px 32px;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px; color: #FFFFFF;
      box-shadow: 0 4px 12px var(--primary-glow);
    }
    .brand-title {
      font-size: 17px; font-weight: 700; letter-spacing: -0.01em;
      display: flex; align-items: center; gap: 10px; color: var(--text);
    }

    /* Nav Tabs Segments (Green and White Theme) */
    .nav-tabs {
      display: flex; align-items: center; gap: 4px;
      background: #F1F5F1;
      padding: 4px; border-radius: 12px;
      border: 1px solid #E2E8F0;
    }

    .nav-tab-btn {
      background: transparent; border: none; color: var(--text-muted);
      padding: 8px 18px; border-radius: 9px; font-size: 13px; font-weight: 600;
      font-family: var(--font); cursor: pointer; transition: all 0.18s ease;
      display: flex; align-items: center; gap: 7px;
    }
    .nav-tab-btn:hover { color: var(--primary); background: rgba(255, 255, 255, 0.7); }
    .nav-tab-btn.active {
      color: #FFFFFF;
      background: var(--primary);
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .header-user-controls { display: flex; align-items: center; gap: 14px; }

    /* Role Badges */
    .role-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: var(--radius-pill); font-size: 11px;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .role-admin {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--primary-border);
    }
    .role-member {
      background: #F1F5F9;
      color: var(--text-muted);
      border: 1px solid #E2E8F0;
    }

    /* API Key Input Field */
    .api-key-input-wrapper { position: relative; display: flex; align-items: center; }
    .api-key-input {
      background: #FFFFFF; border: 1px solid #CBD5E1;
      border-radius: var(--radius-pill); color: var(--text); font-family: var(--mono);
      font-size: 12px; padding: 7px 14px 7px 32px; width: 220px; transition: all 0.2s;
    }
    .api-key-input:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
      background: #FFFFFF;
    }
    .api-key-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; }

    /* Main Container */
    main {
      flex: 1; max-width: 1400px; width: 100%; margin: 0 auto;
      padding: 28px; display: flex; flex-direction: column; gap: 24px;
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 26px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      border-color: var(--primary-border);
      box-shadow: 0 6px 24px rgba(22, 101, 52, 0.06);
    }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 7px; padding: 9px 20px; border-radius: var(--radius-pill); font-size: 13px;
      font-weight: 600; cursor: pointer; border: none; font-family: var(--font);
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: var(--primary);
      color: #FFFFFF;
      box-shadow: 0 3px 10px var(--primary-glow);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 5px 14px var(--primary-glow);
    }
    .btn-secondary {
      background: var(--primary-light); color: var(--primary);
      border: 1px solid var(--primary-border);
    }
    .btn-secondary:hover {
      background: #DCFCE7;
      transform: translateY(-1px);
    }
    .btn-danger {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid var(--danger-border);
    }
    .btn-danger:hover {
      background: #FEE2E2;
      color: #991B1B;
    }
    .btn-sm { padding: 6px 14px; font-size: 12px; }

    /* Tables */
    .data-table-wrapper {
      overflow-x: auto; margin-top: 16px;
      border-radius: 12px;
      border: 1px solid var(--card-border);
      background: #FFFFFF;
    }
    table.data-table {
      width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;
    }
    table.data-table th {
      padding: 13px 16px;
      background: #F8FAF8;
      border-bottom: 1px solid var(--card-border);
      color: var(--text-muted);
      font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em;
    }
    table.data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #F1F5F9;
      color: var(--text); vertical-align: middle;
    }
    table.data-table tr:hover td {
      background: #F0FDF4;
    }

    /* Badges */
    .status-badge {
      display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px;
      border-radius: var(--radius-pill); font-size: 11px; font-weight: 700;
    }
    .status-healthy {
      background: var(--success-bg); color: var(--success);
      border: 1px solid var(--success-border);
    }
    .status-unreachable {
      background: var(--danger-bg); color: var(--danger);
      border: 1px solid var(--danger-border);
    }
    .status-disabled {
      background: #F1F5F9; color: var(--text-muted);
      border: 1px solid #E2E8F0;
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
      flex: 1; overflow-y: auto; padding: 20px; display: flex;
      flex-direction: column; gap: 18px;
    }
    .chat-bubble {
      max-width: 80%; padding: 15px 22px; border-radius: 18px;
      font-size: 14px; line-height: 1.6; position: relative;
    }
    .chat-bubble-user {
      align-self: flex-end;
      background: var(--primary);
      color: #FFFFFF; border-bottom-right-radius: 4px;
      box-shadow: 0 4px 14px var(--primary-glow);
    }
    .chat-bubble-assistant {
      align-self: flex-start;
      background: #FFFFFF;
      border: 1px solid var(--card-border);
      color: var(--text); border-bottom-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .tool-call-card {
      margin-top: 12px; background: #F0FDF4;
      border: 1px solid var(--primary-border);
      border-radius: 12px; padding: 12px; font-family: var(--mono); font-size: 11px;
    }
    .tool-call-header {
      display: flex; justify-content: space-between; align-items: center;
      color: var(--primary); font-weight: 700; cursor: pointer;
    }
    .chat-input-bar {
      display: flex; gap: 12px; padding: 16px 20px;
      border-top: 1px solid var(--card-border);
      background: #F8FAF8;
      border-radius: 0 0 var(--radius) var(--radius);
    }
    .chat-input-field {
      flex: 1; background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: var(--radius-pill); padding: 12px 20px; color: var(--text); font-family: var(--font);
      font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .chat-input-field:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    /* Modals */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content {
      background: #FFFFFF; border: 1px solid var(--card-border);
      border-radius: var(--radius); width: 100%; max-width: 520px; padding: 28px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-group label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .form-group input, .form-group select, .form-group textarea {
      background: #FFFFFF; border: 1px solid #CBD5E1;
      border-radius: 10px; padding: 10px 14px; color: var(--text); font-family: var(--font);
      font-size: 13px;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }
  </style>
</head>
<body>
  <div id="root">
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;color:#166534;font-size:17px;font-weight:600;">
      ⚡ Loading WooCommerce MCP Gateway Dashboard...
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
  const getHeaders = (extra = {}) => ({
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "Authorization": apiKey ? \`Bearer \${apiKey.trim()}\` : "",
    ...extra
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
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);
  const handleSendMessage = async (e) => {
    e.preventDefault();
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
            content: \`\u274C Error: \${err.error?.message || err.message || "Failed to process chat"}\`,
            toolsCalled: []
          }
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: \`\u274C Network error: \${err.message}\`,
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
        headers: getHeaders({
          "Accept": "application/json, text/event-stream"
        }),
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
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      let data;
      if (contentType.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { jsonrpc: "2.0", error: { code: -32700, message: "Invalid JSON response from gateway" }, id: null };
        }
      } else if (contentType.includes("text/event-stream") || text.includes("data:")) {
        const lines = text.split("\n");
        let parsed = null;
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const dataStr = line.substring(5).trim();
            if (dataStr) {
              try {
                parsed = JSON.parse(dataStr);
                break;
              } catch {}
            }
          }
        }
        data = parsed || { jsonrpc: "2.0", error: { code: -32603, message: "Failed to parse SSE event data from stream" }, id: null };
      } else {
        try {
          data = JSON.parse(text);
        } catch {
          data = { jsonrpc: "2.0", error: { code: res.status, message: text || res.statusText }, id: null };
        }
      }
      setToolResult(data);
      if (!res.ok || data.error) {
        const errMsg = data.error?.message || (typeof data.error === "string" ? data.error : \`HTTP \${res.status}: \${res.statusText}\`);
        notify(\`Tool error: \${errMsg}\`, "error");
      } else if (data.result?.isError) {
        notify("Tool returned an execution failure", "error");
      } else {
        notify(\`Tool '\${selectedTool.name}' executed successfully\`, "success");
      }
    } catch (err) {
      const errObj = { jsonrpc: "2.0", error: { code: -32603, message: err.message }, id: null };
      setToolResult(errObj);
      notify(\`Network error: \${err.message}\`, "error");
    } finally {
      setExecutingTool(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", null, 
    /* Header */
    /* @__PURE__ */ React.createElement("header", null, 
      /* @__PURE__ */ React.createElement("div", { className: "brand" }, 
        /* @__PURE__ */ React.createElement("div", { className: "brand-icon" }, "⚡"), 
        /* @__PURE__ */ React.createElement("div", { className: "brand-title" }, 
          window.__GATEWAY_CONFIG__.serviceName, 
          /* @__PURE__ */ React.createElement("span", { className: "role-badge role-admin" }, ("v" + window.__GATEWAY_CONFIG__.version))
        )
      ), 
      /* @__PURE__ */ React.createElement("nav", { className: "nav-tabs" }, 
        /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "chat" ? "active" : ""}\`, onClick: () => setActiveTab("chat") }, "🤖 Chat Agent"), 
        /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "upstreams" ? "active" : ""}\`, onClick: () => setActiveTab("upstreams") }, "🌐 Upstreams (", upstreams.length || 3, ")"), 
        /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "tools" ? "active" : ""}\`, onClick: () => setActiveTab("tools") }, "🛠️ Tools Catalog"), 
        currentUser.role === "admin" && /* @__PURE__ */ React.createElement(React.Fragment, null, 
          /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "keys" ? "active" : ""}\`, onClick: () => setActiveTab("keys") }, "🔑 API Keys"), 
          /* @__PURE__ */ React.createElement("button", { className: \`nav-tab-btn \${activeTab === "audit" ? "active" : ""}\`, onClick: () => setActiveTab("audit") }, "📋 Audit Logs")
        )
      ), 
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
    notification && /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      top: "85px",
      right: "28px",
      zIndex: 1000,
      background: notification.type === "error" ? "rgba(220, 38, 38, 0.95)" : "rgba(22, 101, 52, 0.95)",
      color: "#FFFFFF",
      padding: "10px 20px",
      borderRadius: "var(--radius-pill)",
      fontSize: "13px",
      fontWeight: "600",
      backdropFilter: "blur(10px)",
      boxShadow: "0 8px 24px rgba(22, 101, 52, 0.25)"
    } }, notification.msg), 
    /* Main Content */
    /* @__PURE__ */ React.createElement("main", null, 
      /* Chat Tab */
      activeTab === "chat" && /* @__PURE__ */ React.createElement("div", { className: "card chat-layout" }, 
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "14px" } }, 
          /* @__PURE__ */ React.createElement("div", null, 
            /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "19px", fontWeight: "700" } }, "AI Store Chat Agent"), 
            /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" } }, "Executes live tools through the unified MCP Gateway across all registered upstream servers.")
          ), 
          /* Quick Action Pills */
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px" } }, 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("List today's store orders") }, "📦 Orders"), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("Check warehouse stock for SKU WOO-HOODIE") }, "🏭 Warehouse"), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setChatInput("Create a product called Organic Coffee Beans with price 19.99") }, "✨ New Product")
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
          chatSending && /* @__PURE__ */ React.createElement("div", { className: "chat-bubble chat-bubble-assistant", style: { fontStyle: "italic", color: "var(--text-muted)" } }, "⚡ Executing tool calling loop through gateway..."), 
          /* @__PURE__ */ React.createElement("div", { ref: messagesEndRef })
        ), 
        /* @__PURE__ */ React.createElement("form", { onSubmit: handleSendMessage, className: "chat-input-bar" }, 
          /* @__PURE__ */ React.createElement("input", {
            type: "text",
            className: "chat-input-field",
            placeholder: "Ask about products, orders, physical stock, or returns...",
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
            /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "19px", fontWeight: "700" } }, "Registered Upstream MCP Servers"), 
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
                /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", { style: { color: "var(--primary)", fontWeight: "700" } }, ups.prefix, "__")), 
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
          /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "13px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" } }, "Available Tools (", tools.length, ")"), 
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
                /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontWeight: "700", color: "var(--text)" } }, selectedTool.name), 
                /* @__PURE__ */ React.createElement("span", { className: "role-badge role-admin" }, selectedTool.upstreamName || "Aggregated")
              ), 
              /* @__PURE__ */ React.createElement("p", { style: { fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" } }, selectedTool.description)
            ), 
            /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "16px" } }, 
              /* @__PURE__ */ React.createElement("h4", { style: { fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "8px" } }, "Input Arguments (JSON):"), 
              /* @__PURE__ */ React.createElement("textarea", {
                rows: "4",
                style: { width: "100%", background: "var(--code-bg)", border: "1px solid var(--card-border)", borderRadius: "10px", padding: "12px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: "12px" },
                value: JSON.stringify(toolArgs, null, 2),
                onChange: (e) => {
                  try {
                    setToolArgs(JSON.parse(e.target.value));
                  } catch {
                  }
                }
              })
            ), 
            /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleRunTool, disabled: executingTool }, executingTool ? "Executing Tool..." : "⚡ Execute Tool"), 
            toolResult && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px" } }, 
              /* @__PURE__ */ React.createElement("h4", { style: { fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: (toolResult.error || toolResult.result?.isError) ? "var(--danger)" : "var(--text-dim)", marginBottom: "8px" } }, 
                (toolResult.error || toolResult.result?.isError) ? "Tool Error Response:" : "Tool Response:"
              ), 
              /* @__PURE__ */ React.createElement("pre", { style: { background: "var(--code-bg)", border: \`1px solid \${(toolResult.error || toolResult.result?.isError) ? "rgba(220, 38, 38, 0.3)" : "var(--card-border)"}\`, borderRadius: "10px", padding: "14px", fontSize: "12px", color: (toolResult.error || toolResult.result?.isError) ? "var(--danger)" : "var(--primary)", overflowX: "auto", maxHeight: "350px" } }, JSON.stringify(toolResult, null, 2))
            )
          ) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px", color: "var(--text-dim)" } }, "Select a tool from the catalog to inspect schema and test.")
        )
      ), 
      /* API Keys Tab */
      activeTab === "keys" && currentUser.role === "admin" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } }, 
        /* @__PURE__ */ React.createElement("div", { className: "card" }, 
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, 
            /* @__PURE__ */ React.createElement("div", null, 
              /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "19px", fontWeight: "700" } }, "API Key Management"), 
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
        /* @__PURE__ */ React.createElement("div", { className: "card" }, 
          /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "19px", fontWeight: "700" } }, "Identities & Roles"), 
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
            /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "19px", fontWeight: "700" } }, "Gateway Tool Audit Logs"), 
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
        /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "18px", fontWeight: "700", marginBottom: "16px" } }, "Register Streamable HTTP Upstream Server"), 
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
        /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "18px", fontWeight: "700", marginBottom: "16px" } }, "Generate New API Key"), 
        generatedKey ? /* @__PURE__ */ React.createElement("div", null, 
          /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: "var(--warning)", marginBottom: "10px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", padding: "10px", borderRadius: "8px" } }, "⚠️ ", /* @__PURE__ */ React.createElement("strong", null, "Important"), ": Copy your API key now. It is hashed immediately and will never be shown again!"), 
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
