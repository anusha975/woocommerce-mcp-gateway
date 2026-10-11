import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { Server } from 'http';
import { startGatewayServer, type RunningServer } from '../../src/gateway/server.js';
import type { AppConfig } from '../../src/types/index.js';
import {
  mockRawProductsList,
  mockRawProductDetail,
  mockRawOrdersList,
  mockRawOrderDetail,
} from '../fixtures/woocommerce.fixtures.js';

describe('Module 10: End-to-End MCP Gateway Verification', () => {
  let mockWcServer: Server;
  let mockWcPort: number;
  let gatewayServer: RunningServer;
  let gatewayPort: number;
  const testApiKey = 'wc_e2e_secret_token_888';

  beforeAll(async () => {
    // 1. Setup mock WooCommerce REST API v3 Server on ephemeral port
    const wcApp: Express = express();
    wcApp.use(express.json());

    // Basic Auth validator
    wcApp.use((req, res, next) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        res.status(401).json({ code: 'woocommerce_rest_cannot_view', message: 'Sorry, you cannot view this resource.' });
        return;
      }
      next();
    });

    // Mock products endpoints
    wcApp.get('/wp-json/wc/v3/products', (req, res) => {
      if (req.query.search === 'nonexistent-item-999') {
        res.json([]);
        return;
      }
      res.setHeader('X-WP-Total', '2');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawProductsList);
    });

    wcApp.get('/wp-json/wc/v3/products/:id', (req, res) => {
      const id = Number(req.params.id);
      if (id === 101) {
        res.json(mockRawProductDetail);
      } else if (id === 500) {
        res.status(500).json({ code: 'internal_server_error', message: 'Fatal upstream error occurred' });
      } else {
        res.status(404).json({ code: 'woocommerce_rest_product_invalid_id', message: 'Invalid product ID.' });
      }
    });

    // Mock orders endpoints
    wcApp.get('/wp-json/wc/v3/orders', (_req, res) => {
      res.setHeader('X-WP-Total', '1');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawOrdersList);
    });

    wcApp.get('/wp-json/wc/v3/orders/:id', (req, res) => {
      const id = Number(req.params.id);
      if (id === 2001) {
        res.json(mockRawOrderDetail);
      } else {
        res.status(404).json({ code: 'woocommerce_rest_order_invalid_id', message: 'Invalid order ID.' });
      }
    });

    // Start mock WooCommerce server
    await new Promise<void>((resolve) => {
      mockWcServer = wcApp.listen(0, '127.0.0.1', () => {
        const addr = mockWcServer.address();
        if (addr && typeof addr === 'object') {
          mockWcPort = addr.port;
        }
        resolve();
      });
    });

    // 2. Start MCP Gateway configured to talk to mock WooCommerce
    gatewayPort = mockWcPort + 10;
    const testConfig: AppConfig = {
      env: 'test',
      port: gatewayPort,
      host: '127.0.0.1',
      logLevel: 'silent',
      gatewayApiKey: testApiKey,
      security: {
        gatewayApiKey: testApiKey,
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 100,
        corsAllowedOrigins: ['*'],
        maxBodySizeBytes: 1048576,
      },
      woocommerce: {
        url: `http://127.0.0.1:${mockWcPort}`,
        consumerKey: 'ck_mock_test_key',
        consumerSecret: 'cs_mock_test_secret',
        timeoutMs: 5000,
        verifySsl: false,
      },
    };

    gatewayServer = await startGatewayServer(testConfig);
  });

  afterAll(async () => {
    if (gatewayServer) {
      await gatewayServer.stop();
    }
    if (mockWcServer) {
      await new Promise<void>((resolve) => mockWcServer.close(() => resolve()));
    }
  });

  function parseMcpResponseBody(text: string): Record<string, unknown> {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as Record<string, unknown>;
    }
    const lines = trimmed.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6).trim();
        if (dataStr) {
          return JSON.parse(dataStr) as Record<string, unknown>;
        }
      }
    }
    throw new Error(`Unparseable MCP response body: ${trimmed.substring(0, 100)}`);
  }

  // Helper to send authenticated JSON-RPC requests to Streamable HTTP endpoint
  async function sendMcpRequest(payload: Record<string, unknown>, apiKey = testApiKey) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const status = response.status;
    let json: Record<string, unknown> | null = null;
    const text = await response.text();
    if (text) {
      try {
        json = parseMcpResponseBody(text);
      } catch {
        json = null;
      }
    }

    return { status, json, text };
  }

  // 1. Verification of Application Startup
  it('1. Application starts successfully with valid configuration', async () => {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/healthz`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  // 2. Gateway Authentication & Rejection
  it('2. Gateway rejects invalid or missing credentials on protected routes', async () => {
    const resNoAuth = await sendMcpRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, '');
    expect(resNoAuth.status).toBe(401);

    const resBadAuth = await sendMcpRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, 'bad-token');
    expect(resBadAuth.status).toBe(401);
  });

  // 3. MCP Protocol Initialization
  it('3. MCP client can initialize a session via Streamable HTTP', async () => {
    const { status, json } = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'init-e2e',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'e2e-test-runner', version: '1.0.0' },
      },
    });

    expect(status).toBe(200);
    expect(json).toBeDefined();
    expect(json?.jsonrpc).toBe('2.0');
    expect(json?.id).toBe('init-e2e');
    const result = json?.result as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.protocolVersion).toBe('2024-11-05');
    expect(result.serverInfo).toBeDefined();
  });

  // 4. Tools Discovery
  it('4. MCP client can list all registered tools', async () => {
    const { status, json } = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'list-tools-e2e',
      method: 'tools/list',
      params: {},
    });

    expect(status).toBe(200);
    const result = json?.result as { tools: Array<{ name: string; description: string; inputSchema: unknown }> };
    expect(result?.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThanOrEqual(11);

    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('health_check');
    expect(toolNames).toContain('list_products');
    expect(toolNames).toContain('search_products');
    expect(toolNames).toContain('get_product');
    expect(toolNames).toContain('get_low_stock_products');
    expect(toolNames).toContain('create_product');
    expect(toolNames).toContain('list_recent_orders');
    expect(toolNames).toContain('list_orders');
    expect(toolNames).toContain('get_order');
    expect(toolNames).toContain('search_orders_by_status');
    expect(toolNames).toContain('get_order_summary');
    expect(toolNames).toContain('update_order_status');
  });

  // 5. Invoke health_check Tool
  it('5. MCP client can invoke health_check diagnostic tool', async () => {
    const { status, json } = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-health-e2e',
      method: 'tools/call',
      params: {
        name: 'health_check',
        arguments: { verbose: true },
      },
    });

    expect(status).toBe(200);
    const result = json?.result as { content: Array<{ type: string; text: string }> };
    expect(result?.content).toBeDefined();
    expect(result.content[0]?.type).toBe('text');
    const parsed = JSON.parse(result.content[0]?.text ?? '{}') as { status: string; service: string };
    expect(parsed.status).toBe('healthy');
    expect(parsed.service).toBe('woocommerce-mcp-gateway');
  });

  // 6. Invoke Product Tools
  it('6. MCP client can list products and retrieve a specific product', async () => {
    // List products
    const listRes = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-list-products-e2e',
      method: 'tools/call',
      params: {
        name: 'list_products',
        arguments: { per_page: 5 },
      },
    });
    expect(listRes.status).toBe(200);
    const listResult = listRes.json?.result as { content: Array<{ type: string; text: string }> };
    const parsedList = JSON.parse(listResult.content[0]?.text ?? '{}') as { items: Array<{ id: number; name: string }> };
    expect(parsedList.items.length).toBe(2);
    expect(parsedList.items[0]?.name).toBe('Classic Leather Jacket');

    // Get single product
    const getRes = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-get-product-e2e',
      method: 'tools/call',
      params: {
        name: 'get_product',
        arguments: { id: 101 },
      },
    });
    expect(getRes.status).toBe(200);
    const getResult = getRes.json?.result as { content: Array<{ type: string; text: string }> };
    const parsedProduct = JSON.parse(getResult.content[0]?.text ?? '{}') as { id: number; sku: string };
    expect(parsedProduct.id).toBe(101);
    expect(parsedProduct.sku).toBe('JKT-LTH-01');
  });

  // 7. Invoke Order Tools & Verify Customer PII Exclusion
  it('7. MCP client can list orders, retrieve order summary, and customer PII is excluded', async () => {
    // List recent orders
    const listOrdersRes = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-list-orders-e2e',
      method: 'tools/call',
      params: {
        name: 'list_recent_orders',
        arguments: { per_page: 5 },
      },
    });
    expect(listOrdersRes.status).toBe(200);
    const listOrdersResult = listOrdersRes.json?.result as { content: Array<{ type: string; text: string }> };
    const rawListText = listOrdersResult.content[0]?.text ?? '';
    expect(rawListText).toContain('2001');

    // Verify PII is NOT in text
    expect(rawListText).not.toContain('jane.doe@example-sensitive.com');
    expect(rawListText).not.toContain('555-0199');
    expect(rawListText).not.toContain('123 Confidential Way');

    // Get order summary
    const summaryRes = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-summary-order-e2e',
      method: 'tools/call',
      params: {
        name: 'get_order_summary',
        arguments: { id: 2001 },
      },
    });
    expect(summaryRes.status).toBe(200);
    const summaryResult = summaryRes.json?.result as { content: Array<{ type: string; text: string }> };
    const rawSummaryText = summaryResult.content[0]?.text ?? '';
    const parsedSummary = JSON.parse(rawSummaryText) as { id: number; status: string; total: string };
    expect(parsedSummary.id).toBe(2001);
    expect(parsedSummary.total).toBe('234.49');

    // Strict PII check on summary
    expect(rawSummaryText).not.toContain('jane.doe');
    expect(rawSummaryText).not.toContain('555-0199');
  });

  // 8. Result Schema Conformance
  it('8. Tool outputs strictly conform to the MCP ToolResult schema', async () => {
    const res = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-schema-check-e2e',
      method: 'tools/call',
      params: {
        name: 'get_low_stock_products',
        arguments: { threshold: 20 },
      },
    });

    expect(res.status).toBe(200);
    const result = res.json?.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]?.type).toBe('text');
    expect(typeof result.content[0]?.text).toBe('string');
  });

  // 9. Upstream WooCommerce Failures Handled Safely
  it('9. Upstream WooCommerce failures return structured tool errors without leaking credentials', async () => {
    // 404 Product Not Found
    const res404 = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-upstream-404-e2e',
      method: 'tools/call',
      params: {
        name: 'get_product',
        arguments: { id: 999999 },
      },
    });

    expect(res404.status).toBe(200);
    const result404 = res404.json?.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result404.isError).toBe(true);
    expect(result404.content[0]?.text).toContain('not found');
    expect(result404.content[0]?.text).not.toContain('cs_mock_test_secret');

    // 500 Upstream Server Error
    const res500 = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-upstream-500-e2e',
      method: 'tools/call',
      params: {
        name: 'get_product',
        arguments: { id: 500 },
      },
    });

    expect(res500.status).toBe(200);
    const result500 = res500.json?.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result500.isError).toBe(true);
    expect(result500.content[0]?.text).toContain('server error (HTTP 500)');
    expect(result500.content[0]?.text).not.toContain('cs_mock_test_secret');
  });

  // 10. Invalid Inputs Rejected Cleanly
  it('10. Invalid tool inputs are rejected via schema validation without crashing', async () => {
    const resBadInput = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'call-invalid-input-e2e',
      method: 'tools/call',
      params: {
        name: 'get_product',
        arguments: { id: -50 }, // Invalid negative ID
      },
    });

    expect(resBadInput.status).toBe(200);
    const result = resBadInput.json?.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('validation error');
  });

  // 11. Secrets and PII not exposed in logs or outputs
  it('11. Secrets and credentials never appear in API responses', async () => {
    const res = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 'check-secrets-leak',
      method: 'tools/call',
      params: {
        name: 'health_check',
        arguments: { verbose: true },
      },
    });

    const bodyString = JSON.stringify(res.json);
    expect(bodyString).not.toContain('cs_mock_test_secret');
    expect(bodyString).not.toContain('ck_mock_test_key');
    expect(bodyString).not.toContain(testApiKey);
  });

  // 12. Emulated Service Routing
  it('12. Root and discovery endpoints respond to simulated ClusterIP traffic', async () => {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/`);
    expect(res.status).toBe(200);
    const meta = (await res.json()) as { service: string; mcpEndpoints: Record<string, string> };
    expect(meta.service).toBe('woocommerce-mcp-gateway');
    expect(meta.mcpEndpoints.streamableHttp).toBe('/mcp');
  });

  // 13. Readiness and Liveness Probes
  it('13. Readiness (/readyz) and Liveness (/healthz) probes respond with HTTP 200', async () => {
    const [liveness, readiness] = await Promise.all([
      fetch(`http://127.0.0.1:${gatewayPort}/healthz`),
      fetch(`http://127.0.0.1:${gatewayPort}/readyz`),
    ]);

    expect(liveness.status).toBe(200);
    expect(readiness.status).toBe(200);
  });
});
