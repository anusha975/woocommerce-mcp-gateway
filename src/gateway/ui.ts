export function getInteractiveUiHtml(options: {
  serviceName: string;
  version: string;
  authRequired: boolean;
}): string {
  const { serviceName, version } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${serviceName} — Unified MCP Platform Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- React 18 & ReactDOM via CDN with local fallback -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <style>
    :root {
      --bg: #090d16;
      --bg-surface: #0e1424;
      --card-bg: rgba(17, 24, 39, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.12);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.3);
      --accent: #8b5cf6;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.2);
      --warning: #f59e0b;
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.2);
      --code-bg: #040711;
      --radius: 12px;
      --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.1) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(16, 185, 129, 0.04) 0px, transparent 50%);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    #root { display: flex; flex-direction: column; min-height: 100vh; }

    header {
      background: rgba(9, 13, 22, 0.88);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      padding: 14px 28px;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 18px; color: #fff;
      box-shadow: 0 0 20px var(--primary-glow);
    }
    .brand-title {
      font-size: 17px; font-weight: 700; letter-spacing: -0.02em;
      display: flex; align-items: center; gap: 8px;
    }

    .nav-tabs {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255, 255, 255, 0.04);
      padding: 4px; border-radius: 10px;
      border: 1px solid var(--card-border);
    }

    .nav-tab-btn {
      background: transparent; border: none; color: var(--text-muted);
      padding: 7px 14px; border-radius: 7px; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all 0.15s ease;
      display: flex; align-items: center; gap: 6px;
    }
    .nav-tab-btn:hover { color: var(--text); background: rgba(255, 255, 255, 0.06); }
    .nav-tab-btn.active {
      color: #fff; background: var(--primary);
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .header-user-controls { display: flex; align-items: center; gap: 12px; }

    .role-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 9999px; font-size: 11px;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .role-admin { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .role-member { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

    .api-key-input-wrapper { position: relative; display: flex; align-items: center; }
    .api-key-input {
      background: rgba(255, 255, 255, 0.05); border: 1px solid var(--card-border);
      border-radius: 8px; color: var(--text); font-family: var(--mono);
      font-size: 12px; padding: 7px 12px 7px 30px; width: 220px; transition: all 0.2s;
    }
    .api-key-input:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
      background: rgba(255, 255, 255, 0.08);
    }
    .api-key-icon { position: absolute; left: 10px; color: var(--text-dim); font-size: 13px; }

    main {
      flex: 1; max-width: 1400px; width: 100%; margin: 0 auto;
      padding: 24px; display: flex; flex-direction: column; gap: 20px;
    }

    .card {
      background: var(--card-bg); backdrop-filter: blur(12px);
      border: 1px solid var(--card-border); border-radius: var(--radius);
      padding: 22px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }

    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 7px; padding: 8px 16px; border-radius: 8px; font-size: 13px;
      font-weight: 600; cursor: pointer; border: none; transition: all 0.15s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff; box-shadow: 0 3px 12px var(--primary-glow);
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px var(--primary-glow); }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.07); color: var(--text);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
    .btn-danger {
      background: rgba(239, 68, 68, 0.15); color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.25); }
    .btn-sm { padding: 5px 10px; font-size: 11px; }

    /* Tables */
    .data-table-wrapper { overflow-x: auto; margin-top: 12px; }
    table.data-table {
      width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;
    }
    table.data-table th {
      padding: 10px 14px; background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--card-border); color: var(--text-muted);
      font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;
    }
    table.data-table td {
      padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text); vertical-align: middle;
    }
    table.data-table tr:hover td { background: rgba(255, 255, 255, 0.02); }

    /* Badges */
    .status-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
      border-radius: 999px; font-size: 11px; font-weight: 600;
    }
    .status-healthy { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-unreachable { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .status-disabled { background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.3); }

    /* Chat view styles */
    .chat-layout { display: flex; flex-direction: column; height: 680px; }
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex;
      flex-direction: column; gap: 16px;
    }
    .chat-bubble {
      max-width: 80%; padding: 14px 18px; border-radius: 14px;
      font-size: 14px; line-height: 1.6; position: relative;
    }
    .chat-bubble-user {
      align-self: flex-end; background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff; border-bottom-right-radius: 4px; box-shadow: 0 4px 12px var(--primary-glow);
    }
    .chat-bubble-assistant {
      align-self: flex-start; background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border); color: #e5e7eb; border-bottom-left-radius: 4px;
    }
    .tool-call-card {
      margin-top: 10px; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px; padding: 10px; font-family: var(--mono); font-size: 11px;
    }
    .tool-call-header {
      display: flex; justify-content: space-between; align-items: center;
      color: #a5b4fc; font-weight: 600; cursor: pointer;
    }
    .chat-input-bar {
      display: flex; gap: 10px; padding: 14px 16px;
      border-top: 1px solid var(--card-border); background: rgba(255, 255, 255, 0.02);
    }
    .chat-input-field {
      flex: 1; background: var(--code-bg); border: 1px solid var(--card-border);
      border-radius: 8px; padding: 10px 14px; color: #fff; font-family: var(--font);
      font-size: 14px;
    }
    .chat-input-field:focus { outline: none; border-color: var(--primary); }

    /* Modals */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content {
      background: #0f1627; border: 1px solid var(--card-border);
      border-radius: var(--radius); width: 100%; max-width: 520px; padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
    .form-group input, .form-group select, .form-group textarea {
      background: var(--code-bg); border: 1px solid var(--card-border);
      border-radius: 8px; padding: 8px 12px; color: var(--text); font-family: var(--font);
      font-size: 13px;
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary); }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- React 18 Application Script -->
  <script type="text/babel">
    const { useState, useEffect, useRef } = React;

    function MCPApp() {
      const [activeTab, setActiveTab] = useState('chat');
      const [apiKey, setApiKey] = useState(localStorage.getItem('mcp_api_key') || 'gw_sec_dev_local_key_123');
      const [currentUser, setCurrentUser] = useState({ username: 'admin', role: 'admin' });
      const [upstreams, setUpstreams] = useState([]);
      const [tools, setTools] = useState([]);
      const [auditLogs, setAuditLogs] = useState([]);
      const [apiKeys, setApiKeys] = useState([]);
      const [users, setUsers] = useState([]);
      const [loading, setLoading] = useState(false);
      const [notification, setNotification] = useState(null);

      // Chat state
      const [chatMessages, setChatMessages] = useState([
        {
          role: 'assistant',
          content: 'Hello! I am your **WooCommerce MCP Gateway Assistant**. I can help you inspect products, query recent orders, check warehouse stock, or look up customer support data through unified MCP tools.',
          toolsCalled: [],
        }
      ]);
      const [chatInput, setChatInput] = useState('');
      const [chatSending, setChatSending] = useState(false);

      // Tool runner state
      const [selectedTool, setSelectedTool] = useState(null);
      const [toolArgs, setToolArgs] = useState({});
      const [toolResult, setToolResult] = useState(null);
      const [executingTool, setExecutingTool] = useState(false);

      // Modal state
      const [showAddUpstream, setShowAddUpstream] = useState(false);
      const [newUpstream, setNewUpstream] = useState({ name: '', prefix: '', url: 'http://127.0.0.1:3000/upstream/inventory/mcp', transport: 'streamable-http' });
      const [showNewKeyModal, setShowNewKeyModal] = useState(false);
      const [generatedKey, setGeneratedKey] = useState(null);
      const [newKeyName, setNewKeyName] = useState('New Agent Key');

      const messagesEndRef = useRef(null);

      const notify = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
      };

      const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': apiKey ? \`Bearer \${apiKey.trim()}\` : '',
      });

      // Load active session
      useEffect(() => {
        if (!apiKey) return;
        localStorage.setItem('mcp_api_key', apiKey);
        fetch('/api/auth/me', { headers: getHeaders() })
          .then((r) => r.json())
          .then((data) => {
            if (data.user) setCurrentUser(data.user);
          })
          .catch(() => {});
      }, [apiKey]);

      // Load data based on active tab
      useEffect(() => {
        if (activeTab === 'upstreams') loadUpstreams();
        if (activeTab === 'tools') loadTools();
        if (activeTab === 'audit' && currentUser.role === 'admin') loadAudit();
        if (activeTab === 'keys' && currentUser.role === 'admin') loadKeysAndUsers();
      }, [activeTab, apiKey]);

      const loadUpstreams = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/upstreams', { headers: getHeaders() });
          if (res.ok) setUpstreams(await res.json());
        } finally { setLoading(false); }
      };

      const loadTools = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/tools', { headers: getHeaders() });
          if (res.ok) {
            const data = await res.json();
            setTools(data);
            if (data.length > 0 && !selectedTool) setSelectedTool(data[0]);
          }
        } finally { setLoading(false); }
      };

      const loadAudit = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/audit?limit=50', { headers: getHeaders() });
          if (res.ok) setAuditLogs(await res.json());
        } finally { setLoading(false); }
      };

      const loadKeysAndUsers = async () => {
        setLoading(true);
        try {
          const [kRes, uRes] = await Promise.all([
            fetch('/api/keys', { headers: getHeaders() }),
            fetch('/api/users', { headers: getHeaders() })
          ]);
          if (kRes.ok) setApiKeys(await kRes.json());
          if (uRes.ok) setUsers(await uRes.json());
        } finally { setLoading(false); }
      };

      // Chat send message
      const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const text = chatInput.trim();
        if (!text || chatSending) return;

        const userMsg = { role: 'user', content: text };
        setChatMessages((prev) => [...prev, userMsg]);
        setChatInput('');
        setChatSending(true);

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              message: text,
              history: chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Chat request failed');
          }

          const data = await res.json();
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: data.reply,
              toolsCalled: data.toolsCalled || [],
              durationMs: data.durationMs,
            }
          ]);
        } catch (err) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: \`⚠️ **Error processing request**: \${err.message}\`,
              toolsCalled: [],
            }
          ]);
        } finally {
          setChatSending(false);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      };

      // Upstream actions
      const handleToggleUpstream = async (id, currentEnabled) => {
        try {
          const res = await fetch(\`/api/upstreams/\${id}\`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ enabled: !currentEnabled }),
          });
          if (res.ok) {
            notify(\`Upstream server \${!currentEnabled ? 'enabled' : 'disabled'}\`);
            loadUpstreams();
          }
        } catch { notify('Failed to toggle upstream', 'error'); }
      };

      const handleCheckHealth = async (id) => {
        try {
          const res = await fetch(\`/api/upstreams/\${id}/health\`, {
            method: 'POST',
            headers: getHeaders(),
          });
          const data = await res.json();
          notify(\`Health check: \${data.status} (\${data.latencyMs}ms)\`, data.status === 'healthy' ? 'success' : 'error');
          loadUpstreams();
        } catch { notify('Health check failed', 'error'); }
      };

      const handleAddUpstream = async (e) => {
        e.preventDefault();
        try {
          const res = await fetch('/api/upstreams', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(newUpstream),
          });
          if (res.ok) {
            notify('Registered new upstream server');
            setShowAddUpstream(false);
            setNewUpstream({ name: '', prefix: '', url: '', transport: 'streamable-http' });
            loadUpstreams();
          } else {
            const err = await res.json();
            notify(err.error || 'Registration failed', 'error');
          }
        } catch { notify('Error registering upstream', 'error'); }
      };

      const handleDeleteUpstream = async (id) => {
        if (!confirm('Are you sure you want to remove this upstream server?')) return;
        try {
          const res = await fetch(\`/api/upstreams/\${id}\`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (res.ok) {
            notify('Upstream server deleted');
            loadUpstreams();
          }
        } catch { notify('Failed to delete upstream', 'error'); }
      };

      // API Key actions
      const handleCreateKey = async (e) => {
        e.preventDefault();
        try {
          const res = await fetch('/api/keys', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId: currentUser.id || 'usr_admin_seed', name: newKeyName }),
          });
          if (res.ok) {
            const data = await res.json();
            setGeneratedKey(data.rawKey);
            loadKeysAndUsers();
          }
        } catch { notify('Failed to create key', 'error'); }
      };

      const handleRevokeKey = async (id) => {
        if (!confirm('Revoke this API key? Authenticated clients will immediately be denied.')) return;
        try {
          const res = await fetch(\`/api/keys/\${id}\`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (res.ok) {
            notify('API key revoked successfully');
            loadKeysAndUsers();
          }
        } catch { notify('Failed to revoke key', 'error'); }
      };

      // Execute tool
      const handleRunTool = async () => {
        if (!selectedTool) return;
        setExecutingTool(true);
        setToolResult(null);
        try {
          const res = await fetch('/mcp', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'tools/call',
              params: {
                name: selectedTool.name,
                arguments: toolArgs,
              },
            }),
          });
          const data = await res.json();
          setToolResult(data);
        } catch (err) {
          setToolResult({ error: err.message });
        } finally {
          setExecutingTool(false);
        }
      };

      return (
        <div>
          {/* Header */}
          <header>
            <div className="brand">
              <div className="brand-icon">⚡</div>
              <div className="brand-title">
                ${serviceName}
                <span className="role-badge role-admin">v${version}</span>
              </div>
            </div>

            <nav className="nav-tabs">
              <button className={\`nav-tab-btn \${activeTab === 'chat' ? 'active' : ''}\`} onClick={() => setActiveTab('chat')}>
                🤖 Chat Agent
              </button>
              <button className={\`nav-tab-btn \${activeTab === 'upstreams' ? 'active' : ''}\`} onClick={() => setActiveTab('upstreams')}>
                🌐 Upstreams ({upstreams.length || 3})
              </button>
              <button className={\`nav-tab-btn \${activeTab === 'tools' ? 'active' : ''}\`} onClick={() => setActiveTab('tools')}>
                🛠️ Tools Catalog
              </button>
              {currentUser.role === 'admin' && (
                <>
                  <button className={\`nav-tab-btn \${activeTab === 'keys' ? 'active' : ''}\`} onClick={() => setActiveTab('keys')}>
                    🔑 API Keys
                  </button>
                  <button className={\`nav-tab-btn \${activeTab === 'audit' ? 'active' : ''}\`} onClick={() => setActiveTab('audit')}>
                    📋 Audit Logs
                  </button>
                </>
              )}
            </nav>

            <div className="header-user-controls">
              <span className={\`role-badge \${currentUser.role === 'admin' ? 'role-admin' : 'role-member'}\`}>
                @{currentUser.username} ({currentUser.role})
              </span>
              <div className="api-key-input-wrapper">
                <span className="api-key-icon">🔒</span>
                <input
                  type="password"
                  className="api-key-input"
                  placeholder="Bearer API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  title="Session API Key for authenticated requests"
                />
              </div>
            </div>
          </header>

          {/* Toast Notification */}
          {notification && (
            <div style={{
              position: 'fixed', top: '75px', right: '28px', zIndex: 1000,
              background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
              color: '#fff', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {notification.msg}
            </div>
          )}

          {/* Main Content Area */}
          <main>
            {/* 1. CHAT AGENT TAB */}
            {activeTab === 'chat' && (
              <div className="card chat-layout">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '700' }}>AI Store Chat Agent</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Executes live tools through the unified MCP Gateway across all registered upstream servers.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setChatInput("List today's store orders")}>
                      📦 Orders
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setChatInput("Check warehouse stock for SKU WOO-HOODIE")}>
                      🏭 Warehouse
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setChatInput('Create a product called Organic Coffee Beans with price 19.99')}>
                      🛍️ New Product
                    </button>
                  </div>
                </div>

                <div className="chat-messages">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={\`chat-bubble \${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}\`}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                      {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: '600', textTransform: 'uppercase' }}>
                            ⚡ Tools Called ({msg.toolsCalled.length}):
                          </span>
                          {msg.toolsCalled.map((tc, tcIdx) => (
                            <div key={tcIdx} className="tool-call-card">
                              <div className="tool-call-header">
                                <span>{tc.tool}</span>
                                <span style={{ color: tc.success ? '#34d399' : '#f87171' }}>
                                  {tc.durationMs}ms · {tc.success ? 'Success' : 'Error'}
                                </span>
                              </div>
                              <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af' }}>
                                <strong>Args:</strong> {JSON.stringify(tc.arguments)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatSending && (
                    <div className="chat-bubble chat-bubble-assistant" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                      ⚡ Executing tool calling loop through gateway...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="chat-input-bar">
                  <input
                    type="text"
                    className="chat-input-field"
                    placeholder="Ask about products, orders, physical stock, or returns..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatSending}
                  />
                  <button type="submit" className="btn btn-primary" disabled={chatSending || !chatInput.trim()}>
                    {chatSending ? 'Calling...' : 'Send'}
                  </button>
                </form>
              </div>
            )}

            {/* 2. UPSTREAMS TAB */}
            {activeTab === 'upstreams' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Registered Upstream MCP Servers</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aggregated upstream servers with isolation, prefix routing, and health probes.</p>
                  </div>
                  {currentUser.role === 'admin' && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddUpstream(true)}>
                      + Register Upstream
                    </button>
                  )}
                </div>

                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Prefix</th>
                        <th>Server Name</th>
                        <th>Target URL</th>
                        <th>Transport</th>
                        <th>Status</th>
                        <th>Last Checked</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upstreams.map((ups) => (
                        <tr key={ups.id}>
                          <td><code style={{ color: '#a5b4fc', fontWeight: '700' }}>{ups.prefix}__</code></td>
                          <td><strong>{ups.name}</strong></td>
                          <td><span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{ups.url}</span></td>
                          <td><span style={{ fontSize: '11px', textTransform: 'uppercase' }}>{ups.transport}</span></td>
                          <td>
                            <span className={\`status-badge status-\${ups.status || 'healthy'}\`}>
                              ● {ups.status || 'healthy'} {ups.latencyMs ? \`(\${ups.latencyMs}ms)\` : ''}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {ups.lastCheckedAt ? new Date(ups.lastCheckedAt).toLocaleTimeString() : 'Never'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleCheckHealth(ups.id)}>
                                Ping
                              </button>
                              {currentUser.role === 'admin' && (
                                <>
                                  <button
                                    className={\`btn btn-sm \${ups.enabled ? 'btn-secondary' : 'btn-primary'}\`}
                                    onClick={() => handleToggleUpstream(ups.id, ups.enabled)}
                                  >
                                    {ups.enabled ? 'Disable' : 'Enable'}
                                  </button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUpstream(ups.id)}>
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. TOOLS CATALOG TAB */}
            {activeTab === 'tools' && (
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Available Tools ({tools.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '600px', overflowY: 'auto' }}>
                    {tools.map((t) => (
                      <div
                        key={t.name}
                        onClick={() => { setSelectedTool(t); setToolArgs({}); setToolResult(null); }}
                        style={{
                          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                          background: selectedTool?.name === t.name ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                          border: selectedTool?.name === t.name ? '1px solid var(--primary)' : '1px solid transparent',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', color: selectedTool?.name === t.name ? '#a5b4fc' : '#e5e7eb' }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description || 'No description provided.'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  {selectedTool ? (
                    <div>
                      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h2 style={{ fontSize: '18px', fontFamily: 'var(--mono)', color: '#fff' }}>{selectedTool.name}</h2>
                          <span className="role-badge role-admin">{selectedTool.upstreamName || 'Aggregated'}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>{selectedTool.description}</p>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}>
                          Input Arguments (JSON):
                        </h4>
                        <textarea
                          rows="4"
                          style={{ width: '100%', background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px', color: '#fff', fontFamily: 'var(--mono)', fontSize: '12px' }}
                          value={JSON.stringify(toolArgs, null, 2)}
                          onChange={(e) => {
                            try { setToolArgs(JSON.parse(e.target.value)); } catch {}
                          }}
                        />
                      </div>

                      <button className="btn btn-primary" onClick={handleRunTool} disabled={executingTool}>
                        {executingTool ? 'Executing Tool...' : '⚡ Execute Tool'}
                      </button>

                      {toolResult && (
                        <div style={{ marginTop: '20px' }}>
                          <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}>
                            Tool Response:
                          </h4>
                          <pre style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px', fontSize: '12px', color: '#34d399', overflowX: 'auto', maxHeight: '350px' }}>
                            {JSON.stringify(toolResult, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Select a tool from the catalog to inspect schema and test.</div>
                  )}
                </div>
              </div>
            )}

            {/* 4. API KEYS & USERS TAB (Admin only) */}
            {activeTab === 'keys' && currentUser.role === 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: '700' }}>API Key Management</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cryptographically hashed API keys for external MCP clients and agents. Revocation is instant.</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowNewKeyModal(true)}>
                      + Create API Key
                    </button>
                  </div>

                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Key Name</th>
                          <th>Key Prefix</th>
                          <th>User ID</th>
                          <th>Created</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map((k) => (
                          <tr key={k.id}>
                            <td><strong>{k.name}</strong></td>
                            <td><code style={{ fontFamily: 'var(--mono)', color: '#a5b4fc' }}>{k.keyPrefix}</code></td>
                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{k.userId}</td>
                            <td style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                            <td>
                              <span className={\`status-badge \${k.revoked ? 'status-unreachable' : 'status-healthy'}\`}>
                                {k.revoked ? 'Revoked' : 'Active'}
                              </span>
                            </td>
                            <td>
                              {!k.revoked && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleRevokeKey(k.id)}>
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Identities & Roles</h2>
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Username</th>
                          <th>Role</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td><code>{u.id}</code></td>
                            <td><strong>@{u.username}</strong></td>
                            <td><span className={\`role-badge \${u.role === 'admin' ? 'role-admin' : 'role-member'}\`}>{u.role}</span></td>
                            <td style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. AUDIT LOGS TAB (Admin only) */}
            {activeTab === 'audit' && currentUser.role === 'admin' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Gateway Tool Audit Logs</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Immutable execution trail of all tool invocations across the unified gateway.</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={loadAudit}>
                    🔄 Refresh Logs
                  </button>
                </div>

                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Upstream Server</th>
                        <th>Tool Name</th>
                        <th>Duration</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td><code>@{log.username}</code></td>
                          <td><strong>{log.upstreamName}</strong></td>
                          <td><code style={{ color: '#a5b4fc' }}>{log.toolName}</code></td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>{log.durationMs}ms</td>
                          <td>
                            <span className={\`status-badge \${log.success ? 'status-healthy' : 'status-unreachable'}\`}>
                              {log.success ? 'Success' : 'Error'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>

          {/* Modal: Add Upstream */}
          {showAddUpstream && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Register Streamable HTTP Upstream Server</h3>
                <form onSubmit={handleAddUpstream}>
                  <div className="form-group">
                    <label>Server Display Name</label>
                    <input type="text" required placeholder="e.g. Analytics MCP Server" value={newUpstream.name} onChange={(e) => setNewUpstream({ ...newUpstream, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Unique Prefix (Collision Prevention)</label>
                    <input type="text" required placeholder="e.g. ana" value={newUpstream.prefix} onChange={(e) => setNewUpstream({ ...newUpstream, prefix: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Streamable HTTP URL</label>
                    <input type="url" required placeholder="http://service:3000/mcp" value={newUpstream.url} onChange={(e) => setNewUpstream({ ...newUpstream, url: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddUpstream(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Register</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: New API Key Result */}
          {showNewKeyModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Generate New API Key</h3>
                {generatedKey ? (
                  <div>
                    <p style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '10px' }}>
                      ⚠️ <strong>Important</strong>: Copy your API key now. It is hashed immediately and will never be shown again!
                    </p>
                    <input
                      type="text"
                      readOnly
                      value={generatedKey}
                      style={{ width: '100%', padding: '10px', fontFamily: 'var(--mono)', fontSize: '12px', background: 'var(--code-bg)', border: '1px solid var(--primary)', borderRadius: '8px', color: '#34d399' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                      <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(generatedKey); notify('Copied API Key to clipboard'); }}>
                        📋 Copy Key
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setShowNewKeyModal(false); setGeneratedKey(null); }}>
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateKey}>
                    <div className="form-group">
                      <label>Key Name / Description</label>
                      <input type="text" required placeholder="e.g. Production Claude Desktop Key" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowNewKeyModal(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Generate</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<MCPApp />);
  </script>
</body>
</html>`;
}
