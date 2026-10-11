# WooCommerce MCP Gateway

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Official%20SDK-purple.svg)](https://modelcontextprotocol.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Cloud--Native-326CE5.svg)](https://kubernetes.io/)
[![Vitest](https://img.shields.io/badge/Tests-97%20Passed%20%7C%202%20Skipped-brightgreen.svg)](https://vitest.dev/)

A production-grade, containerized **Model Context Protocol (MCP)** gateway engineered for Kubernetes, enabling AI assistants, agents, and MCP clients (e.g. Claude Desktop, Cursor, and custom agent workflows) to securely discover, inspect, and query store and catalog data from **WooCommerce** platforms.

---

## 📑 Table of Contents

- [1. Project Purpose & Scope](#1-project-purpose--scope)
- [2. System Architecture](#2-system-architecture)
- [3. Request & Execution Flow](#3-request--execution-flow)
- [4. Technology Stack & Design Decisions](#4-technology-stack--design-decisions)
- [5. Prerequisites & Local Setup](#5-prerequisites--local-setup)
- [6. Environment Configuration & Integration Status](#6-environment-configuration--integration-status)
- [7. Configuring a Test WooCommerce Store](#7-configuring-a-test-woocommerce-store)
- [8. Starting the MCP Server](#8-starting-the-mcp-server)
- [9. Connecting MCP Clients (Claude Desktop, Cursor, Inspector)](#9-connecting-mcp-clients-claude-desktop-cursor-inspector)
- [10. MCP Tools Catalog](#10-mcp-tools-catalog)
- [11. Security & Data Protection](#11-security--data-protection)
- [12. Automated Testing & Verification](#12-automated-testing--verification)
- [13. Docker Containerization](#13-docker-containerization)
- [14. Kubernetes Deployment & Operations](#14-kubernetes-deployment--operations)
- [15. Troubleshooting Guide](#15-troubleshooting-guide)
- [16. Known Limitations & Future Improvements](#16-known-limitations--future-improvements)
- [17. Repository Documentation Links](#17-repository-documentation-links)

---

## 1. Project Purpose & Scope

The **WooCommerce MCP Gateway** serves as a secure, read-only AI integration bridge between Large Language Model (LLM) agents and WooCommerce e-commerce stores:

- **AI-Ready Store Access**: Exposes standardized MCP tools for querying products, tracking inventory levels, inspecting orders, and computing order financials.
- **Protocol Compliance**: Implements the official `@modelcontextprotocol/sdk` supporting modern **Streamable HTTP** (`POST /mcp`) and legacy **Server-Sent Events** (`GET /sse`, `POST /messages`).
- **Zero-Trust Security**: Enforces API token authorization, sliding-window rate limiting, payload bounding (1MB max), customer PII stripping (email, phone, address masking), and deep structured log redaction.
- **Cloud-Native Deployment**: Packaged as a non-root, multi-stage Docker container with Kubernetes manifests (`k8s/`) featuring health probes, rolling updates, and resource boundaries.

---

## 2. System Architecture

```mermaid
graph TD
    Client["MCP Client / Agent\n(Claude Desktop / Cursor / SDK)"]
    
    subgraph K8s["Kubernetes Pod / Container Boundary"]
        subgraph Gateway["Express HTTP & MCP Gateway Server"]
            Auth["Auth Middleware\n(Bearer / X-API-Key)"]
            RateLimit["Rate Limiter\n(100 req/min sliding window)"]
            BodyLimit["Body Parser\n(1MB Max Limit)"]
            Probes["Probes\n(/healthz, /readyz)"]
            
            subgraph MCP_Core["MCP Protocol Core (@modelcontextprotocol/sdk)"]
                TransportHTTP["Streamable HTTP Transport\n(/mcp)"]
                TransportSSE["SSE Transport\n(/sse & /messages)"]
                ToolDispatcher["MCP Server & Tool Dispatcher"]
            end
            
            subgraph Tools["Registered MCP Tools"]
                HealthTool["health_check"]
                ProdTools["Product Tools\n- list_products\n- search_products\n- get_product\n- get_low_stock_products"]
                OrderTools["Order Tools\n- list_recent_orders\n- get_order\n- search_orders_by_status\n- get_order_summary"]
            end
        end
        
        subgraph Connector["WooCommerce Connector"]
            WcClient["WooCommerceClient\n(REST API v3 Adapter)"]
            Sanitizer["PII & Secret Sanitizer\n(Data Masking)"]
            ErrorNormalizer["Error Normalizer\n(Safe Domain Errors)"]
        end
        
        Logger["Structured Logger (Pino)\nAutomatic Secret Redaction"]
    end
    
    subgraph Upstream["Upstream Infrastructure"]
        Store["WooCommerce Store\n(/wp-json/wc/v3)"]
    end

    Client -->|HTTP POST /mcp| Auth
    Client -->|GET /sse| Auth
    Auth --> RateLimit
    RateLimit --> BodyLimit
    BodyLimit --> TransportHTTP
    BodyLimit --> TransportSSE
    TransportHTTP --> ToolDispatcher
    TransportSSE --> ToolDispatcher
    ToolDispatcher --> Tools
    Tools --> WcClient
    WcClient --> Sanitizer
    WcClient --> ErrorNormalizer
    WcClient -->|HTTPS + Basic Auth| Store
    Gateway -.-> Logger
    Connector -.-> Logger
```

*For detailed component breakdowns, see [docs/architecture.md](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/architecture.md).*

---

## 3. Request & Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor AI as MCP Client (AI Agent)
    participant GW as Gateway Middleware
    participant MCP as MCP Server Dispatcher
    participant Tool as Tool Handler (e.g. list_products)
    participant WC as WooCommerce Adapter
    participant API as WooCommerce Store REST v3

    AI->>GW: POST /mcp (JSON-RPC initialize / tools/call)
    Note over GW: 1. Verify Gateway API Key (if configured)<br/>2. Check Rate Limit (100 req/min)<br/>3. Enforce 1MB Body Limit
    
    alt Unauthorized (if key set) or Rate Limited
        GW-->>AI: HTTP 401 Unauthorized / 429 Too Many Requests
    else Authorized / Unauthenticated Dev Mode
        GW->>MCP: Dispatch JSON-RPC payload to Transport
        MCP->>Tool: Validate input schema (Zod)
        
        alt Schema Validation Failed
            Tool-->>MCP: ToolResult (isError: true, "Validation error")
            MCP-->>AI: HTTP 200 JSON-RPC result (isError: true)
        else Validation Passed
            Tool->>WC: Call client method (e.g. listProducts)
            WC->>API: HTTPS GET /wp-json/wc/v3/products (Basic Auth)
            
            alt Upstream Failure (404 / 429 / 500 / Timeout)
                API-->>WC: Upstream error response
                WC->>WC: Normalize to safe domain error (redact credentials)
                WC-->>Tool: Throws normalized WooCommerceError
                Tool-->>MCP: ToolResult (isError: true, sanitized message)
            else Upstream Success (200 OK)
                API-->>WC: Raw JSON payload + headers (X-WP-Total)
                WC->>WC: Strip customer PII & map domain fields
                WC-->>Tool: Typed domain result
                Tool-->>MCP: ToolResult (content: [{ type: "text", text }])
            end
            
            MCP-->>AI: HTTP 200 JSON-RPC response
        end
    end
```

---

## 4. Technology Stack & Design Decisions

| Layer | Technology | Rationale & Design Decision |
| :--- | :--- | :--- |
| **Language & Runtime** | Node.js `22.16.0 LTS` + TypeScript `5.7` | Modern JavaScript ecosystem, strict null checking (`strict: true`), native `fetch` and `AbortController`. |
| **MCP SDK** | `@modelcontextprotocol/sdk` (v1.6.0) | Official reference implementation ensuring strict JSON-RPC 2.0 and capability negotiation compliance. |
| **HTTP Gateway** | Express `5.2.1` | Robust microservice routing, lightweight middleware pipeline, native promise error handling. |
| **Validation** | Zod `3.24.2` | Runtime schema validation for boot configurations and tool invocation parameters. |
| **Structured Logging** | Pino `9.6.0` | Ultra-fast JSON logging with path-based secret redaction engine for zero credential leakage. |
| **Test Runner** | Vitest `3.0.6` | High-speed ESM-native test execution, V8 code coverage, and concurrency simulation. |
| **Container Engine** | Multi-Stage Alpine Dockerfile | Minimal production attack surface (`node:22.16.0-alpine3.21`), non-root UID 1000 execution. |
| **Orchestration** | Kubernetes Manifests (`apps/v1`) | Native horizontal pod autoscaling, rolling updates, readiness/liveness health probes. |

---

## 5. Prerequisites & Local Setup

### Prerequisites
- **Node.js**: `v20.0.0` or higher (tested and verified on `v22.16.0 LTS`).
- **npm**: `v10.0.0` or higher.
- **Docker** *(optional for container builds)*: `v24.0+`.
- **kubectl / Minikube / Kind** *(optional for cluster deployment)*: `v1.28+`.

### Local Installation
```bash
# 1. Clone repository
git clone https://github.com/anusha975/woocommerce-mcp-gateway.git
cd woocommerce-mcp-gateway

# 2. Install dependencies (verified against Node 22 LTS)
npm install

# 3. Create your local environment configuration from template
cp .env.example .env
```

> [!IMPORTANT]
> Never commit `.env` or files containing real secrets to version control. The `.gitignore` file strictly excludes `.env` and `k8s/*secret*.yaml`.

---

## 6. Environment Configuration & Integration Status

The application validates configuration on boot via Zod (`src/config/env.ts`). If required variables are missing, it fails fast with descriptive diagnostics:

| Environment Variable | Required | Default | Safe Example Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | No | `development` | `production` | Environment mode (`development`, `production`, `test`). |
| `PORT` | No | `3000` | `3000` | Gateway HTTP server port. |
| `HOST` | No | `0.0.0.0` | `0.0.0.0` | Network bind interface. |
| `LOG_LEVEL` | No | `info` | `info` | Logger severity (`fatal`, `error`, `warn`, `info`, `debug`, `silent`). |
| `GATEWAY_API_KEY` | No | - | `sec_mcp_gateway_token_999` | Optional API token protecting `/mcp`, `/sse`, and `/messages`. When omitted (default in `.env.example`), gateway authentication is disabled (`authRequired: false`) and requests do not return 401. When configured, requests require `Authorization: Bearer <key>` or `X-API-Key: <key>` (`authRequired: true`) and missing or invalid credentials return HTTP 401. |
| `WOOCOMMERCE_BASE_URL` | **Yes** | - | `https://store.example.com` | Target WooCommerce store base URL (HTTPS required in prod). |
| `WOOCOMMERCE_CONSUMER_KEY` | **Yes** | - | `ck_placeholder_consumer_key` | WooCommerce REST API Consumer Key. |
| `WOOCOMMERCE_CONSUMER_SECRET`| **Yes** | - | `cs_placeholder_consumer_secret`| WooCommerce REST API Consumer Secret. |
| `WOOCOMMERCE_TIMEOUT_MS` | No | `10000` | `10000` | Upstream HTTP timeout in milliseconds (min 1000). |
| `WOOCOMMERCE_VERIFY_SSL` | No | `true` | `true` | Enable/disable TLS certificate validation. |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | `60000` | Rate limiting sliding window in ms (1 minute). |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | `100` | Maximum requests allowed per IP in sliding window. |
| `CORS_ALLOWED_ORIGINS` | No | `*` | `*` | Comma-separated list of allowed CORS origins. |
| `MAX_REQUEST_BODY_BYTES` | No | `1048576` | `1048576` | Maximum request body size in bytes (1MB default). |

### Integration Status Notice
> [!WARNING]
> **Live WooCommerce Store Status**: **BLOCKED / UNVERIFIED**.
> The local development store (`https://woocommerce-test.local`) is currently unreachable on the network.
>
> **Mock-Mode Verification**: **VERIFIED**.
> All 9 MCP tools, schemas, error sanitization, timeout handling, and security controls are thoroughly verified via automated test suites and isolated mock adapters. A successful health check (`/healthz`) does **not** prove live store connectivity. Live store integration will be verified once a live WordPress instance is reachable.

---

## 7. Configuring a Test WooCommerce Store

To connect the gateway to a live or staging WooCommerce store:

1. Log in to your WordPress / WooCommerce admin dashboard.
2. Navigate to: **WooCommerce > Settings > Advanced > REST API**.
3. Click **Add key**.
4. Provide a description (e.g. `MCP Gateway Integration`), assign an Administrator user, and select **Permissions: Read** (the gateway is strictly read-only).
5. Click **Generate API key**.
6. Copy the **Consumer Key** (`ck_...`) and **Consumer Secret** (`cs_...`) into your `.env` or `k8s/secret.yaml` file.

---

## 8. Starting the MCP Server

```bash
# Development mode (hot reload via tsx)
npm run dev

# Production build and run
npm run build
npm start
```

When started, the gateway logs startup metadata to stdout:
```json
{"level":30,"time":"2026-10-09T14:00:00.000Z","name":"wc-mcp-gateway","host":"0.0.0.0","port":3000,"env":"production","mcpStreamableEndpoint":"http://0.0.0.0:3000/mcp","mcpSseEndpoint":"http://0.0.0.0:3000/sse","msg":"WooCommerce MCP Gateway server is listening"}
```

---

## 9. Connecting MCP Clients (Claude Desktop, Cursor, Inspector)

The gateway supports two official Model Context Protocol transports:
* **Streamable HTTP** (`POST /mcp`): Modern stateless JSON-RPC transport with SSE message streaming. Recommended for HTTP clients and cloud deployments.
* **Server-Sent Events (SSE)** (`GET /sse`, `POST /messages`): Long-lived event stream for persistent sessions.

---

### A. Cursor Configuration
1. Open **Cursor Settings** (`Ctrl + ,` or `Cmd + ,`).
2. Search for **MCP** and click **Add New MCP Server**.
3. Configure the server connection:
   * **Name**: `woocommerce`
   * **Type**: `sse`
   * **URL**: `http://localhost:3000/sse`
   *(Or if using Kubernetes port-forward on port 3002: `http://localhost:3002/sse`)*.
4. **Authentication**:
   * If running with default local configuration (`GATEWAY_API_KEY` omitted), authentication is disabled (`authRequired: false`)—leave headers blank.
   * If `GATEWAY_API_KEY` is configured, add header `Authorization: Bearer <GATEWAY_API_KEY>`.
5. Click **Connect**. Cursor will discover all 9 tools and enable them in Agent / Chat mode.

---

### B. Claude Desktop Configuration
Claude Desktop natively communicates with MCP servers via stdio processes. Because this gateway runs as a network service exposing Streamable HTTP and SSE transports, connecting Claude Desktop requires a stdio-to-network bridge utility such as `mcp-remote`.

> [!NOTE]
> **Client Verification Status**:
> * **Cursor** (`Type: sse`), **MCP Inspector**, and **Streamable HTTP** (`curl`): **VERIFIED** against the running gateway.
> * **Claude Desktop** (`mcp-remote` bridge): **DOCUMENTED / NOT END-TO-END VERIFIED** in this environment.

Add the gateway entry to your Claude Desktop configuration file (`claude_desktop_config.json`):
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Default Mode (Unauthenticated / Local Dev Mode)**:
```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/sse"
      ]
    }
  }
}
```

**Secured Mode (When GATEWAY_API_KEY is configured)**:
When authentication is enabled on the gateway, configure the API key via environment variables to avoid exposing credentials in process argument listings:
```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/sse",
        "--header",
        "Authorization: Bearer ${GATEWAY_API_KEY}"
      ],
      "env": {
        "GATEWAY_API_KEY": "<your-gateway-api-key>"
      }
    }
  }
}
```

Ensure the gateway server (`npm run dev`, Docker container, or Kubernetes port-forward) is running before launching Claude Desktop. Do not commit actual API keys to version control.

---

### C. MCP Inspector (Interactive Web GUI)
Test and debug all registered tools interactively using the official MCP Inspector:

```bash
# 1. Start the gateway server locally or ensure Docker / Kubernetes is running
npm run dev

# 2. Launch the MCP Inspector in another terminal
npx @modelcontextprotocol/inspector
```
* In the Inspector browser interface:
  * **Option 1 (SSE Transport)**: Set Transport to `SSE`, URL to `http://localhost:3000/sse`.
  * **Option 2 (Streamable HTTP Transport)**: Set Transport to `Streamable HTTP`, URL to `http://localhost:3000/mcp`.
* **Authentication**: If `GATEWAY_API_KEY` is configured, add Custom Header `Authorization: Bearer <GATEWAY_API_KEY>`. If running with default local configuration (unauthenticated mode), leave custom headers empty.
* Click **Connect** to inspect tool schemas and execute live calls.

---

### D. Direct HTTP Testing via `curl`
Initialize an MCP session directly over the Streamable HTTP transport:

**Unauthenticated Mode (Default Local Configuration)**:
```bash
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "diagnostic-client", "version": "1.0.0" }
    }
  }'
```

**Secured Mode (When GATEWAY_API_KEY is configured)**:
```bash
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <GATEWAY_API_KEY>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "diagnostic-client", "version": "1.0.0" }
    }
  }'
```

---

## 10. MCP Tools Catalog

| Tool Name | Domain | Description | Key Input Parameters | Return Format |
| :--- | :--- | :--- | :--- | :--- |
| `health_check` | Diagnostic | Returns gateway health, uptime, memory, and upstream connectivity. | `verbose` (boolean, optional) | Status, uptime, Node version, memory usage. |
| `list_products` | Store Data | List WooCommerce products with pagination, category, status, and price filtering. | `page`, `per_page`, `category`, `status`, `sku`, `min_price`, `max_price`, `orderby`, `order` | List of sanitized products + pagination metadata (`totalItems`, `totalPages`). |
| `search_products` | Store Data | Full-text keyword search across product titles, descriptions, and SKUs. | `query` (string, required), `page`, `per_page` | Matching product records + search match count. |
| `get_product` | Store Data | Retrieve full product specifications by numeric ID. | `id` (integer, required) | Comprehensive product details (dimensions, weight, categories, attributes, images). |
| `get_low_stock_products` | Inventory | Scan store catalog for products below stock threshold. Untracked items are safely handled. | `threshold` (integer, default: 5), `page`, `per_page` | Filtered list of low-stock and sold-out products. |
| `list_recent_orders` | Orders | Retrieve recent orders with ISO 8601 date boundary filters (`after`, `before`). | `page`, `per_page`, `status`, `after`, `before`, `orderby`, `order` | Order summaries with customer PII strictly removed. |
| `get_order` | Orders | Retrieve complete order details (line items, shipping lines, totals). | `id` (integer, required) | Line item breakdown, taxes, shipping methods (no customer personal details). |
| `search_orders_by_status` | Orders | List orders matching a specific status (`pending`, `processing`, `completed`, `cancelled`, etc.). | `status` (enum, required), `page`, `per_page` | Filtered order records + status totals. |
| `get_order_summary` | Orders | Return a concise financial and item summary of an order. | `id` (integer, required) | Concise financial summary: total, tax, shipping, item count, line items. |

---

## 11. Security & Data Protection

- **PII Stripping & Data Privacy**: Customer billing/shipping email, phone number, and physical address are removed before results reach the AI client.
- **Secret Redaction**: Structured JSON logging (`pino`) automatically redacts `consumer_secret`, `consumer_key`, `GATEWAY_API_KEY`, passwords, and authorization tokens.
- **Request Safeguards**: Enforces sliding-window rate limiting (100 req/min default) and strict payload bounding (1MB max payload, HTTP 413).
- **Hardened Execution**: Container and Kubernetes manifests adhere to the **Restricted Pod Security Standard** (`runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `capabilities.drop: ["ALL"]`).

*For full details, review [docs/security.md](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/security.md).*

---

## 12. Automated Testing & Verification

The project includes an automated test suite with **97 passing tests and 2 skipped tests (99 total tests)** across 15 test files (14 passed, 1 skipped):
- **Unit Tests**: 50 tests passing across 7 test files (`tests/unit/*.test.ts`).
- **Integration Tests**: 47 tests passing across 7 test files (`tests/integration/*.test.ts`), covering MCP Streamable HTTP, SSE transports, tool dispatch, error sanitization, and resilience.
- **Live Tests**: 2 tests skipped in `tests/live/woocommerce.live.test.ts` (live store integration is marked **BLOCKED / UNVERIFIED** because `https://woocommerce-test.local` is offline).

```bash
# Run all automated test suites (97 passed, 2 skipped, 99 total)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only (includes MCP transports and resilience suites)
npm run test:integration

# Run standalone end-to-end verification script with detailed metrics
npm run test:e2e

# Generate detailed V8 coverage report
npm run test:coverage

# TypeScript strict type checking (tsc --noEmit)
npm run typecheck

# ESLint static code analysis
npm run lint
```

*For testing architecture and fixtures breakdown, see [docs/testing.md](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/testing.md).*

---

## 13. Docker Containerization

The gateway is packaged as a hardened, multi-stage Alpine Linux container running as an unprivileged user (`node`, UID 1000) with a built-in health check matching `/healthz`.

### Build Image
```bash
docker build -t woocommerce-mcp-gateway:local .
```

### Run Container
```bash
# Standard port mapping (port 3000)
docker run -d \
  --name wc-gateway \
  --rm \
  -p 3000:3000 \
  --env-file .env \
  -e NODE_ENV=production \
  woocommerce-mcp-gateway:local

# Alternative port mapping (if host port 3000 is occupied by a local process)
docker run -d \
  --name wc-gateway \
  --rm \
  -p 3001:3000 \
  --env-file .env \
  -e NODE_ENV=production \
  woocommerce-mcp-gateway:local
```

### Verify Health & Container Status
```bash
# Check container status and Docker health check
docker ps -f name=wc-gateway

# Inspect health check daemon state
docker inspect --format '{{json .State.Health.Status}}' wc-gateway

# Query health endpoint from host (use port 3000 or 3001 depending on mapping)
curl -i http://localhost:3000/healthz
# (Or if mapped to 3001): curl -i http://localhost:3001/healthz

# Stream live container logs
docker logs -f wc-gateway

# Stop container (graceful shutdown)
docker stop wc-gateway
```

---

## 14. Kubernetes Deployment & Operations

Production Kubernetes manifests in [`k8s/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/k8s) deploy 2 pod replicas behind a secure, private `ClusterIP` Service with health and readiness probes, resource limits, and non-root execution.

### 14.1 Prerequisites
- **kubectl**: CLI installed (`v1.28+`).
- **Local Cluster**: Docker Desktop Kubernetes or Minikube.

### 14.2 Enabling the Local Cluster
- **Docker Desktop**:
  1. Open Docker Desktop **Settings** (gear icon).
  2. Navigate to **Kubernetes** in the left sidebar.
  3. Check **Enable Kubernetes**.
  4. Click **Apply & restart** and wait until the Kubernetes indicator in the footer turns green.
  5. Verify connectivity: `kubectl get nodes`.
- **Minikube**:
  ```bash
  minikube start
  ```

### 14.3 Building & Loading the Local Image
1. Build the production multi-stage Docker image locally:
   ```bash
   docker build -t woocommerce-mcp-gateway:local .
   ```
2. **Cluster Image Availability**:
   - **Docker Desktop Kubernetes**: No loading step needed! Docker Desktop Kubernetes natively shares the local Docker engine image store.
   - **Minikube**: Load the image into the Minikube virtual machine:
     ```bash
     minikube image load woocommerce-mcp-gateway:local
     ```

### 14.4 Applying Manifests
1. **Prepare Secrets**:
   Create the secret using either the template file or the `kubectl` CLI:
   ```bash
   # Option A: From template file
   cp k8s/secret.example.yaml k8s/secret.yaml
   # (Edit k8s/secret.yaml with your actual credentials)
   kubectl apply -f k8s/secret.yaml

   # Option B: Imperatively via CLI
   kubectl create secret generic woocommerce-mcp-gateway-secrets \
     --namespace=woocommerce-mcp \
     --from-literal=WOOCOMMERCE_CONSUMER_KEY="ck_your_consumer_key" \
     --from-literal=WOOCOMMERCE_CONSUMER_SECRET="cs_your_consumer_secret" \
     --from-literal=GATEWAY_API_KEY="your_secure_random_key"
   ```
   *(Note: `k8s/secret.yaml` is excluded by `.gitignore` to prevent secret leakage).*

2. **Deploy Manifests**:
   ```bash
   # Deploy all manifests via Kustomize (handles namespace, config, deployment, service)
   kubectl apply -k k8s/
   ```

### 14.5 Checking Pods, Deployments, Services & Logs
```bash
# Check pod rollout status in the woocommerce-mcp namespace
kubectl rollout status deployment/woocommerce-mcp-gateway -n woocommerce-mcp

# List running pods
kubectl get pods -n woocommerce-mcp -o wide

# Inspect deployment and service
kubectl get deployment,svc -n woocommerce-mcp

# Stream live container logs across replicas
kubectl logs -l app=woocommerce-mcp-gateway -n woocommerce-mcp -f --tail=50
```

### 14.6 Accessing the Service with `kubectl port-forward`
Forward the private ClusterIP service port to your local workstation:
```bash
# Standard port forwarding (port 3000)
kubectl port-forward svc/woocommerce-mcp-gateway-service 3000:3000 -n woocommerce-mcp

# Alternative port forwarding (if host port 3000 is occupied by local dev server)
kubectl port-forward svc/woocommerce-mcp-gateway-service 3002:3000 -n woocommerce-mcp
```

### 14.7 Testing Health & MCP Endpoints
In another terminal, verify the endpoints over the forwarded port (use port `3000` or `3002` depending on your active port-forward):
```bash
# 1. Test Liveness probe
curl -i http://localhost:3000/healthz

# 2. Test Readiness probe
curl -i http://localhost:3000/readyz

# 3. Test Gateway discovery endpoint
curl -i http://localhost:3000/

# 4. Test MCP Protocol initialization (Streamable HTTP)
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "k8s-tester", "version": "1.0.0" }
    }
  }'
```

### 14.8 DNS & Host Networking Notice for Windows
> [!IMPORTANT]
> Inside a Kubernetes pod, `localhost` points to the container itself, **not** your Windows host. If connecting to a local WooCommerce site on your Windows PC (e.g. Local WP), set `WOOCOMMERCE_BASE_URL` in `k8s/configmap.yaml` to `http://host.docker.internal:PORT`.

### 14.9 Cleanup Commands
```bash
# Delete all resources in the namespace
kubectl delete -k k8s/

# Or delete individual resources
kubectl delete namespace woocommerce-mcp
```

*For multi-replica considerations, rolling update strategy, and troubleshooting, see [docs/deployment.md](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/deployment.md).*

---

## 15. Troubleshooting Guide

### 1. Connection Failures (`ECONNREFUSED` / `fetch failed`)
* **Symptom**: MCP tools return `Failed to reach WooCommerce store... ECONNREFUSED` or `fetch failed`.
* **Cause**: Target store URL is offline, misconfigured, or inaccessible from inside the container/pod.
* **Resolution**:
  1. Test store reachability from host: `curl -I <store_url>/wp-json/wc/v3`.
  2. If using Local WP or a host-based store on Windows, do **not** use `localhost` inside Docker or Kubernetes. Use `http://host.docker.internal:<PORT>` instead.
  3. Ensure self-signed TLS certificates are tolerated in development by setting `WOOCOMMERCE_VERIFY_SSL=false` in `.env`.

### 2. Upstream WooCommerce Authentication Rejections (`HTTP 401`)
* **Symptom**: Tool outputs report `WooCommerce store rejected API credentials (HTTP 401)`.
* **Cause**: `WOOCOMMERCE_CONSUMER_KEY` or `WOOCOMMERCE_CONSUMER_SECRET` is missing, revoked, or has insufficient permissions.
* **Resolution**:
  1. Verify credentials in your `.env` or Kubernetes secret.
  2. In WordPress Admin, navigate to **WooCommerce > Settings > Advanced > REST API** and verify the key has at least **Read** permissions.

### 3. Kubernetes Cluster Connection Refused (`dial tcp [::1]:8080: connectex`)
* **Symptom**: `kubectl` commands fail with `Unable to connect to the server: dial tcp [::1]:8080: connectex: No connection could be made because the target machine actively refused it.`
* **Cause**: Kubernetes is disabled in Docker Desktop or Minikube is stopped.
* **Resolution**:
  1. Open Docker Desktop -> **Settings** -> **Kubernetes**.
  2. Toggle **Enable Kubernetes** ON and click **Apply & restart**.
  3. Wait until the indicator in the footer turns green: `🟢 Kubernetes running`.
  4. Verify with: `kubectl get nodes`.

### 4. Client Content Negotiation Rejection (`HTTP 406 Not Acceptable`)
* **Symptom**: `POST /mcp` returns HTTP 406.
* **Cause**: The MCP client sent an HTTP request without accepting `application/json` or `text/event-stream`.
* **Resolution**: Ensure the client includes header: `Accept: application/json, text/event-stream`.

### 5. Port Conflicts (`listen EADDRINUSE :::3000`)
* **Symptom**: Application fails on startup with `EADDRINUSE`.
* **Cause**: Port 3000 is occupied by another local service or background container.
* **Resolution**:
  1. Check open ports: `Get-NetTCPConnection -LocalPort 3000`.
  2. Set a different port in `.env` (e.g. `PORT=3001`), or map host port `-p 3001:3000` in Docker.

---

## 16. Known Limitations & Future Improvements

### Current Limitations
1. **In-Memory Rate Limiter**: The built-in rate limiter is memory-scoped per pod. In multi-pod deployments, limits are evaluated independently per pod replica.
2. **Read-Only Scope**: The gateway is intentionally read-only to prevent destructive agent actions (no `create_product`, `update_order`, or `delete_product`).
3. **SSE Sticky Sessions**: The legacy SSE transport (`/sse`) requires sticky sessions (`sessionAffinity: ClientIP`) across multiple replicas; clients are encouraged to use the stateless Streamable HTTP transport (`/mcp`).

### Future Improvements
- **Redis Rate Limiting**: Add an optional Redis backing adapter for cluster-wide rate limiting synchronization.
- **MCP Prompt & Resource Templates**: Register standard MCP resources for catalog categories and order status workflows.
- **Distributed Tracing**: Integrate OpenTelemetry (`otel`) tracing for end-to-end request tracing across LLM agents and WooCommerce backends.

---

## 17. Repository Documentation Links

- **[System Architecture & Design](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/architecture.md)**
- **[Security Architecture & Privacy Controls](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/security.md)**
- **[Deployment & Kubernetes Operations Guide](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/deployment.md)**
- **[Testing Strategy & Coverage Report](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/testing.md)**
- **[Development Log & Decision Audit](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/DEVELOPMENT_LOG.md)**
