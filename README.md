# WooCommerce MCP Gateway

A multi-server Model Context Protocol (MCP) aggregation gateway that connects AI assistants and external MCP clients to WooCommerce e-commerce platforms, warehouse inventory systems, and customer support services through a unified, authenticated interface.

Built with Node.js and TypeScript using the official `@modelcontextprotocol/sdk`, the gateway acts as a secure reverse proxy and tool aggregator. It abstracts disparate backend APIs into standardized MCP tool interfaces, isolates upstream failures, enforces role-based access control with instantaneous API-key revocation, prevents sensitive credential and customer PII leakage, and provides cloud-native deployment configurations for Docker and Kubernetes.

---

## Key Engineering Capabilities

- **Multi-Server Aggregation Gateway:** Unifies three distinct upstream domains—WooCommerce store operations, warehouse inventory management, and customer support CRM—into a single MCP endpoint (`/mcp` and `/sse`) with namespace isolation (`wc__`, `inv__`, `sup__`).
- **Dual MCP Transports:** Implements both modern stateless **Streamable HTTP** (`POST /mcp` under protocol version `2024-11-05`) for horizontal Kubernetes scaling and traditional **Server-Sent Events** (`GET /sse` and `POST /messages`) for backward compatibility.
- **Dynamic Tool Discovery & Lifecycle Management:** Supports runtime registration, enabling, and disabling of upstream servers via administrative REST APIs, dynamically synchronizing tool catalogs without requiring gateway restarts.
- **Failure Isolation & Fault Tolerance:** Isolates downstream callers from upstream outages. If a backend service crashes or times out, the gateway returns a structured `{ isError: true }` MCP ToolResult without interrupting unaffected upstreams or crashing the gateway process.
- **Zero-Trust Access Control & Key Revocation:** Implements SHA-256 hashed API keys with role-based authorization (`admin` vs `member`). Key revocation takes effect immediately across all active transports and sessions.
- **Audit Logging & Privacy Safeguards:** Generates an immutable audit trail capturing user identity, tool name, execution latency, and outcome. Automatically scrubs customer PII (phone numbers, email addresses, street addresses) and redacts secrets from logs and error messages.
- **Embedded Administrative Dashboard & AI Chat Agent:** Features a self-hosted React 18 administration console (`/ui`) and an AI chat assistant (`/api/chat`) with dual-mode execution (OpenAI function calling or local deterministic tool execution).
- **Cloud-Native Deployment:** Multi-stage Alpine container image running as an unprivileged user (`node:node`), hardened Kubernetes manifests (`k8s/`) enforcing `readOnlyRootFilesystem: true`, and a production-grade Helm chart (`helm/woocommerce-mcp`).

---

## Technology Stack

| Layer | Technologies | Role in System |
| :--- | :--- | :--- |
| **Runtime & Language** | Node.js 22 LTS, TypeScript 5.7 | Strict ESM compilation (`tsconfig.build.json`), native fetch, `node:crypto` |
| **MCP Implementation** | `@modelcontextprotocol/sdk` (v1.6.0) | Protocol handshake, Streamable HTTP and SSE transports, tool dispatching |
| **HTTP Framework** | Express 5.2 | Routing, middleware pipeline, rate limiting, and diagnostic endpoints |
| **Validation & Schema** | Zod 3.24 | Tool input schemas, environment variable parsing, and domain constraints |
| **Observability & Logging** | Pino 9.6, Pino-Pretty | Structured JSON logging with path-based and regex secret redaction |
| **Administrative UI** | React 18 (pre-compiled JSX) | Embedded responsive management console and chat interface served at `/ui` |
| **Storage & Persistence** | Atomic JSON File Store (`JsonStore`) | Synchronous disk-backed state for users, API keys, upstreams, and audit logs |
| **Automated Testing** | Vitest 3.0, TypeScript strict, ESLint 9 | 143 automated unit, integration, resilience, and acceptance test cases |
| **Container & Orchestration** | Docker, Kubernetes, Helm 3.12 | Multi-stage unprivileged image, Kustomize manifests, modular Helm chart |

---

## Table of Contents

1. [Architecture](#architecture)
   - [System Design](#system-design)
   - [Upstream Services & Namespacing](#upstream-services--namespacing)
2. [Important Engineering Decisions](#important-engineering-decisions)
   - [MCP Transports & Session Management](#mcp-transports--session-management)
   - [Upstream Failure Isolation](#upstream-failure-isolation)
   - [Input Validation, Sanitization & PII Stripping](#input-validation-sanitization--pii-stripping)
   - [Authentication, RBAC & Immediate Key Revocation](#authentication-rbac--immediate-key-revocation)
   - [Audit Trail & Data Masking](#audit-trail--data-masking)
   - [Container & Pod Security Hardening](#container--pod-security-hardening)
   - [Architectural Tradeoffs & Known Limitations](#architectural-tradeoffs--known-limitations)
3. [Reproducible Quick Start](#reproducible-quick-start)
   - [Prerequisites](#prerequisites)
   - [Installation & Setup](#installation--setup)
   - [Environment Configuration](#environment-configuration)
   - [Running Locally](#running-locally)
   - [Accessing the Dashboard](#accessing-the-dashboard)
4. [MCP Client Usage & Protocol Endpoints](#mcp-client-usage--protocol-endpoints)
   - [Gateway Endpoints](#gateway-endpoints)
   - [Connecting via MCP Inspector](#connecting-via-mcp-inspector)
   - [Connecting Claude Desktop & Cursor](#connecting-claude-desktop--cursor)
   - [Direct HTTP Invocations (cURL Examples)](#direct-http-invocations-curl-examples)
   - [Available MCP Tools Catalog](#available-mcp-tools-catalog)
   - [Representative Tool Call Payload](#representative-tool-call-payload)
5. [Testing & Verification Quality](#testing--verification-quality)
   - [Automated Test Pyramid](#automated-test-pyramid)
   - [Running Verification Commands](#running-verification-commands)
   - [End-to-End Acceptance Scenarios Matrix (Scenarios A–G)](#end-to-end-acceptance-scenarios-matrix-scenarios-a-g)
   - [Automated vs Live Environment Status](#automated-vs-live-environment-status)
6. [Docker & Kubernetes Deployment](#docker--kubernetes-deployment)
   - [Building & Running the Docker Container](#building--running-the-docker-container)
   - [Option A: Deploying via Kubernetes Manifests (k8s/)](#option-a-deploying-via-kubernetes-manifests-k8s)
   - [Option B: Deploying via Helm Chart (helm/woocommerce-mcp)](#option-b-deploying-via-helm-chart-helmwoocommerce-mcp)
   - [Cluster Inspection & Rollout Verification](#cluster-inspection--rollout-verification)
   - [Helm Chart Validation](#helm-chart-validation)
7. [Honest Limitations & Tradeoffs](#honest-limitations--tradeoffs)
8. [Troubleshooting](#troubleshooting)
9. [Project Structure & References](#project-structure--references)

---

## Architecture

### System Design

The gateway functions as an intermediary layer between AI agents and e-commerce infrastructure. It decouples the AI client from upstream protocol differences, handles authentication and rate limiting at the ingress boundary, normalizes disparate tools into standard MCP schemas, and audits all interactions.

```mermaid
graph TD
    subgraph Clients["Clients & AI Consumers"]
        Inspector["MCP Inspector / CLI"]
        Claude["Claude Desktop / Cursor"]
        Agent["Built-in AI Chat Agent"]
    end

    subgraph Boundary["Gateway Ingress Boundary (Express HTTP)"]
        AuthMiddleware["Auth Middleware\n(SHA-256 Key Verification & Role Check)"]
        RateLimiter["Rate Limiting\n(Sliding Window Token Bucket)"]
        BodyParser["Body Parser & CORS\n(Max 1MB, Sanitized Origins)"]
        Probes["Health Probes\n(GET /healthz, GET /readyz)"]
        UI["Dashboard & Chat\n(GET /ui, POST /api/chat)"]
    end

    subgraph Transports["MCP Protocol Transports (@modelcontextprotocol/sdk)"]
        StreamableTransport["Streamable HTTP Transport\n(POST /mcp — Protocol: 2024-11-05)"]
        SSETransport["Server-Sent Events Transport\n(GET /sse & POST /messages)"]
    end

    subgraph Core["Core Aggregator & Domain Services"]
        Aggregator["McpAggregator\n(Dynamic Discovery & Namespacing)"]
        UpstreamService["UpstreamService\n(Health & State Management)"]
        AuthService["AuthService\n(Users, Roles & Key Revocation)"]
        AuditService["AuditService\n(Zero-Leakage Logging Engine)"]
        JsonStore["JsonStore\n(Atomic Disk Persistence: data/store.json)"]
    end

    subgraph Upstreams["Upstream Services"]
        WcServer["WooCommerce MCP Server\n(REST API v3 / Sandbox Fallback)"]
        InvServer["Warehouse Inventory Server\n(Physical Stock, Bins, Reorder Points)"]
        SupServer["Customer Support Server\n(CSAT Scores, RMAs, VIP Loyalty)"]
    end

    subgraph ExternalStore["Target Infrastructure"]
        LiveStore["WooCommerce WordPress Store\n(https://your-store.com/wp-json/wc/v3)"]
    end

    %% Client flows
    Inspector -->|Streamable HTTP or SSE| AuthMiddleware
    Claude -->|Streamable HTTP POST /mcp| AuthMiddleware
    Agent -->|REST POST /api/chat| AuthMiddleware

    %% Middleware pipeline
    AuthMiddleware --> RateLimiter
    RateLimiter --> BodyParser
    BodyParser --> StreamableTransport
    BodyParser --> SSETransport
    BodyParser --> UI

    %% Transport to Aggregator
    StreamableTransport --> Aggregator
    SSETransport --> Aggregator

    %% Core Services interaction
    Aggregator --> UpstreamService
    Aggregator --> AuditService
    AuthService --> JsonStore
    UpstreamService --> JsonStore
    AuditService --> JsonStore

    %% Upstream dispatch
    Aggregator -->|wc__* tools| WcServer
    Aggregator -->|inv__* tools| InvServer
    Aggregator -->|sup__* tools| SupServer

    %% External connection
    WcServer -->|HTTPS Basic Auth + PII Stripping| LiveStore
```

### Upstream Services & Namespacing

To prevent tool collisions across services, the gateway employs explicit namespacing:

| Upstream Service | Prefix | Tools Provided | Upstream Transport |
| :--- | :---: | :--- | :--- |
| **WooCommerce Store** | `wc` | 12 tools (catalog discovery, orders, inventory levels, store health, status updates) | REST API v3 via HTTPS Basic Auth (`/wp-json/wc/v3`) |
| **Warehouse Inventory** | `inv` | 3 tools (`inv__check_warehouse_stock`, `inv__list_suppliers`, `inv__calculate_reorder_point`) | In-memory MCP Server / Streamable HTTP (`/upstream/inventory/mcp`) |
| **Customer Support CRM** | `sup` | 3 tools (`sup__get_vip_status`, `sup__initiate_return_request`, `sup__get_customer_satisfaction`) | In-memory MCP Server / Streamable HTTP (`/upstream/support/mcp`) |

When an upstream service is disabled by an administrator via `PATCH /api/upstreams/:id`, its tools are immediately purged from the MCP tool catalog. Any in-flight requests targeting that prefix return a structured error result.

---

## Important Engineering Decisions

### MCP Transports & Session Management

The gateway exposes two distinct transports from `@modelcontextprotocol/sdk`:

1. **Streamable HTTP (`POST /mcp`):**
   - The primary transport for modern MCP clients and cloud-native deployments.
   - Operates statelessly per request while supporting chunked streaming responses (`text/event-stream`).
   - Scales horizontally across multiple Kubernetes replicas behind standard round-robin ClusterIP load balancers.
   - Includes a session manager that tracks active request counters and a background reaper interval (60-second tick) to close idle sessions older than 30 minutes, preventing resource exhaustion under high client turnover.
2. **Server-Sent Events (`GET /sse` and `POST /messages`):**
   - Maintained for compatibility with legacy MCP clients.
   - Binds stateful connections to an in-memory transport map keyed by `sessionId`.
   - Requires sticky sessions (`sessionAffinity: ClientIP`) when scaled across multiple pod replicas in Kubernetes.

### Upstream Failure Isolation

A key design requirement is that failure in one upstream service must not degrade other services or crash the gateway process:

- The `McpAggregator.executeToolCall()` pipeline wraps upstream calls in defensive exception boundaries.
- If an upstream returns an HTTP 500, encounters a socket timeout, or is marked disabled, the gateway transforms the failure into an MCP-compliant response:
  ```json
  {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "{\n  \"error\": \"UPSTREAM_EXECUTION_FAILURE\",\n  \"upstream\": \"Unreachable Legacy ERP\",\n  \"tool\": \"fetch_ledger\",\n  \"message\": \"Failed to execute tool on upstream server: Upstream handler for 'erp' is not available\"\n}"
      }
    ]
  }
  ```
- Unaffected upstreams (e.g. inventory or WooCommerce) continue serving client requests with zero latency penalty or error bleed-over.

### Input Validation, Sanitization & PII Stripping

Data entering or leaving the gateway is validated and filtered across three boundaries:

1. **Strict Zod Input Schemas:**
   All 18 tools declare Zod schemas with bounded types (e.g. `page >= 1`, `1 <= per_page <= 100`, positive integer IDs, validated ISO 8601 date filters). Invalid arguments are rejected before invoking upstream networks.
2. **Customer PII Stripping (GDPR/CCPA Compliance):**
   WooCommerce orders contain sensitive customer details. `WooCommerceClient.normalizeOrderDetail()` and `normalizeOrderSummary()` systematically redact customer phone numbers, email addresses, street addresses, and recipient names. Only non-identifying geographic attributes (`country`, `state`, `city`) and order totals are exposed to AI assistants.
3. **Error Message Secret Redaction:**
   Stack traces and raw HTTP failure bodies are sanitized before returning to the caller. Query strings containing `consumer_secret`, `consumer_key`, `Bearer [token]`, or `password` are masked as `[REDACTED]`.

### Authentication, RBAC & Immediate Key Revocation

- **Hash-Based Storage:** API keys are never stored in plaintext. When an administrator creates an API key via `POST /api/keys`, the raw key (`wc_sec_...` or `gw_sec_...`) is displayed once. The gateway stores a cryptographically secure SHA-256 hash alongside an identification prefix (e.g. `wc_sec_...`).
- **Role-Based Authorization:** Users are categorized into `admin` (access to user management, key management, upstream lifecycle control, and audit logs) and `member` (permitted to execute MCP tool calls and chat interactions).
- **Immediate Revocation:** Revoking a key via `DELETE /api/keys/:id` immediately sets `revoked: true` in storage. Any subsequent request presenting that key returns HTTP 401 Unauthorized instantly—without requiring server restarts, cache flushes, or token expiry windows.

### Audit Trail & Data Masking

The `AuditService` records an append-only log of every tool execution:
- Captures: `id`, `timestamp`, `userId`, `username`, `upstreamId`, `upstreamName`, `toolName`, `durationMs`, `success`, and sanitized `error`.
- **Zero Credential & PII Leakage:** The audit logger strictly omits request payload arguments and raw response payloads, preventing accidental leakage of customer information or credentials into persistent audit logs.

### Container & Pod Security Hardening

The deployment configuration follows the Kubernetes **Restricted Pod Security Standard**:
- **Non-Root Execution:** The container image runs as the unprivileged `node` user (`UID 1000`, `GID 1000`).
- **Read-Only Root Filesystem:** Pods enforce `readOnlyRootFilesystem: true`. Writable temporary files use an `emptyDir` mount at `/tmp`. Persistent application data is restricted to `/usr/src/app/data` backed by a PersistentVolumeClaim.
- **Linux Capability Dropping:** The deployment explicitly drops all Linux capabilities (`capabilities.drop: ["ALL"]`) and blocks privilege escalation (`allowPrivilegeEscalation: false`).

### Architectural Tradeoffs & Known Limitations

- **In-Memory Rate Limiting Scope:** The built-in rate limiter operates in-memory per pod replica. In a multi-replica Kubernetes deployment, rate limits apply per pod. Global synchronization across pods would require an external store such as Redis.
- **In-Memory Sandbox Fallback:** When the configured WooCommerce store is offline, returns `ENOTFOUND`, or is set to a `.local` URL, the client falls back to an in-memory sandbox catalog (3 products, 2 orders). This allows offline demos and test suites to function deterministically without external network dependencies.
- **Synchronous JSON File Persistence:** The gateway uses `JsonStore` for state persistence (`store.json`). This avoids heavy external database dependencies for lightweight deployments, but is designed for single-replica writes or PVC volume mounts.

---

## Reproducible Quick Start

### Prerequisites

- **Node.js:** v20.0.0 or later (Node.js 22 LTS recommended)
- **npm:** v10.0.0 or later
- **Docker:** Optional, required for container builds
- **kubectl & Helm:** Optional, required for Kubernetes validation

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anusha975/woocommerce-mcp-gateway.git
   cd woocommerce-mcp-gateway
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment file:**
   ```bash
   cp .env.example .env
   ```

### Environment Configuration

Edit `.env` as required. The gateway works out of the box with default development credentials:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | `3000` | Port for the Express gateway and MCP transports |
| `HOST` | `0.0.0.0` | Host interface to bind to |
| `GATEWAY_API_KEY` | `gw_sec_dev_local_key_123` | Master admin API key. If omitted, gateway authentication is disabled. |
| `WOOCOMMERCE_BASE_URL` | `http://localhost:8080` | Base URL of your WooCommerce store (falls back to sandbox if unreachable) |
| `WOOCOMMERCE_CONSUMER_KEY` | `ck_test_placeholder_key` | WooCommerce REST API Consumer Key |
| `WOOCOMMERCE_CONSUMER_SECRET` | `cs_test_placeholder_secret`| WooCommerce REST API Consumer Secret |
| `WOOCOMMERCE_TIMEOUT_MS` | `10000` | Timeout in milliseconds for upstream WooCommerce requests |
| `WOOCOMMERCE_VERIFY_SSL` | `true` | Set to `false` for self-signed development certificates |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Sliding rate-limiting window (1 minute) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum allowed requests per window per IP |
| `DATA_DIR` | `./data` | Directory for persistent JSON state storage |

> [!NOTE]
> Never commit `.env` files or production credentials to version control.

### Running Locally

**Start in development mode (with auto-reloading):**
```bash
npm run dev
```

**Build and start in production mode:**
```bash
npm run build
npm start
```

Once started, the gateway listens at `http://localhost:3000`.

### Accessing the Dashboard

Open your browser and navigate to:
```text
http://localhost:3000/ui
```
*(Navigating directly to `http://localhost:3000/` with a browser will automatically redirect you to `/ui`).*

When prompted for authentication, enter your configured API key (default: `gw_sec_dev_local_key_123`). From the dashboard, you can:
- Inspect real-time health and response latency of all upstream services.
- Enable or disable upstream services dynamically.
- Create and revoke API keys for administrators and team members.
- Monitor live tool execution audit logs.
- Interact with the integrated AI Chat Agent.

---

## MCP Client Usage & Protocol Endpoints

### Gateway Endpoints

| Endpoint | Method | Authentication | Purpose |
| :--- | :---: | :---: | :--- |
| `/mcp` | `POST` | Bearer Token | Primary Streamable HTTP MCP transport endpoint (JSON-RPC 2.0) |
| `/mcp` | `GET` | Bearer Token | Streamable HTTP endpoint information / ping probe |
| `/sse` | `GET` | Bearer Token | Legacy Server-Sent Events MCP transport handshake |
| `/messages` | `POST` | Bearer Token | SSE client message post endpoint (`?sessionId=<SID>`) |
| `/healthz` | `GET` | None | Kubernetes liveness probe (returns `{ "status": "ok" }`) |
| `/readyz` | `GET` | None | Kubernetes readiness probe (returns `{ "status": "ready", ... }`) |
| `/ui` | `GET` | None | Interactive React 18 administrative dashboard |
| `/api/chat` | `POST` | Bearer Token | Multi-turn AI chat tool-calling endpoint |
| `/api/tools` | `GET` | Bearer Token | Aggregated catalog of tools from enabled upstreams |
| `/api/keys` | `GET`, `POST` | Admin Only | API key management and issuance |
| `/api/keys/:id` | `DELETE` | Admin Only | Instantaneous API key revocation |
| `/api/upstreams` | `GET`, `POST` | Bearer Token | Upstream server management |
| `/api/upstreams/:id` | `PATCH` | Admin Only | Enable/disable upstream server |
| `/api/audit` | `GET` | Admin Only | Audit log query endpoint with user/tool filters |

### Connecting via MCP Inspector

You can inspect, validate, and invoke tools using the official Model Context Protocol Inspector:

```bash
# 1. Start the gateway locally
npm run dev

# 2. Launch MCP Inspector in another terminal
npx @modelcontextprotocol/inspector
```

In the Inspector interface:
1. **Transport Type:** Select `Streamable HTTP` (recommended) or `SSE`.
2. **URL:**
   - For Streamable HTTP: `http://localhost:3000/mcp`
   - For SSE: `http://localhost:3000/sse`
3. **Authentication Header:**
   ```text
   Authorization: Bearer gw_sec_dev_local_key_123
   ```
4. Click **Connect**. You will see all 18 tools discovered across the three upstreams.

### Connecting Claude Desktop & Cursor

Add the gateway configuration to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "woocommerce-gateway": {
      "command": "node",
      "args": ["/absolute/path/to/woocommerce-mcp-gateway/dist/index.js"],
      "env": {
        "PORT": "3000",
        "GATEWAY_API_KEY": "gw_sec_dev_local_key_123",
        "WOOCOMMERCE_BASE_URL": "https://your-store.example.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_...",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_..."
      }
    }
  }
}
```

### Direct HTTP Invocations (cURL Examples)

**1. Protocol Initialization (`initialize`):**
```bash
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer gw_sec_dev_local_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "terminal-client", "version": "1.0.0" }
    }
  }'
```

**2. Tool Discovery (`tools/list`):**
```bash
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer gw_sec_dev_local_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

**3. Tool Invocation (`tools/call`):**
```bash
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer gw_sec_dev_local_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_product",
      "arguments": {
        "id": 101
      }
    }
  }'
```

### Available MCP Tools Catalog

The gateway exposes 18 production-ready tools across three business domains:

#### WooCommerce Store Tools (12 Tools)

| Tool Name | Canonical Name | Description | Key Parameters |
| :--- | :--- | :--- | :--- |
| `health_check` | `health_check` | Operational diagnostics and WooCommerce connectivity status | `verbose` (boolean, optional) |
| `list_products` | `list_products` | Query catalog with pagination, price, and category filters | `page`, `per_page`, `category`, `status`, `min_price`, `max_price` |
| `search_products`| `search_products`| Full-text keyword search across titles and descriptions | `query` (string, required), `status`, `page`, `per_page` |
| `get_product` | `get_product` | Retrieve detailed product specification by ID | `id` (positive integer, required) |
| `get_low_stock_products` | `get_low_stock_products` | Scan for inventory below defined threshold | `threshold` (integer, default: 5), `page`, `per_page` |
| `create_product` | `create_product` | Create a new product in the WooCommerce catalog | `name` (required), `regular_price`, `sku`, `stock_quantity`, `status` |
| `list_recent_orders` | `list_recent_orders` | Query store orders with customer PII excluded | `page`, `per_page`, `status`, `after`, `before`, `orderby`, `order` |
| `list_orders` | `list_orders` | Standard paginated order list (alias of `list_recent_orders`) | `page`, `per_page`, `status`, `after`, `before` |
| `get_order` | `get_order` | Retrieve order line items and shipping breakdown | `id` (positive integer, required) |
| `search_orders_by_status` | `search_orders_by_status` | Filter store orders by exact lifecycle status | `status` (enum: pending, processing, completed, etc.), `page` |
| `get_order_summary` | `get_order_summary` | High-level financial overview with zero customer PII | `id` (positive integer, required) |
| `update_order_status` | `update_order_status` | Update fulfillment status of an order | `id` (integer, required), `status` (enum, required) |

#### Warehouse Inventory Tools (3 Tools)

| Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `inv__check_warehouse_stock` | Physical aisle, bin location, on-hand, and reserved stock | `sku` (string, required) |
| `inv__list_suppliers` | Approved vendors, delivery lead times, and reliability ratings | `category` (string, optional) |
| `inv__calculate_reorder_point`| Calculates reorder threshold and safety stock buffer percentage | `sku` (required), `dailySalesVelocity`, `leadTimeDays`, `safetyStockBufferPercent` |

#### Customer Support & CRM Tools (3 Tools)

| Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `sup__get_customer_satisfaction` | Retrieves customer CSAT rating, NPS tier, and open ticket count | `customerId` (positive integer, required) |
| `sup__initiate_return_request` | Validates 30-day eligibility and generates an RMA tracking code | `orderId` (required), `reason` (enum, required), `customerNotes` |
| `sup__get_vip_status` | Calculates VIP loyalty tier and perk discounts from lifetime spend | `customerId` (positive integer, required) |

### Representative Tool Call Payload

**Request (`POST /mcp`):**
```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "tools/call",
  "params": {
    "name": "inv__check_warehouse_stock",
    "arguments": {
      "sku": "WOO-HOODIE"
    }
  }
}
```

**Response (`HTTP 200 OK`):**
```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"sku\": \"WOO-HOODIE\",\n  \"warehouse\": \"Main Distribution Center #1 (North)\",\n  \"location\": \"Aisle 5, Bin H-12\",\n  \"quantityOnHand\": 18,\n  \"quantityReserved\": 4,\n  \"quantityAvailable\": 14,\n  \"status\": \"in_stock\",\n  \"lastCountDate\": \"2026-10-10T08:00:00Z\"\n}"
      }
    ]
  }
}
```

---

## Testing & Verification Quality

### Automated Test Pyramid

The repository enforces software quality across unit, integration, resilience, and acceptance test suites using Vitest.

```text
┌──────────────────────────────────────────────────────────────┐
│                    Acceptance Scenarios                      │
│            tests/integration/acceptance-scenarios.test.ts    │
│            (Scenarios B–G, Multi-Upstream, Revocation)       │
├──────────────────────────────────────────────────────────────┤
│               Integration & Protocol Suites                  │
│       Streamable HTTP & SSE Transports, Chat Agent Loop,     │
│        Concurrency Stress (20x), Error Resilience            │
├──────────────────────────────────────────────────────────────┤
│                      Unit Test Suites                        │
│        Config Parsing (Zod), Logger Redaction (Pino),        │
│          WooCommerce Client Normalizers, Tool Schemas        │
└──────────────────────────────────────────────────────────────┘
```

### Running Verification Commands

Execute the verified commands below to reproduce the test results:

```bash
# Run the complete test suite (16 passed test files, 143 passed tests)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests (MCP protocol, transports, and resilience)
npm run test:integration

# Run the Chat Agent integration tests
npm run test:chat

# Run End-to-End Acceptance Scenarios (Scenarios B through G)
npm run test:acceptance

# Run standalone end-to-end verification CLI
npm run test:e2e

# Run strict TypeScript compiler verification (zero errors)
npm run typecheck

# Run ESLint validation (zero errors, zero warnings)
npm run lint

# Validate Helm chart templates and in-cluster DNS resolution
npm run helm:validate
```

### End-to-End Acceptance Scenarios Matrix (Scenarios A–G)

The project includes an end-to-end acceptance suite testing every core requirement:

| Scenario | Objective & Feature Under Test | Implementation & Test Evidence | Status |
| :---: | :--- | :--- | :---: |
| **A** | **Storefront Checkout Verification**<br/>Place a test order with Cash on Delivery (COD) on the storefront and verify the order appears in WordPress Admin. | Requires an active WordPress store. Verified using manual end-to-end checkout protocol documented in [`docs/testing.md`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/testing.md). | **Documented (Manual)** |
| **B** | **Chat Agent Tool Loop (User A)**<br/>Authenticated User A creates a product (`wc__create_product`) and queries today's orders (`wc__list_orders`) via natural language. | Verified in `tests/integration/acceptance-scenarios.test.ts` (`B1`, `B2`). Tool loop executes product creation and order retrieval. | **PASS (Automated)** |
| **C** | **External Client & Multi-Upstream (User B)**<br/>User B connects via external MCP client (`StreamableHTTPClientTransport`) and executes cross-upstream tool calls (`get_product`, `inv__check_warehouse_stock`). | Verified in `tests/integration/acceptance-scenarios.test.ts` (`C1`, `C2`). Discovers all 18 tools and dispatches across upstreams. | **PASS (Automated)** |
| **D** | **API Key Revocation**<br/>Admin revokes User B's key via `DELETE /api/keys/:id`; subsequent requests immediately return HTTP 401 Unauthorized. | Verified in `tests/integration/acceptance-scenarios.test.ts` (`D1`). Rejection verified across both `/mcp` and REST management routes. | **PASS (Automated)** |
| **E** | **Upstream Lifecycle Management**<br/>Disabling Inventory upstream purges its tools from `/api/tools`; re-enabling immediately restores them. | Verified in `tests/integration/acceptance-scenarios.test.ts` (`E1`). Confirmed dynamic catalog synchronization. | **PASS (Automated)** |
| **F** | **Failure Isolation & Fault Tolerance**<br/>An unreachable upstream returns structured `{ isError: true }` without crashing the gateway; other upstreams continue operating. | Verified in `tests/integration/acceptance-scenarios.test.ts` (`F1`, `F2`, `F3`). Upstream error caught; health check marks service unreachable. | **PASS (Automated)** |
| **G** | **Audit Logging & Zero Credential Leakage**<br/>Every tool call produces a durable audit entry with user identity, tool, duration, and status without leaking secrets. | Verified in `tests/integration/acceptance-scenarios.test.ts` (`G1`, `G2`). Zero leakage of API keys or WooCommerce secrets confirmed. | **PASS (Automated)** |

### Automated vs Live Environment Status

To ensure complete transparency during evaluation:

| Verification Scope | Automated Test Suite | Live Environment Status | Notes |
| :--- | :---: | :---: | :--- |
| **MCP Protocol & Transports** | **PASS** (143 passed) | Verified locally | Tested over Streamable HTTP and SSE using official SDK client |
| **WooCommerce Tools & Schemas** | **PASS** (58 tests) | **PARTIAL** | Verified against REST v3 mock server and in-memory sandbox. Live store test skipped (`RUN_LIVE_TESTS=true` required). |
| **Docker Containerization** | **PASS** | **PARTIAL** | Multi-stage Dockerfile and health check syntax verified; live daemon was offline during testing. |
| **Kubernetes & Helm Charts** | **PASS** | **PARTIAL** | Manifests and Helm templates validated (`npm run helm:validate`); live cluster deployment unverified. |

---

## Docker & Kubernetes Deployment

### Building & Running the Docker Container

The gateway includes a multi-stage `Dockerfile` based on Alpine Linux:
- **Stage 1 (`builder`):** Compiles TypeScript into JavaScript (`dist/`) using `tsconfig.build.json`.
- **Stage 2 (`runner`):** Copies compiled code into a minimal Alpine runtime image, installs production-only dependencies, drops privileges to the unprivileged `node` user (`UID 1000`), and defines a container `HEALTHCHECK` using `wget`.

```bash
# 1. Build the production image
docker build -t woocommerce-mcp-gateway:local .

# 2. Run the container locally
docker run --rm -d \
  --name woocommerce-mcp-gateway \
  -p 3000:3000 \
  --env-file .env \
  woocommerce-mcp-gateway:local

# 3. Check container health status
curl http://localhost:3000/healthz

# 4. View container logs
docker logs -f woocommerce-mcp-gateway
```

### Option A: Deploying via Kubernetes Manifests (`k8s/`)

Declarative Kubernetes manifests are located in the `k8s/` directory:

```bash
# 1. Create secret from example template
cp k8s/secret.example.yaml k8s/secret.yaml
# Edit k8s/secret.yaml with your store credentials

# 2. Apply secret to the cluster
kubectl apply -f k8s/secret.yaml

# 3. Deploy all components using Kustomize (Namespace, ConfigMap, PVC, Deployment, Service)
kubectl apply -k k8s/
```

### Option B: Deploying via Helm Chart (`helm/woocommerce-mcp`)

The Helm chart packages the complete platform, including WordPress, MariaDB, and the MCP Gateway:

```bash
# Deploy for local testing (NodePort, relaxed resource limits)
helm install woocommerce-mcp ./helm/woocommerce-mcp \
  --namespace woocommerce-mcp \
  --create-namespace \
  -f ./helm/woocommerce-mcp/values-local.yaml

# Deploy for production-like environments (ClusterIP, Ingress, strict resource quotas)
helm install woocommerce-mcp ./helm/woocommerce-mcp \
  --namespace woocommerce-mcp \
  --create-namespace \
  -f ./helm/woocommerce-mcp/values-prod.yaml
```

To upgrade an existing release:
```bash
helm upgrade woocommerce-mcp ./helm/woocommerce-mcp \
  --namespace woocommerce-mcp \
  -f ./helm/woocommerce-mcp/values-local.yaml
```

To rollback a release:
```bash
helm rollback woocommerce-mcp 1 -n woocommerce-mcp
```

### Cluster Inspection & Rollout Verification

Verify the health and status of deployed cluster resources:

```bash
# Inspect pods, services, and persistent volume claims
kubectl get pods,services,pvc -n woocommerce-mcp

# Verify deployment rollout status
kubectl rollout status deployment/woocommerce-mcp-gateway -n woocommerce-mcp

# Inspect pod logs
kubectl logs -l app=woocommerce-mcp-gateway -n woocommerce-mcp --tail=50 -f

# Check detailed pod lifecycle events (useful if pod is in CrashLoopBackOff)
kubectl describe pod -l app=woocommerce-mcp-gateway -n woocommerce-mcp
```

### Helm Chart Validation

The repository includes a dedicated automated validation script to verify Helm templates, required values, and in-cluster DNS resolution:

```bash
npm run helm:validate
```

This verifies:
- Syntactic validity of `Chart.yaml`, `values.yaml`, `values-local.yaml`, and `values-prod.yaml`.
- Template structure for database, WordPress, gateway, and ingress resources.
- Correct in-cluster DNS resolution between WordPress, MariaDB, and the gateway.
- That the internal WooCommerce MCP server remains private and is not inadvertently exposed through public Ingress rules.

---

## Honest Limitations & Tradeoffs

To ensure an accurate evaluation, the following implementation tradeoffs and operational limitations should be noted:

1. **Mock / Sandbox Fallback Mode:**
   When the target WooCommerce store is offline, unreachable (`ENOTFOUND`, `ECONNREFUSED`, `fetch failed`), or configured with a `.local` URL, `WooCommerceClient` falls back to an internal sandbox store. This ensures local development, demonstrations, and test suites operate without external network dependencies. For live production stores, ensure a routable HTTPS URL with valid REST API credentials is provided.
2. **Pod-Scoped In-Memory Rate Limiting:**
   The rate limiter is implemented in-memory per pod replica. In multi-pod Kubernetes deployments, rate limits apply per replica rather than globally. A production environment requiring synchronized cluster-wide limits should integrate an external store such as Redis.
3. **SSE Stateful Session Affinity:**
   The legacy Server-Sent Events transport (`/sse` and `/messages`) maintains active connections in an in-memory transport map. Deploying SSE across multiple Kubernetes replicas requires sticky sessions (`sessionAffinity: ClientIP`). Clients are encouraged to use the stateless Streamable HTTP transport (`/mcp`), which works seamlessly with standard round-robin load balancing.
4. **Storage Persistence Across Pod Replicas:**
   The gateway uses `JsonStore` (atomic writes to `data/store.json`) for persistence. In Kubernetes, this directory is mounted to a PersistentVolumeClaim (`/usr/src/app/data`). In multi-replica deployments, a `ReadWriteMany` (RWX) volume or an external database (e.g. PostgreSQL) would be required to prevent state divergence between pods.
5. **Live Store & Cluster Environment Verification:**
   While the automated test suite, Dockerfile syntax, and Helm chart templates have passed all checks (143 passed tests), live verification against a production WooCommerce store and live cluster deployments remain marked as partial/unverified because external credentials and a live cluster were unavailable during evaluation.

---

## Troubleshooting

### Common Issues & Diagnostic Commands

**1. Gateway cannot reach the WooCommerce store:**
- Check the store URL in `.env`. Hostnames like `localhost` or `.local` inside Docker or Kubernetes will resolve to the container itself rather than the host machine.
- In Docker Desktop on macOS/Windows, use `http://host.docker.internal:8080` instead of `http://localhost:8080`.
- Verify your WooCommerce REST API keys by making a direct curl call:
  ```bash
  curl -u "ck_...:cs_..." https://your-store.example.com/wp-json/wc/v3/system_status
  ```

**2. MCP client receives HTTP 401 Unauthorized:**
- Confirm whether `GATEWAY_API_KEY` is configured in `.env`.
- Ensure your MCP client or Inspector includes the authorization header:
  ```text
  Authorization: Bearer <GATEWAY_API_KEY>
  ```
- If using an individual user key, check the Dashboard (`/ui`) under **API Keys** to verify that the key has not been revoked.

**3. Kubernetes pods remain in `Pending` or `CrashLoopBackOff`:**
- Inspect pod events and logs:
  ```bash
  kubectl describe pod <pod-name> -n woocommerce-mcp
  kubectl logs <pod-name> -n woocommerce-mcp
  ```
- If the pod fails with permission errors, verify that the PVC volume mount is writable by UID 1000 (`fsGroup: 1000` is set in `k8s/deployment.yaml`).

**4. Dashboard loads a blank page:**
- Ensure the gateway is running and that your browser has access to CDN resources (React 18 and Google Fonts).
- Check the browser console (`F12`) for network connectivity or Content Security Policy errors.

---

## Project Structure & References

```text
woocommerce-mcp-gateway/
├── Dockerfile                      # Multi-stage Alpine container build (non-root node user)
├── helm/woocommerce-mcp/           # Modular Helm chart (Gateway, WordPress, MariaDB, Ingress)
│   ├── templates/                  # Kubernetes resource templates
│   ├── values-local.yaml           # Local testing configuration
│   └── values-prod.yaml            # Production configuration
├── k8s/                            # Declarative Kustomize manifests
│   ├── deployment.yaml             # Gateway deployment with security hardening & probes
│   ├── service.yaml                # ClusterIP service
│   ├── pvc.yaml                    # PersistentVolumeClaim for storage persistence
│   └── configmap.yaml              # Application configuration
├── src/
│   ├── config/                     # Environment schema validation (Zod)
│   ├── connectors/                 # WooCommerce REST API v3 adapter & PII normalizer
│   ├── gateway/                    # Express app, Streamable HTTP & SSE transports, UI
│   ├── logging/                    # Structured Pino logger with automatic secret redaction
│   ├── middleware/                 # Auth, rate limiting, and error handling middleware
│   ├── servers/                    # Inventory and Customer Support upstream MCP servers
│   ├── services/                   # Auth, Audit, Upstream, and Chat domain services
│   ├── storage/                    # Atomic JSON disk persistence (JsonStore)
│   └── tools/                      # Registered WooCommerce product and order tools
├── tests/
│   ├── fixtures/                   # Realistic WooCommerce REST API v3 mock payloads
│   ├── integration/                # MCP protocol, transports, resilience, and acceptance tests
│   └── unit/                       # Config, logger, client adapter, and tool logic tests
└── docs/                           # Supplementary deep-dive documentation
    ├── architecture.md             # Detailed system design & sequence diagrams
    ├── deployment.md               # Step-by-step Docker and Kubernetes deployment guide
    ├── security.md                 # Threat modeling, PII protection & zero-trust auth
    └── testing.md                  # Test inventory, coverage metrics & execution guide
```

For detailed technical deep dives, refer to the documentation in [`docs/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs):
- [`docs/architecture.md`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/architecture.md) — Architectural diagrams and sequence flows.
- [`docs/security.md`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/security.md) — Security policies, PII handling, and compliance.
- [`docs/deployment.md`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/deployment.md) — Kubernetes orchestration and cluster operations.
- [`docs/testing.md`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/testing.md) — Test pyramid inventory and coverage data.
