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

## Running Tests

Run the complete test suite:

```bash
npm test
```

Run unit tests:

```bash
npm run test:unit
```

Run integration tests:

```bash
npm run test:integration
```

Run chat agent tests:

```bash
npm run test:chat
```

Run acceptance tests:

```bash
npm run test:acceptance
```

Run type checking and linting:

```bash
npm run typecheck
npm run lint
```

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
