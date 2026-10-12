# WooCommerce MCP Gateway

A TypeScript-based Model Context Protocol (MCP) gateway that connects AI assistants and external MCP clients to WooCommerce, warehouse inventory, and customer support services through a unified endpoint.

## Features

- **MCP Gateway:** Aggregates multiple MCP servers through a unified endpoint.
- **WooCommerce Integration:** Product catalog and order management tools.
- **Multi-Server Support:** Integrates WooCommerce, warehouse inventory, and customer support servers.
- **React Dashboard:** Manage upstream servers, monitor health, manage users and API keys, view audit logs, and interact with the AI chat agent.
- **AI Chat Agent:** Executes tool calls through the gateway.
- **Authentication and Authorization:** Admin/member roles, individual API keys, and key revocation.
- **Audit Logging:** Records tool calls, execution duration, and outcomes.
- **Security:** Input validation, timeout handling, error sanitization, and protection of sensitive credentials.
- **Containerization:** Docker-based deployment with health checks.
- **Kubernetes and Helm:** Deployment configurations for local Kubernetes and production-like k3s environments.
- **Automated Tests:** Unit and integration tests for gateway functionality and MCP interactions.

## Architecture

The platform consists of the following components:

1. **WooCommerce Store:** WordPress storefront with persistent database and content storage.
2. **WooCommerce MCP Server:** Provides tools for product and order operations.
3. **MCP Gateway:** Discovers and routes tools from enabled upstream servers.
4. **Warehouse Inventory MCP Server:** Provides stock and supplier information.
5. **Customer Support MCP Server:** Provides customer support and return-related tools.
6. **React Dashboard:** Provides administration, monitoring, audit logs, and chat.
7. **AI Chat Agent:** Uses the gateway to discover and execute available tools.

## Technology Stack

- TypeScript and Node.js
- Model Context Protocol SDK
- Express
- React
- Zod
- Pino
- Vitest
- Docker
- Kubernetes
- Helm
- WordPress and WooCommerce
- MariaDB

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- Docker
- kubectl
- Helm 3.12 or later
- A local Kubernetes cluster or a VPS running k3s

## Local Setup

Clone the repository:

```bash
git clone https://github.com/anusha975/woocommerce-mcp-gateway.git
cd woocommerce-mcp-gateway
```

Install dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env
```

Configure the required environment variables in `.env`. Use valid WooCommerce REST API credentials and the appropriate store URL.

Start the development server:

```bash
npm run dev
```

Build and start the application:

```bash
npm run build
npm start
```

## Environment Configuration

Configure the following variables as required:

| Variable | Description |
|---|---|
| `NODE_ENV` | Application environment |
| `PORT` | Gateway HTTP port |
| `GATEWAY_API_KEY` | Optional gateway authentication key |
| `WOOCOMMERCE_BASE_URL` | WooCommerce store URL |
| `WOOCOMMERCE_CONSUMER_KEY` | WooCommerce REST API consumer key |
| `WOOCOMMERCE_CONSUMER_SECRET` | WooCommerce REST API consumer secret |
| `WOOCOMMERCE_TIMEOUT_MS` | Upstream request timeout |
| `WOOCOMMERCE_VERIFY_SSL` | TLS certificate verification |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests per window |

Never commit `.env` files, API keys, or other secrets to version control.

## MCP Endpoints

| Endpoint | Purpose |
|---|---|
| `/mcp` | Streamable HTTP MCP endpoint |
| `/sse` | Server-Sent Events endpoint |
| `/messages` | SSE message endpoint |
| `/healthz` | Health check |
| `/readyz` | Readiness check |
| `/ui` | Dashboard route |

When authentication is enabled, provide the gateway API key using the configured authorization header.

## Available Tools

### WooCommerce

- `list_products`
- `create_product`
- `search_products`
- `get_product`
- `get_low_stock_products`
- `list_orders`
- `list_recent_orders`
- `get_order`
- `update_order_status`
- `search_orders_by_status`
- `get_order_summary`
- `health_check`

### Warehouse Inventory

- `inv__check_warehouse_stock`
- `inv__list_suppliers`
- `inv__calculate_reorder_point`

### Customer Support

- `sup__get_vip_status`
- `sup__initiate_return_request`
- `sup__get_customer_satisfaction`

Tool availability depends on the upstream server being enabled and reachable.

## Connecting MCP Clients & MCP Inspector

The gateway supports both modern **Streamable HTTP** (`POST /mcp`) and traditional **Server-Sent Events** (`GET /sse` with `POST /messages`).

### MCP Inspector Setup

You can inspect and execute tools interactively using the official Model Context Protocol Inspector:

```bash
# 1. Start the gateway locally (or via Docker/Kubernetes)
npm run dev

# 2. Launch MCP Inspector in another terminal
npx @modelcontextprotocol/inspector
```

In the Inspector UI:
* **Transport Type:** Select `SSE` or `Streamable HTTP`.
* **URL:**
  * For SSE: `http://localhost:3000/sse`
  * For Streamable HTTP: `http://localhost:3000/mcp`
* **Authentication Header:**
  * When `GATEWAY_API_KEY` is configured in `.env`, provide the header in Inspector configuration:
    ```text
    Authorization: Bearer <YOUR_GATEWAY_API_KEY>
    ```
  * When `GATEWAY_API_KEY` is left blank in `.env`, gateway authentication is disabled and no header is required.

### External MCP Clients (Claude Desktop & Cursor)

**Claude Desktop Configuration (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "woocommerce-gateway": {
      "command": "node",
      "args": ["/path/to/woocommerce-mcp-gateway/dist/index.js"],
      "env": {
        "PORT": "3000",
        "WOOCOMMERCE_BASE_URL": "https://your-store.example.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_...",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_..."
      }
    }
  }
}
```

**Streamable HTTP via curl:**
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
      "clientInfo": { "name": "test-client", "version": "1.0.0" }
    }
  }'
```

## Verification Status & Automated Tests

The repository contains an automated test pyramid with unit, integration, resilience, and acceptance scenario test suites.

### Test Commands

```bash
# Run complete test suite (143 passed, 2 skipped across 16 test files)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only (MCP protocol, transports, resilience)
npm run test:integration

# Run Chat Agent integration tests
npm run test:chat

# Run End-to-End Acceptance Scenarios test suite (Scenarios B through G)
npm run test:acceptance

# Run standalone end-to-end verification CLI
npm run test:e2e

# Run live store tests (requires live store and RUN_LIVE_TESTS=true)
npm run test:live

# Run TypeScript strict type checking and ESLint
npm run typecheck
npm run lint

# Validate Helm chart templates and DNS configuration
npm run helm:validate
```

### Live vs Automated Verification Status

| Scope | Automated Tests | Live Environment Verification | Notes |
| :--- | :---: | :---: | :--- |
| **MCP Protocol & Transports** | **PASS** (143 passed) | Verified | Tested over Streamable HTTP and SSE via official SDK client. |
| **WooCommerce Tools & Schemas** | **PASS** (53 tests) | **PARTIAL** | Verified against REST v3 mock server and in-memory sandbox. Live store test skipped (`RUN_LIVE_TESTS=true` required). |
| **Docker Containerization** | **PASS** | **PARTIAL** | Multi-stage Dockerfile and health check syntax verified; live daemon was offline during testing. |
| **Kubernetes & Helm** | **PASS** | **PARTIAL** | Manifests and Helm templates validated (`kustomize`, `helm:validate`); live cluster deployment unverified. |

## End-to-End Acceptance Scenarios (Scenarios A–G)

| Scenario | Feature | What It Tests | Verification Status |
| :--- | :--- | :--- | :---: |
| **A** | **Storefront Checkout** | Placing a test order with Cash on Delivery (COD) on the storefront and confirming the order appears in WordPress Admin. | **Documented (Manual)**<br/>*Requires live running WordPress store.* |
| **B** | **Chat Agent Tool Loop** | Authenticated User A asks the AI Chat Agent to create a product (`wc__create_product`) and query today's orders (`wc__list_orders`) with PII stripped. | **PASS (Automated)**<br/>*Verified in `tests/integration/acceptance-scenarios.test.ts` (B1, B2).* |
| **C** | **External Client & Multi-Upstream** | User B connects via external MCP client using their personal key; verifies tool discovery across all 3 upstreams and executes cross-upstream tool calls. | **PASS (Automated)**<br/>*Verified in `acceptance-scenarios.test.ts` (C1, C2).* |
| **D** | **API Key Revocation** | User B's key is revoked from the auth service/dashboard; subsequent requests immediately return HTTP 401 Unauthorized. | **PASS (Automated)**<br/>*Verified in `acceptance-scenarios.test.ts` (D1).* |
| **E** | **Upstream Management** | Disabling the Inventory upstream dynamically purges all `inv__*` tools from the MCP discovery catalog; re-enabling restores them. | **PASS (Automated)**<br/>*Verified in `acceptance-scenarios.test.ts` (E1).* |
| **F** | **Failure Isolation** | Simulating a failed/crashed upstream returns a structured `isError: true` ToolResult without crashing the gateway; other upstreams continue operating. | **PASS (Automated)**<br/>*Verified in `acceptance-scenarios.test.ts` (F1, F2, F3).* |
| **G** | **Audit Logging** | Audit log records user identity (`user_a`, `user_b`), tool called, upstream server, duration in ms, and outcome without leaking credentials. | **PASS (Automated)**<br/>*Verified in `acceptance-scenarios.test.ts` (G1, G2).* |

## Docker

Build the image:

```bash
docker build -t woocommerce-mcp-gateway:local .
```

Run the container:

```bash
docker run --rm -p 3000:3000 --env-file .env woocommerce-mcp-gateway:local
```

Check the health endpoint:

```bash
curl http://localhost:3000/healthz
```

## Kubernetes and Helm

Build the Docker image:

```bash
docker build -t woocommerce-mcp-gateway:local .
```

Install the Helm chart for local Kubernetes:

```bash
helm install woocommerce-mcp ./helm/woocommerce-mcp \
  --namespace woocommerce-mcp \
  --create-namespace \
  -f ./helm/woocommerce-mcp/values-local.yaml
```

For a k3s deployment, use the production values file:

```bash
helm install woocommerce-mcp ./helm/woocommerce-mcp \
  --namespace woocommerce-mcp \
  --create-namespace \
  -f ./helm/woocommerce-mcp/values-prod.yaml
```

Check the deployment:

```bash
kubectl get pods,services,pvc -n woocommerce-mcp
```

Check rollout status:

```bash
kubectl rollout status deployment/woocommerce-mcp-gateway \
  -n woocommerce-mcp
```

Upgrade the release:

```bash
helm upgrade woocommerce-mcp ./helm/woocommerce-mcp \
  --namespace woocommerce-mcp \
  -f ./helm/woocommerce-mcp/values-local.yaml
```

Rollback the release:

```bash
helm rollback woocommerce-mcp 1 -n woocommerce-mcp
```

Configure local hostnames and Ingress according to the Helm values and cluster setup. Keep the WooCommerce MCP server private within the cluster.

## Security

- Store credentials in environment variables or Kubernetes Secrets.
- Keep upstream credentials on the server.
- Use individual API keys and role-based authorization.
- Revoke compromised keys promptly.
- Validate tool inputs and sanitize errors.
- Avoid logging secrets or sensitive customer information.
- Restrict upstream access and apply request timeouts.

## Known Limitations & Architecture Tradeoffs

1. **Mock / Sandbox Fallback Mode**: When the target WooCommerce store is unreachable (`ENOTFOUND`, `ECONNREFUSED`, `fetch failed`) or configured with a `.local` URL, the client responds using an in-memory sandbox store so development demos and automated tests operate without external network dependencies. For live production stores, ensure a routable HTTPS URL with valid API keys is provided.
2. **Pod-Scoped In-Memory Rate Limiting**: The built-in rate limiter operates in-memory per pod replica. In multi-pod Kubernetes deployments, rate limits apply per replica. For synchronized global rate limiting across pods, an external store (such as Redis) is recommended for production scale.
3. **SSE Session Affinity**: The legacy Server-Sent Events transport (`/sse` & `/messages`) is stateful and requires sticky sessions (`sessionAffinity: ClientIP`) across multiple Kubernetes pod replicas. Clients are strongly recommended to use the stateless Streamable HTTP transport (`/mcp`), which works seamlessly with standard round-robin ClusterIP load balancing.
4. **Storage Persistence**: In Kubernetes, the gateway pod runs with `readOnlyRootFilesystem: true`. Persistent data (API keys, users, audit logs) is mapped to `/usr/src/app/data` backed by a PersistentVolumeClaim (`k8s/pvc.yaml`). Temporary system files use a mounted `emptyDir` at `/tmp`.

## Troubleshooting

**Gateway cannot reach WooCommerce**

Verify the store URL, network access, REST API credentials, and upstream timeout configuration. A local-only hostname will not resolve from a remote deployment.

**MCP client receives an authentication error**

Check whether gateway authentication is enabled and configure the correct authorization header.

**Kubernetes pods are not ready**

```bash
kubectl get pods -n woocommerce-mcp
kubectl describe pod <pod-name> -n woocommerce-mcp
kubectl logs <pod-name> -n woocommerce-mcp
```

**Dashboard does not load**

Verify that the dashboard frontend is built, its route is served by the deployed application, and its backend API is reachable.

## Further Documentation

See the `docs/` directory for architecture, deployment, testing, and security documentation.
