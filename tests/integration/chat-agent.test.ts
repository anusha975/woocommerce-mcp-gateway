import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import express, { type Express } from 'express';
import { createGatewayApp } from '../../src/gateway/app.js';
import type { AppConfig } from '../../src/types/index.js';
import {
  mockRawProductsList,
  mockRawProductDetail,
  mockRawOrdersList,
} from '../fixtures/woocommerce.fixtures.js';

describe('Chat Agent & Tool Calling Integration', () => {
  let mockWcServer: Server;
  let mockWcPort: number;
  let gatewayAppInstance: ReturnType<typeof createGatewayApp>;
  let gatewayHttpServer: Server;
  let gatewayPort: number;
  const adminKey = 'wc_test_chat_admin_key_777';

  beforeAll(async () => {
    // 1. Mock WooCommerce Upstream API
    const wcApp: Express = express();
    wcApp.use(express.json());

    wcApp.get('/wp-json/wc/v3/products', (_req, res) => {
      res.setHeader('X-WP-Total', '2');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawProductsList);
    });

    wcApp.post('/wp-json/wc/v3/products', (req, res) => {
      res.status(201).json({
        id: 9991,
        name: req.body.name,
        price: req.body.regular_price,
        stock_status: 'instock',
      });
    });

    wcApp.get('/wp-json/wc/v3/products/:id', (req, res) => {
      const id = Number(req.params.id);
      res.json({ ...mockRawProductDetail, id });
    });

    wcApp.get('/wp-json/wc/v3/orders', (_req, res) => {
      res.setHeader('X-WP-Total', '1');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawOrdersList);
    });

    mockWcServer = await new Promise((resolve) => {
      const s = wcApp.listen(0, '127.0.0.1', () => resolve(s));
    });
    mockWcPort = (mockWcServer.address() as { port: number }).port;

    // 2. Start Gateway Server with seeded Admin Key
    const testConfig: AppConfig = {
      env: 'test',
      port: 0,
      host: '127.0.0.1',
      logLevel: 'silent',
      gatewayApiKey: adminKey,
      dataDir: './data-test-chat',
      security: {
        gatewayApiKey: adminKey,
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 1000,
        corsAllowedOrigins: ['*'],
        maxBodySizeBytes: 1048576,
      },
      woocommerce: {
        url: `http://127.0.0.1:${mockWcPort}`,
        consumerKey: 'ck_mock_key',
        consumerSecret: 'cs_mock_secret',
        timeoutMs: 5000,
        verifySsl: false,
      },
    };

    gatewayAppInstance = createGatewayApp(testConfig);
    gatewayHttpServer = await new Promise((resolve) => {
      const s = gatewayAppInstance.app.listen(0, '127.0.0.1', () => resolve(s));
    });
    gatewayPort = (gatewayHttpServer.address() as { port: number }).port;
  });

  afterAll(async () => {
    await gatewayAppInstance.cleanup();
    await new Promise((resolve) => gatewayHttpServer.close(resolve));
    await new Promise((resolve) => mockWcServer.close(resolve));
  });

  it('1. Rejects unauthenticated chat requests with HTTP 401', async () => {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'List products' }),
    });

    expect(res.status).toBe(401);
  });

  it('2. Rejects empty chat message with HTTP 400', async () => {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({ message: '   ' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('message string is required');
  });

  it('3. Creates a product via the chat agent using the gateway MCP tool calling loop', async () => {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({
        message: 'Please create a product named "Organic Coffee Beans" with price 19.99',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      reply: string;
      toolsCalled: Array<{ tool: string; success: boolean; arguments: Record<string, unknown> }>;
      durationMs: number;
    };

    expect(data.reply).toContain('Organic Coffee Beans');
    expect(data.toolsCalled.length).toBeGreaterThanOrEqual(1);
    expect(data.toolsCalled[0]?.tool).toContain('create_product');
    expect(data.toolsCalled[0]?.success).toBe(true);
    expect(data.toolsCalled[0]?.arguments['name']).toBe('Organic Coffee Beans');
  });

  it('4. Queries recent store orders and strips customer PII', async () => {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({
        message: 'What are today orders?',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      reply: string;
      toolsCalled: Array<{ tool: string; success: boolean }>;
    };

    expect(data.reply).toContain('orders');
    expect(data.toolsCalled.length).toBeGreaterThanOrEqual(1);
    expect(data.toolsCalled[0]?.success).toBe(true);

    // Verify raw PII does not leak in the natural language reply
    expect(data.reply).not.toContain('john.doe@example.com');
  });

  it('5. Invokes warehouse upstream tool for physical inventory check', async () => {
    gatewayAppInstance.upstreamService.setUpstreamEnabled('ups_inventory', true);

    const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({
        message: 'Check warehouse stock for SKU WOO-HOODIE',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      reply: string;
      toolsCalled: Array<{ tool: string; success: boolean; result: unknown }>;
    };

    expect(data.toolsCalled.length).toBeGreaterThanOrEqual(1);
    expect(data.toolsCalled[0]?.tool).toBe('inv__check_warehouse_stock');
    expect(data.toolsCalled[0]?.success).toBe(true);
    expect(data.reply).toContain('WOO-HOODIE');
  });

  it('6. Verifies that every chat tool execution generates an audit log record', async () => {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/audit?limit=20`, {
      headers: {
        Authorization: `Bearer ${adminKey}`,
      },
    });

    expect(res.status).toBe(200);
    const logs = (await res.json()) as Array<{
      toolName: string;
      username: string;
      success: boolean;
      durationMs: number;
    }>;

    expect(logs.length).toBeGreaterThanOrEqual(3);
    const toolNames = logs.map((l) => l.toolName);
    expect(toolNames.some((n) => n.includes('product') || n.includes('stock'))).toBe(true);

    for (const log of logs) {
      expect(log.username).toBeDefined();
      expect(typeof log.durationMs).toBe('number');
    }
  });
});
