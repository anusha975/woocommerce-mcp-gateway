# WooCommerce MCP Gateway

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Official%20SDK-purple.svg)](https://modelcontextprotocol.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Cloud--Native-326CE5.svg)](https://kubernetes.io/)
[![Vitest](https://img.shields.io/badge/Tests-74%20Passing-brightgreen.svg)](https://vitest.dev/)

A production-grade, containerized **Model Context Protocol (MCP)** gateway engineered for Kubernetes, enabling AI assistants, agents, and MCP clients (e.g. Claude Desktop, Cursor, and custom agent workflows) to securely discover, inspect, and query store and catalog data from **WooCommerce** platforms.

---

## 📑 Table of Contents

- [1. Project Purpose & Scope](#1-project-purpose--scope)
- [2. System Architecture](#2-system-architecture)
- [3. Request & Execution Flow](#3-request--execution-flow)
- [4. Technology Stack & Design Decisions](#4-technology-stack--design-decisions)
- [5. Prerequisites & Local Setup](#5-prerequisites--local-setup)
- [6. Environment Configuration](#6-environment-configuration)
- [7. Configuring a Test WooCommerce Store](#7-configuring-a-test-woocommerce-store)
- [8. Starting the MCP Server](#8-starting-the-mcp-server)
- [9. Connecting MCP Clients](#9-connecting-mcp-clients)
- [10. MCP Tools Catalog](#10-mcp-tools-catalog)
- [11. Security & Data Protection](#11-security--data-protection)
- [12. Automated Testing & Verification](#12-automated-testing--verification)
- [13. Docker Containerization](#13-docker-containerization)
- [14. Kubernetes Deployment & Operations](#14-kubernetes-deployment--operations)
- [15. Known Limitations & Future Improvements](#15-known-limitations--future-improvements)
- [16. Repository Documentation Links](#16-repository-documentation-links)

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
    Note over GW: 1. Verify Gateway API Key<br/>2. Check Rate Limit (100 req/min)<br/>3. Enforce 1MB Body Limit
    
    alt Unauthorized or Rate Limited
        GW-->>AI: HTTP 401 Unauthorized / 429 Too Many Requests
    else Authorized
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
git clone https://github.com/your-org/woocommerce-mcp-gateway.git
cd woocommerce-mcp-gateway

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
```

---

## 6. Environment Configuration

The application validates configuration on boot via Zod (`src/config/env.ts`). If required variables are missing, it fails fast with descriptive diagnostics:

| Environment Variable | Required | Default | Safe Example Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | No | `development` | `production` | Environment mode (`development`, `production`, `test`). |
| `PORT` | No | `3000` | `3000` | Gateway HTTP server port. |
| `HOST` | No | `0.0.0.0` | `0.0.0.0` | Network bind interface. |
| `LOG_LEVEL` | No | `info` | `info` | Logger severity (`fatal`, `error`, `warn`, `info`, `debug`, `silent`). |
| `GATEWAY_API_KEY` | No | - | `sec_mcp_gateway_token_999` | Optional bearer token protecting `/mcp` and `/sse` endpoints. |
| `WOOCOMMERCE_BASE_URL` | **Yes** | - | `https://store.example.com` | Target WooCommerce store base URL (HTTPS required in prod). |
| `WOOCOMMERCE_CONSUMER_KEY` | **Yes** | - | `ck_example_consumer_key_001` | WooCommerce REST API Consumer Key. |
| `WOOCOMMERCE_CONSUMER_SECRET`| **Yes** | - | `cs_example_consumer_secret_002`| WooCommerce REST API Consumer Secret. |
| `WOOCOMMERCE_TIMEOUT_MS` | No | `10000` | `10000` | Upstream HTTP timeout in milliseconds (min 1000). |
| `WOOCOMMERCE_VERIFY_SSL` | No | `true` | `true` | Enable/disable TLS certificate validation. |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | `60000` | Rate limiting sliding window in ms (1 minute). |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | `100` | Maximum requests allowed per IP in sliding window. |
| `CORS_ALLOWED_ORIGINS` | No | `*` | `*` | Comma-separated list of allowed CORS origins. |
| `MAX_REQUEST_BODY_BYTES` | No | `1048576` | `1048576` | Maximum request body size in bytes (1MB default). |

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

## 9. Connecting MCP Clients

### A. Claude Desktop Configuration
Add the gateway to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "node",
      "args": ["/path/to/woocommerce-mcp-gateway/dist/index.js"],
      "env": {
        "WOOCOMMERCE_BASE_URL": "https://your-store.example.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_your_consumer_key",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_your_consumer_secret",
        "PORT": "3000"
      }
    }
  }
}
```

### B. Remote Streamable HTTP via `curl`
Initialize an MCP session directly over the HTTP transport:

```bash
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer sec_mcp_gateway_token_999" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "claude-ai", "version": "1.0.0" }
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

The project includes an extensive test suite achieving **83.86% code coverage**:

```bash
# Run all unit and integration test suites (74 tests)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run standalone end-to-end verification script with colored matrix
npm run test:e2e

# Generate detailed V8 coverage report
npm run test:coverage

# TypeScript type check & ESLint analysis
npm run typecheck
npm run lint
```

*For testing architecture and fixtures breakdown, see [docs/testing.md](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/testing.md).*

---

## 13. Docker Containerization

```bash
# Build multi-stage image (Alpine Node 22)
docker build -t woocommerce-mcp-gateway:latest .

# Run container with environment configuration
docker run -d \
  --name woocommerce-mcp-gateway \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e WOOCOMMERCE_BASE_URL=https://your-store.example.com \
  -e WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key \
  -e WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret \
  -e GATEWAY_API_KEY=sec_mcp_gateway_token_999 \
  woocommerce-mcp-gateway:latest

# Verify health
curl -i http://localhost:3000/healthz
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
kubectl port-forward svc/woocommerce-mcp-gateway-service 3000:3000 -n woocommerce-mcp
```

### 14.7 Testing Health & MCP Endpoints
In another terminal, verify the endpoints over the forwarded port:
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

## 15. Known Limitations & Future Improvements

### Current Limitations
1. **In-Memory Rate Limiter**: The built-in rate limiter is memory-scoped per pod. In multi-pod deployments, limits are evaluated independently per pod replica.
2. **Read-Only Scope**: The gateway is intentionally read-only to prevent destructive agent actions (no `create_product`, `update_order`, or `delete_product`).
3. **SSE Sticky Sessions**: The legacy SSE transport (`/sse`) requires sticky sessions (`sessionAffinity: ClientIP`) across multiple replicas; clients are encouraged to use the stateless Streamable HTTP transport (`/mcp`).

### Future Improvements
- **Redis Rate Limiting**: Add an optional Redis backing adapter for cluster-wide rate limiting synchronization.
- **MCP Prompt & Resource Templates**: Register standard MCP resources for catalog categories and order status workflows.
- **Distributed Tracing**: Integrate OpenTelemetry (`otel`) tracing for end-to-end request tracing across LLM agents and WooCommerce backends.

---

## 16. Repository Documentation Links

- **[System Architecture & Design](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/architecture.md)**
- **[Security Architecture & Privacy Controls](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/security.md)**
- **[Deployment & Kubernetes Operations Guide](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/deployment.md)**
- **[Testing Strategy & Coverage Report](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/docs/testing.md)**
- **[Development Log & Decision Audit](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/DEVELOPMENT_LOG.md)**
