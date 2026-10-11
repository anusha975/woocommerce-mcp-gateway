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
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

describe('End-to-End Acceptance Scenarios (Modules B through G)', () => {
  let mockWcServer: Server;
  let mockWcPort: number;
  let gatewayAppInstance: ReturnType<typeof createGatewayApp>;
  let gatewayHttpServer: Server;
  let gatewayPort: number;

  const adminApiKey = 'wc_acceptance_admin_secret_key_888';
  let userAKey = '';
  let userBKey = '';
  let userBKeyId = '';

  beforeAll(async () => {
    // 1. Mock WooCommerce Upstream Store
    const wcApp: Express = express();
    wcApp.use(express.json());

    wcApp.get('/wp-json/wc/v3/products', (_req, res) => {
      res.setHeader('X-WP-Total', '2');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawProductsList);
    });

    wcApp.post('/wp-json/wc/v3/products', (req, res) => {
      res.status(201).json({
        id: 7001,
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

    // 2. Start Gateway Server
    const config: AppConfig = {
      env: 'test',
      port: 0,
      host: '127.0.0.1',
      logLevel: 'silent',
      gatewayApiKey: adminApiKey,
      dataDir: './data-acceptance-tests',
      security: {
        gatewayApiKey: adminApiKey,
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 2000,
        corsAllowedOrigins: ['*'],
        maxBodySizeBytes: 1048576,
      },
      woocommerce: {
        url: `http://127.0.0.1:${mockWcPort}`,
        consumerKey: 'ck_mock_acc_key',
        consumerSecret: 'cs_mock_acc_secret',
        timeoutMs: 5000,
        verifySsl: false,
      },
    };

    gatewayAppInstance = createGatewayApp(config);
    gatewayAppInstance.store.clearAll();
    gatewayAppInstance.authService.seedDefaultUsersAndKeys(adminApiKey);
    gatewayAppInstance.upstreamService.seedDefaultUpstreams(`http://127.0.0.1:3000`, false);

    // Enable all 3 upstreams
    gatewayAppInstance.upstreamService.setUpstreamEnabled('ups_inventory', true);
    gatewayAppInstance.upstreamService.setUpstreamEnabled('ups_support', true);

    // Seed distinct User A and User B
    const userA = gatewayAppInstance.authService.createUser('user_a', 'member');
    const keyAResult = gatewayAppInstance.authService.createApiKey(userA.id, 'User A Personal Key');
    userAKey = keyAResult.rawKey;

    const userB = gatewayAppInstance.authService.createUser('user_b', 'member');
    const keyBResult = gatewayAppInstance.authService.createApiKey(userB.id, 'User B External Client Key');
    userBKey = keyBResult.rawKey;
    userBKeyId = keyBResult.keyRecord.id;

    gatewayHttpServer = await new Promise((resolve) => {
      const s = gatewayAppInstance.app.listen(0, '127.0.0.1', () => resolve(s));
    });
    gatewayPort = (gatewayHttpServer.address() as { port: number }).port;
  });

  afterAll(async () => {
    if (gatewayAppInstance) {
      await gatewayAppInstance.cleanup();
    }
    if (gatewayHttpServer) {
      await new Promise((resolve) => gatewayHttpServer.close(resolve));
    }
    if (mockWcServer) {
      await new Promise((resolve) => mockWcServer.close(resolve));
    }
  });

  // ===========================================================================
  // SCENARIO B: User A and Chat Agent
  // ===========================================================================
  describe('Scenario B: User A and Chat Agent', () => {
    it('B1. Authenticates User A and creates a product through chat tool calling', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAKey}`,
        },
        body: JSON.stringify({
          message: 'Create a product called "Specialty Roast Coffee" with price 28.50',
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        reply: string;
        toolsCalled: Array<{ tool: string; success: boolean }>;
      };

      expect(data.reply).toContain('Specialty Roast Coffee');
      expect(data.toolsCalled.some((t) => t.tool.includes('create_product') && t.success)).toBe(true);
    });

    it('B2. User A asks for orders and verifies response uses actual tool results', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAKey}`,
        },
        body: JSON.stringify({
          message: "What are today's store orders?",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        reply: string;
        toolsCalled: Array<{ tool: string; success: boolean }>;
      };

      expect(data.toolsCalled.some((t) => t.tool.includes('orders') && t.success)).toBe(true);
      expect(data.reply).toContain('orders');
    });
  });

  // ===========================================================================
  // SCENARIO C: User B and External MCP Client
  // ===========================================================================
  describe('Scenario C: User B and External MCP Client', () => {
    it('C1. Connects external MCP client using User B key and discovers tools from all enabled upstreams', async () => {
      const client = new Client(
        { name: 'external-client-user-b', version: '1.0.0' },
        { capabilities: {} }
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${gatewayPort}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${userBKey}`,
            },
          },
        }
      );

      await client.connect(transport);

      const toolsList = await client.listTools();
      expect(toolsList.tools).toBeDefined();
      const toolNames = toolsList.tools.map((t) => t.name);

      // Verify WooCommerce upstream tools
      expect(toolNames).toContain('list_products');
      expect(toolNames).toContain('create_product');
      expect(toolNames).toContain('list_orders');

      // Verify Warehouse Inventory upstream tools
      expect(toolNames).toContain('inv__check_warehouse_stock');
      expect(toolNames).toContain('inv__list_suppliers');

      // Verify Customer Support upstream tools
      expect(toolNames).toContain('sup__get_vip_status');
      expect(toolNames).toContain('sup__initiate_return_request');

      await client.close();
    });

    it('C2. User B performs queries requiring tools from distinct upstream servers', async () => {
      const client = new Client(
        { name: 'external-client-user-b-calls', version: '1.0.0' },
        { capabilities: {} }
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${gatewayPort}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${userBKey}`,
            },
          },
        }
      );

      await client.connect(transport);

      // 1. Tool call on WooCommerce upstream
      const wcResult = await client.callTool({
        name: 'get_product',
        arguments: { id: 101 },
      });
      expect(wcResult.content).toBeDefined();
      expect(wcResult.isError).toBeFalsy();

      // 2. Tool call on Warehouse Inventory upstream
      const invResult = await client.callTool({
        name: 'inv__check_warehouse_stock',
        arguments: { sku: 'WOO-HOODIE' },
      });
      expect(invResult.content).toBeDefined();
      expect(invResult.isError).toBeFalsy();
      const contentList = invResult.content as Array<{ type: string; text: string }>;
      const text = contentList[0]?.text;
      expect(text).toContain('Aisle 5');

      await client.close();
    });
  });

  // ===========================================================================
  // SCENARIO D: API Key Revocation
  // ===========================================================================
  describe('Scenario D: API Key Revocation', () => {
    it('D1. Revokes User B key and verifies subsequent requests are rejected with 401', async () => {
      // Admin revokes User B key
      const revokeRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/keys/${userBKeyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminApiKey}`,
        },
      });
      expect(revokeRes.status).toBe(200);

      // Immediate attempt by User B to access gateway
      const rejectedMcp = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userBKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'after-revoke',
          method: 'tools/list',
          params: {},
        }),
      });
      expect(rejectedMcp.status).toBe(401);

      // Verify rejected via REST endpoints as well
      const rejectedRest = await fetch(`http://127.0.0.1:${gatewayPort}/api/tools`, {
        headers: {
          Authorization: `Bearer ${userBKey}`,
        },
      });
      expect(rejectedRest.status).toBe(401);
    });
  });

  // ===========================================================================
  // SCENARIO E: Upstream Management (Disable & Re-enable)
  // ===========================================================================
  describe('Scenario E: Upstream Management Lifecycle', () => {
    it('E1. Disabling upstream removes its tools from discovery; re-enabling restores them', async () => {
      // 1. Disable Inventory upstream
      const disableRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/upstreams/ups_inventory`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({ enabled: false }),
      });
      expect(disableRes.status).toBe(200);

      // 2. Discover tools: inventory tools must be absent
      const toolsDisabledRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/tools`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      const toolsDisabled = (await toolsDisabledRes.json()) as Array<{ name: string }>;
      expect(toolsDisabled.some((t) => t.name.startsWith('inv__'))).toBe(false);

      // 3. Re-enable Inventory upstream
      const enableRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/upstreams/ups_inventory`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({ enabled: true }),
      });
      expect(enableRes.status).toBe(200);

      // 4. Discover tools: inventory tools must return
      const toolsEnabledRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/tools`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      const toolsEnabled = (await toolsEnabledRes.json()) as Array<{ name: string }>;
      expect(toolsEnabled.some((t) => t.name.startsWith('inv__'))).toBe(true);
    });
  });

  // ===========================================================================
  // SCENARIO F: Failure Isolation
  // ===========================================================================
  describe('Scenario F: Failure Isolation', () => {
    let failedUpstreamId = '';

    beforeAll(() => {
      // Register an upstream pointing to an unreachable port
      const ups = gatewayAppInstance.upstreamService.registerUpstream({
        name: 'Unreachable Legacy ERP',
        prefix: 'erp',
        url: 'http://127.0.0.1:59999/mcp',
        transport: 'streamable-http',
      });
      failedUpstreamId = ups.id;
    });

    it('F1. Failed upstream returns clear error without crashing the gateway', async () => {
      const res = await gatewayAppInstance.aggregator.executeToolCall(
        'erp__fetch_ledger',
        {},
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain('Upstream handler for \'erp\' is not available');
    });

    it('F2. Other upstreams continue operating normally when one upstream is unavailable', async () => {
      const res = await gatewayAppInstance.aggregator.executeToolCall(
        'inv__check_warehouse_stock',
        { sku: 'WOO-HOODIE' },
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );

      expect(res.isError).toBeUndefined();
      expect(res.content[0]?.text).toContain('Aisle 5');
    });

    it('F3. Health check marks unreachable upstream as unreachable', async () => {
      const health = await gatewayAppInstance.upstreamService.checkHealth(failedUpstreamId);
      expect(health.status).toBe('unreachable');
      expect(health.error).toBeDefined();
    });
  });

  // ===========================================================================
  // SCENARIO G: Audit Logging
  // ===========================================================================
  describe('Scenario G: Auditing & Zero Credential Leakage', () => {
    it('G1. Every tool call produces a persistent audit record with user identity and duration', async () => {
      const logs = gatewayAppInstance.auditService.getLogs({ limit: 100 });
      expect(logs.length).toBeGreaterThanOrEqual(5);

      for (const log of logs) {
        expect(log.id).toBeDefined();
        expect(log.timestamp).toBeDefined();
        expect(log.username).toBeDefined();
        expect(log.toolName).toBeDefined();
        expect(typeof log.durationMs).toBe('number');
        expect(typeof log.success).toBe('boolean');

        // Verify zero credential leakage
        const serialized = JSON.stringify(log);
        expect(serialized).not.toContain(adminApiKey);
        expect(serialized).not.toContain('ck_mock');
        expect(serialized).not.toContain('cs_mock');
      }
    });

    it('G2. Both success and failure outcomes are recorded properly in audit logs', async () => {
      const logs = gatewayAppInstance.auditService.getLogs({ limit: 100 });
      const hasSuccess = logs.some((l) => l.success === true);
      const hasFailure = logs.some((l) => l.success === false);

      expect(hasSuccess).toBe(true);
      expect(hasFailure).toBe(true);
    });
  });
});
