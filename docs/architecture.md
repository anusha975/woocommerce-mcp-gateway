# Architecture & System Design

The **WooCommerce MCP Gateway** is a specialized, cloud-native microservice that bridges Model Context Protocol (MCP) clients (such as Claude Desktop, Cursor, and custom AI agents) with WooCommerce e-commerce platforms.

---

## 1. High-Level Architecture

The gateway is built on a layered, modular architecture that separates network protocol handling, authentication, MCP tool dispatching, and upstream REST API integration:

```mermaid
graph TD
    Client["MCP Client\n(Claude / Cursor / AI Agent)"]
    
    subgraph K8s["Kubernetes Pod / Container Boundary"]
        subgraph Gateway["Express HTTP & MCP Gateway Server"]
            Auth["Auth Middleware\n(Bearer / X-API-Key)"]
            RateLimit["Rate Limiter\n(Sliding Window)"]
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

---

## 2. Request & Execution Flow

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
            Tool-->>MCP: ToolResult (isError: true, "Invalid arguments")
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

## 3. Core Architectural Components

### A. Modular Layering
- **[`src/config/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/src/config)**: Strict runtime validation using Zod. The gateway terminates immediately during boot (`exit(1)`) if required variables are missing or misconfigured.
- **[`src/gateway/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/src/gateway)**: Express 5 HTTP server hosting both the modern Streamable HTTP MCP transport (`POST /mcp`) and legacy Server-Sent Events (`GET /sse`, `POST /messages`), plus cluster health probes.
- **[`src/connectors/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/src/connectors)**: Resilient HTTP client targeting WooCommerce REST API v3 with configurable timeouts (`AbortController`), bounded response sizes, and exponential backoff retry.
- **[`src/tools/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/src/tools)**: Standardized MCP tools conforming to `@modelcontextprotocol/sdk` schemas and JSON-RPC 2.0 specifications.
- **[`src/middleware/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/src/middleware)**: Security middleware enforcing API token authentication, sliding-window rate limiting, payload bounding, CORS restrictions, and centralized error handling.
- **[`src/logging/`](file:///c:/Users/DELL/OneDrive/Desktop/woocommerce-mcp-gateway/src/logging)**: Structured JSON logger (`pino`) with deep key/value redaction for authentication tokens and credentials.

---

## 4. MCP Transport Strategy

| Transport Mode | Endpoint | Protocol Handling | Scaling Characteristics |
| :--- | :--- | :--- | :--- |
| **Streamable HTTP** *(Primary)* | `POST /mcp` | Stateless per request. Negotiates `protocolVersion: 2024-11-05` and streams SSE response chunks (`event: message\ndata: {...}`). | Scales effortlessly horizontally across multiple Kubernetes replicas with round-robin load balancing (`sessionAffinity: None`). |
| **Server-Sent Events** *(Legacy)* | `GET /sse`<br/>`POST /messages` | Stateful session maintained in memory. Clients hold an open SSE stream and send JSON-RPC commands via `POST /messages?sessionId=...`. | Single-replica only, or requires `sessionAffinity: ClientIP` when deployed with multiple replicas. |

---

## 5. Resilience & Error Handling Philosophy

1. **Fail-Safe Tool Invocation**: If an upstream WooCommerce API call fails (e.g., product not found, invalid store endpoint, or upstream 500 error), the gateway does **not** crash. It catches the error, redacts any embedded secrets, and returns an MCP-compliant result:
   ```json
   {
     "isError": true,
     "content": [
       {
         "type": "text",
         "text": "WooCommerce Product with ID '9999' was not found."
       }
     ]
   }
   ```
2. **Zero Internal Exposure**: Stack traces and raw internal error objects are logged internally at `error` level with secrets redacted, but are never exposed in external HTTP or JSON-RPC responses.
3. **Graceful Termination**: On receiving `SIGTERM` or `SIGINT`, the server stops accepting new connections, drains active in-flight requests within a 30-second window, and closes transports before exiting cleanly.

---

## 6. Dynamic Multi-Store Provisioning Architecture (Bonus)

The gateway supports dynamic runtime provisioning of multiple independent WooCommerce store instances without server reboots or configuration downtime.

### Component Diagram

```mermaid
graph TD
    subgraph Registry["Store Registry Layer (Storage & Service)"]
        StoreService["StoreProvisioningService\n- Prefix Validation & Reservation\n- Key Masking (consumerKeyMasked)\n- EventEmitter (onStoreChanged)"]
        DiskStore["JsonStore (Persistent Disk Storage)\nstores: ProvisionedStore[]"]
    end

    subgraph Runtime["Runtime Aggregation Layer"]
        Aggregator["McpAggregator\n- syncStoreServers()\n- storeServers: Map<prefix, RuntimeStore>"]
        McpServerFactory["createWcServer(storeConfig, client)"]
    end

    subgraph ExternalMCP["MCP Client Transports"]
        Streamable["Streamable HTTP (/mcp)"]
        SSE["SSE Server (/sse)"]
    end

    subgraph Stores["Independent Runtime Store Instances"]
        StorePrimary["Primary Store\nprefix: wc\n(wc__* and canonical)"]
        StoreUS["US Regional Store\nprefix: wcus\n(wcus__* tools)"]
        StoreEU["EU Regional Store\nprefix: wceu\n(wceu__* tools)"]
        StoreSandbox["1-Click Sandbox\nprefix: sandbox\n(sandbox__* tools)"]
    end

    StoreService <--> DiskStore
    StoreService -->|onStoreChanged event| Aggregator
    Aggregator --> McpServerFactory
    McpServerFactory --> StorePrimary & StoreUS & StoreEU & StoreSandbox
    Aggregator --> Streamable & SSE
```

### Architectural Principles

1. **Collision-Free Tool Namespacing**:
   Each provisioned store is identified by a unique validated prefix (e.g., `wcus`, `wceu`). The 12 standard WooCommerce tools are prefixed dynamically (`<prefix>__<tool_name>`). Unprefixed calls default to the primary store for complete backward compatibility.
2. **Runtime Lifecycle & Zero-Downtime Sync**:
   When stores are added (`POST /api/stores`), updated (`PATCH /api/stores/:id`), or deleted (`DELETE /api/stores/:id`), `StoreProvisioningService` emits an `onStoreChanged` event. `McpAggregator` updates its internal runtime maps immediately, updating `tools/list` on external transports (`/mcp`, `/sse`) without dropping active connections.
3. **Cross-Store Failure Isolation**:
   Every store operates through its own `WooCommerceClient` instance. If an upstream store experiences network partition, 500 internal server error, or timeouts, only tools for that specific prefix return structured `{ isError: true }` responses. Healthy neighboring stores continue executing without interruption.
4. **Secret Protection & Telemetry**:
   Consumer keys are masked in all REST representations (`consumerKeyMasked`), and consumer secrets are strictly redacted from API outputs. The `/api/stores/:id/test` diagnostic endpoint executes lightweight operational pings, capturing round-trip latency (`latencyMs`) and connectivity health (`healthy`, `unreachable`).

