import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import express, { type Express } from 'express';
import { createGatewayApp } from '../../src/gateway/app.js';
import type { AppConfig } from '../../src/types/index.js';
import {
  mockRawProductsList,
} from '../fixtures/woocommerce.fixtures.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

describe('Multi-Store Provisioning Bonus Integration Test Suite', () => {
  let mockWcServerPrimary: Server;
  let mockWcPortPrimary: number;

  let mockWcServerUS: Server;
  let mockWcPortUS: number;

  let mockWcServerEU: Server;
  let mockWcPortEU: number;

  let gatewayAppInstance: ReturnType<typeof createGatewayApp>;
  let gatewayHttpServer: Server;
  let gatewayPort: number;

  const adminApiKey = 'gw_admin_multi_store_secret_999';
  let memberApiKey = '';

  let provisionedStoreUSId = '';
  let provisionedStoreEUId = '';

  beforeAll(async () => {
    // 1. Primary WooCommerce Store Mock
    const primaryApp: Express = express();
    primaryApp.use(express.json());
    primaryApp.get('/wp-json/wc/v3/products', (_req, res) => {
      res.setHeader('X-WP-Total', '2');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawProductsList);
    });
    mockWcServerPrimary = await new Promise((resolve) => {
      const s = primaryApp.listen(0, '127.0.0.1', () => resolve(s));
    });
    mockWcPortPrimary = (mockWcServerPrimary.address() as { port: number }).port;

    // 2. Regional Store US Mock (returns US-specific items)
    const usApp: Express = express();
    usApp.use(express.json());
    usApp.get('/wp-json/wc/v3/products', (req, res) => {
      const auth = req.headers.authorization || '';
      if (!auth.includes('Basic ')) {
        res.status(401).json({ code: 'unauthorized', message: 'Missing credentials' });
        return;
      }
      res.json([
        {
          id: 501,
          name: 'US Flag Hoodie (North America Edition)',
          slug: 'us-hoodie',
          regular_price: '49.99',
          price: '49.99',
          status: 'publish',
          stock_status: 'instock',
          stock_quantity: 120,
        },
      ]);
    });
    usApp.get('/wp-json/wc/v3/orders', (_req, res) => {
      res.json([
        {
          id: 9001,
          status: 'processing',
          total: '99.98',
          line_items: [{ id: 1, name: 'US Flag Hoodie', quantity: 2, price: 49.99 }],
        },
      ]);
    });
    mockWcServerUS = await new Promise((resolve) => {
      const s = usApp.listen(0, '127.0.0.1', () => resolve(s));
    });
    mockWcPortUS = (mockWcServerUS.address() as { port: number }).port;

    // 3. Regional Store EU Mock (returns EU-specific items)
    const euApp: Express = express();
    euApp.use(express.json());
    euApp.get('/wp-json/wc/v3/products', (_req, res) => {
      res.json([
        {
          id: 601,
          name: 'EU Organic Linen Shirt (Berlin Edition)',
          slug: 'eu-shirt',
          regular_price: '65.00',
          price: '65.00',
          status: 'publish',
          stock_status: 'instock',
          stock_quantity: 45,
        },
      ]);
    });
    mockWcServerEU = await new Promise((resolve) => {
      const s = euApp.listen(0, '127.0.0.1', () => resolve(s));
    });
    mockWcPortEU = (mockWcServerEU.address() as { port: number }).port;

    // 4. Start Unified MCP Gateway
    const config: AppConfig = {
      env: 'test',
      port: 0,
      host: '127.0.0.1',
      logLevel: 'silent',
      gatewayApiKey: adminApiKey,
      dataDir: './data-multi-store-tests',
      security: {
        gatewayApiKey: adminApiKey,
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 5000,
        corsAllowedOrigins: ['*'],
        maxBodySizeBytes: 1048576,
      },
      woocommerce: {
        url: `http://127.0.0.1:${mockWcPortPrimary}`,
        consumerKey: 'ck_mock_primary',
        consumerSecret: 'cs_mock_primary',
        timeoutMs: 5000,
        verifySsl: false,
      },
    };

    gatewayAppInstance = createGatewayApp(config);
    gatewayAppInstance.store.clearAll();
    gatewayAppInstance.authService.seedDefaultUsersAndKeys(adminApiKey);
    gatewayAppInstance.upstreamService.seedDefaultUpstreams(`http://127.0.0.1:3000`, false);
    gatewayAppInstance.storeService.seedDefaultStore(config);

    // Create a member user to test RBAC restrictions
    const member = gatewayAppInstance.authService.createUser('store_operator', 'member');
    const memberKey = gatewayAppInstance.authService.createApiKey(member.id, 'Operator Key');
    memberApiKey = memberKey.rawKey;

    gatewayHttpServer = await new Promise((resolve) => {
      const s = gatewayAppInstance.app.listen(0, '127.0.0.1', () => resolve(s));
    });
    gatewayPort = (gatewayHttpServer.address() as { port: number }).port;
  });

  afterAll(async () => {
    await gatewayAppInstance.cleanup();
    await new Promise<void>((r) => gatewayHttpServer.close(() => r()));
    await new Promise<void>((r) => mockWcServerPrimary.close(() => r()));
    await new Promise<void>((r) => mockWcServerUS.close(() => r()));
    await new Promise<void>((r) => mockWcServerEU.close(() => r()));
  });

  // ===========================================================================
  // 1. STORE REGISTRY & SEEDING VERIFICATION
  // ===========================================================================
  describe('1. Store Registry & Seeding', () => {
    it('1.1 Seeds default primary store automatically on startup', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      expect(res.status).toBe(200);
      const stores = (await res.json()) as Array<{ prefix: string; name: string }>;
      expect(stores.length).toBeGreaterThanOrEqual(1);
      const primary = stores.find((s) => s.prefix === 'wc');
      expect(primary).toBeDefined();
      expect(primary?.name).toContain('Primary');
    });

    it('1.2 Strictly masks consumer keys and redacts consumer secrets', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      const stores = await res.json();
      const rawText = JSON.stringify(stores);
      expect(rawText).not.toContain('cs_mock_primary');
      expect(rawText).toContain('consumerKeyMasked');
    });
  });

  // ===========================================================================
  // 2. DYNAMIC PROVISIONING LIFECYCLE
  // ===========================================================================
  describe('2. Dynamic Provisioning Lifecycle', () => {
    it('2.1 Provisions North America regional store (prefix: wcus)', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({
          name: 'North America Storefront',
          prefix: 'wcus',
          url: `http://127.0.0.1:${mockWcPortUS}`,
          consumerKey: 'ck_us_prod_key',
          consumerSecret: 'cs_us_prod_secret',
          description: 'Regional US & Canada fulfillment store',
        }),
      });

      expect(res.status).toBe(201);
      const store = (await res.json()) as { id: string; prefix: string; name: string };
      expect(store.id).toBeDefined();
      expect(store.prefix).toBe('wcus');
      expect(store.name).toBe('North America Storefront');
      provisionedStoreUSId = store.id;
    });

    it('2.2 Provisions European regional store (prefix: wceu)', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({
          name: 'European Union Storefront',
          prefix: 'wceu',
          url: `http://127.0.0.1:${mockWcPortEU}`,
          consumerKey: 'ck_eu_prod_key',
          consumerSecret: 'cs_eu_prod_secret',
          description: 'Regional EU fulfillment center in Frankfurt',
        }),
      });

      expect(res.status).toBe(201);
      const store = (await res.json()) as { id: string; prefix: string };
      expect(store.prefix).toBe('wceu');
      provisionedStoreEUId = store.id;
    });

    it('2.3 Provisions instant zero-config sandbox store via 1-click endpoint', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores/sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({
          name: 'Demo Sandbox Store',
          prefix: 'sandbox',
        }),
      });

      expect(res.status).toBe(201);
      const store = (await res.json()) as { prefix: string; isSandbox: boolean };
      expect(store.prefix).toBe('sandbox');
      expect(store.isSandbox).toBe(true);
    });

    it('2.4 Enforces prefix collision prevention', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({
          name: 'Duplicate US Store',
          prefix: 'wcus', // Already taken
          url: 'http://127.0.0.1:8080',
          consumerKey: 'ck_duplicate',
          consumerSecret: 'cs_duplicate',
        }),
      });

      expect(res.status).toBe(400);
      const err = (await res.json()) as { error?: string };
      expect(err.error).toContain('already provisioned');
    });

    it('2.5 Enforces reserved prefix protection', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({
          name: 'Fake Inventory Store',
          prefix: 'inv', // Reserved for inventory upstream
          url: 'http://127.0.0.1:8080',
          consumerKey: 'ck_fake',
          consumerSecret: 'cs_fake',
        }),
      });

      expect(res.status).toBe(400);
      const err = (await res.json()) as { error?: string };
      expect(err.error).toContain('reserved');
    });
  });

  // ===========================================================================
  // 3. DYNAMIC MULTI-STORE TOOL DISCOVERY
  // ===========================================================================
  describe('3. Dynamic Multi-Store Tool Discovery', () => {
    it('3.1 Tools catalog lists namespaced tools for each provisioned store', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/tools`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      expect(res.status).toBe(200);
      const tools = (await res.json()) as Array<{ name: string; upstreamPrefix: string }>;

      // Core Storefront Tools
      expect(tools.some((t) => t.name === 'wc__list_products')).toBe(true);

      // US Storefront Tools
      expect(tools.some((t) => t.name === 'wcus__list_products')).toBe(true);
      expect(tools.some((t) => t.name === 'wcus__get_product')).toBe(true);
      expect(tools.some((t) => t.name === 'wcus__list_orders')).toBe(true);

      // EU Storefront Tools
      expect(tools.some((t) => t.name === 'wceu__list_products')).toBe(true);
      expect(tools.some((t) => t.name === 'wceu__list_orders')).toBe(true);

      // Sandbox Store Tools
      expect(tools.some((t) => t.name === 'sandbox__list_products')).toBe(true);

      // Warehouse Inventory Tools
      expect(tools.some((t) => t.name === 'inv__check_warehouse_stock')).toBe(true);
    });

    it('3.2 Specific store tools endpoint returns only that store\'s tools', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores/${provisionedStoreUSId}/tools`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      expect(res.status).toBe(200);
      const tools = (await res.json()) as Array<{ name: string }>;
      expect(tools.length).toBeGreaterThanOrEqual(10);
      expect(tools.every((t) => t.name.startsWith('wcus__'))).toBe(true);
    });
  });

  // ===========================================================================
  // 4. CROSS-STORE TOOL EXECUTION & DATA ISOLATION
  // ===========================================================================
  describe('4. Cross-Store Tool Execution & Data Isolation', () => {
    it('4.1 Executes wcus__list_products and retrieves North America catalog', async () => {
      const res = await gatewayAppInstance.aggregator.executeToolCall(
        'wcus__list_products',
        {},
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );

      expect(res.isError).toBeUndefined();
      const content = res.content[0]?.text || '';
      expect(content).toContain('US Flag Hoodie');
      expect(content).not.toContain('Berlin Edition');
    });

    it('4.2 Executes wceu__list_products and retrieves European catalog', async () => {
      const res = await gatewayAppInstance.aggregator.executeToolCall(
        'wceu__list_products',
        {},
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );

      expect(res.isError).toBeUndefined();
      const content = res.content[0]?.text || '';
      expect(content).toContain('Berlin Edition');
      expect(content).not.toContain('US Flag Hoodie');
    });

    it('4.3 Executes wcus__list_recent_orders and retrieves North America orders', async () => {
      const res = await gatewayAppInstance.aggregator.executeToolCall(
        'wcus__list_recent_orders',
        {},
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );

      expect(res.isError).toBeUndefined();
      const content = res.content[0]?.text || '';
      expect(content).toContain('9001');
    });
  });

  // ===========================================================================
  // 5. OFFICIAL MCP STREAMABLE HTTP CLIENT INTEGRATION
  // ===========================================================================
  describe('5. Official MCP SDK Client Integration', () => {
    it('5.1 Connects via Streamable HTTP and discovers multi-store tools', async () => {
      const client = new Client({ name: 'multi-store-test-client', version: '1.0.0' }, { capabilities: {} });
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${gatewayPort}/mcp`),
        {
          requestInit: {
            headers: { Authorization: `Bearer ${adminApiKey}` },
          },
        }
      );

      await client.connect(transport);

      const listResult = await client.listTools();
      const toolNames = listResult.tools.map((t) => t.name);

      expect(toolNames).toContain('wcus__list_products');
      expect(toolNames).toContain('wceu__list_products');
      expect(toolNames).toContain('inv__check_warehouse_stock');

      // Call tool on provisioned US store via official client
      const callResult = await client.callTool({
        name: 'wcus__list_products',
        arguments: {},
      });

      expect(callResult.isError).toBeFalsy();
      const text = (callResult.content as Array<{ type: string; text: string }>)[0]?.text;
      expect(text).toContain('US Flag Hoodie');

      await client.close();
    });
  });

  // ===========================================================================
  // 6. MULTI-STORE FAILURE ISOLATION
  // ===========================================================================
  describe('6. Multi-Store Failure Isolation', () => {
    let failedStoreId = '';
    let mockWcServerFailing: Server;
    let mockWcPortFailing: number;

    beforeAll(async () => {
      // 1. Upstream WooCommerce Mock that fails with 500 server error
      const failingApp: Express = express();
      failingApp.use(express.json());
      failingApp.use((_req, res) => {
        res.status(500).json({ code: 'woocommerce_internal_error', message: 'Internal server error in upstream' });
      });
      mockWcServerFailing = await new Promise((resolve) => {
        const s = failingApp.listen(0, '127.0.0.1', () => resolve(s));
      });
      mockWcPortFailing = (mockWcServerFailing.address() as { port: number }).port;

      // 2. Provision store pointing to failing upstream
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({
          name: 'Unreachable Regional Store',
          prefix: 'wcunreachable',
          url: `http://127.0.0.1:${mockWcPortFailing}`,
          consumerKey: 'ck_offline',
          consumerSecret: 'cs_offline',
        }),
      });
      const data = (await res.json()) as { id: string };
      failedStoreId = data.id;
    });

    afterAll(async () => {
      if (mockWcServerFailing) {
        await new Promise<void>((r) => mockWcServerFailing.close(() => r()));
      }
    });

    it('6.1 Failed store tool returns structured error without crashing the gateway', async () => {
      const res = await gatewayAppInstance.aggregator.executeToolCall(
        'wcunreachable__list_products',
        {},
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );

      expect(res.isError).toBe(true);
      const text = res.content[0]?.text || '';
      expect(text).toMatch(/STORE_EXECUTION_FAILURE|server error/i);
    });

    it('6.2 Healthy provisioned stores continue operating normally during neighbor failure', async () => {
      const res = await gatewayAppInstance.aggregator.executeToolCall(
        'wcus__list_products',
        {},
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );

      expect(res.isError).toBeUndefined();
      const content = res.content[0]?.text || '';
      expect(content).toContain('US Flag Hoodie');
    });

    it('6.3 Store connectivity test detects and flags unreachable state', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores/${failedStoreId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      expect(res.status).toBe(200);
      const health = (await res.json()) as { status: string };
      expect(health.status).toBe('unreachable');
    });
  });

  // ===========================================================================
  // 7. DYNAMIC LIFECYCLE: DISABLE & DEPROVISION
  // ===========================================================================
  describe('7. Dynamic Store Lifecycle (Disable & Deprovision)', () => {
    it('7.1 Disabling store immediately purges its tools from discovery', async () => {
      // 1. Disable EU Store
      const disableRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores/${provisionedStoreEUId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({ enabled: false }),
      });
      expect(disableRes.status).toBe(200);

      // 2. Discover tools: EU tools must be purged
      const toolsRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/tools`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      const tools = (await toolsRes.json()) as Array<{ name: string }>;
      expect(tools.some((t) => t.name.startsWith('wceu__'))).toBe(false);

      // 3. Invoking disabled store tool returns clean STORE_DISABLED error
      const callRes = await gatewayAppInstance.aggregator.executeToolCall(
        'wceu__list_products',
        {},
        { id: 'usr_admin', username: 'admin', role: 'admin', createdAt: '' }
      );
      expect(callRes.isError).toBe(true);
      expect(callRes.content[0]?.text).toContain('STORE_DISABLED');

      // 4. Re-enable EU Store
      const enableRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores/${provisionedStoreEUId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({ enabled: true }),
      });
      expect(enableRes.status).toBe(200);

      // 5. Tools return immediately
      const restoredToolsRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/tools`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      const restoredTools = (await restoredToolsRes.json()) as Array<{ name: string }>;
      expect(restoredTools.some((t) => t.name.startsWith('wceu__'))).toBe(true);
    });

    it('7.2 Deprovisioning store completely deletes store and removes all tools', async () => {
      const deleteRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores/${provisionedStoreEUId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      expect(deleteRes.status).toBe(200);

      // Verify store is no longer in store list
      const storesRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      const stores = (await storesRes.json()) as Array<{ id: string }>;
      expect(stores.some((s) => s.id === provisionedStoreEUId)).toBe(false);

      // Verify tools are removed
      const toolsRes = await fetch(`http://127.0.0.1:${gatewayPort}/api/tools`, {
        headers: { Authorization: `Bearer ${adminApiKey}` },
      });
      const tools = (await toolsRes.json()) as Array<{ name: string }>;
      expect(tools.some((t) => t.name.startsWith('wceu__'))).toBe(false);
    });
  });

  // ===========================================================================
  // 8. ROLE-BASED ACCESS CONTROL (RBAC) ENFORCEMENT
  // ===========================================================================
  describe('8. Role-Based Access Control (RBAC)', () => {
    it('8.1 Member users cannot provision new stores (403 Forbidden)', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberApiKey}`,
        },
        body: JSON.stringify({
          name: 'Unauthorized Store',
          prefix: 'unauth',
          url: 'http://127.0.0.1:8080',
          consumerKey: 'ck_unauth',
          consumerSecret: 'cs_unauth',
        }),
      });

      expect(res.status).toBe(403);
    });

    it('8.2 Member users cannot deprovision stores (403 Forbidden)', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores/${provisionedStoreUSId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${memberApiKey}` },
      });

      expect(res.status).toBe(403);
    });

    it('8.3 Member users can list stores and discover tools', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/stores`, {
        headers: { Authorization: `Bearer ${memberApiKey}` },
      });

      expect(res.status).toBe(200);
      const stores = await res.json();
      expect(Array.isArray(stores)).toBe(true);
    });
  });
});
