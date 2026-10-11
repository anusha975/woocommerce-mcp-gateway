import express, { type Express } from 'express';
import type { Server } from 'http';
import { startGatewayServer, type RunningServer } from '../src/gateway/server.js';
import type { AppConfig } from '../src/types/index.js';
import {
  mockRawProductsList,
  mockRawProductDetail,
  mockRawOrdersList,
  mockRawOrderDetail,
} from '../tests/fixtures/woocommerce.fixtures.js';

interface ToolTestResult {
  toolName: string;
  category: 'catalog' | 'order' | 'diagnostic';
  input: Record<string, unknown>;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  durationMs: number;
  outputSummary: string;
}

const toolResults: ToolTestResult[] = [];

async function main() {
  console.log('=== Step 1 & Step 2: End-to-End MCP Testing ===\n');

  // 1. Setup mock WooCommerce server on an ephemeral port
  const wcApp: Express = express();
  wcApp.use(express.json());

  wcApp.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      res.status(401).json({ code: 'woocommerce_rest_cannot_view', message: 'Unauthorized' });
      return;
    }
    next();
  });

  wcApp.get('/wp-json/wc/v3/products', (req, res) => {
    res.setHeader('X-WP-Total', '2');
    res.setHeader('X-WP-TotalPages', '1');
    res.json(mockRawProductsList);
  });

  wcApp.get('/wp-json/wc/v3/products/:id', (req, res) => {
    const id = Number(req.params.id);
    if (id === 101) {
      res.json(mockRawProductDetail);
    } else {
      res.status(404).json({ code: 'woocommerce_rest_product_invalid_id', message: 'Invalid product ID.' });
    }
  });

  wcApp.get('/wp-json/wc/v3/orders', (req, res) => {
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

  const mockWcServer: Server = await new Promise((resolve) => {
    const s = wcApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const mockWcPort = (mockWcServer.address() as { port: number }).port;

  // 2. Start Gateway Server
  const testApiKey = 'mcp_test_key_secure_123';
  const gatewayAppConfig: AppConfig = {
    env: 'test',
    port: mockWcPort + 15,
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

  const gatewayServer = await startGatewayServer(gatewayAppConfig);
  const gatewayUrl = `http://127.0.0.1:${gatewayAppConfig.port}`;

  console.log(`Gateway started on ${gatewayUrl}`);

  // Step 1: Verify server initialization and health endpoint
  const healthRes = await fetch(`${gatewayUrl}/healthz`);
  const healthData = await healthRes.json() as { status: string };
  console.log(`[Health Endpoint] GET /healthz -> HTTP ${healthRes.status}, status: "${healthData.status}"`);

  const readyRes = await fetch(`${gatewayUrl}/readyz`);
  const readyData = await readyRes.json() as { status: string; service: string };
  console.log(`[Ready Endpoint]  GET /readyz  -> HTTP ${readyRes.status}, status: "${readyData.status}", service: "${readyData.service}"\n`);

  // Helper to send MCP requests
  async function sendMcp(payload: Record<string, unknown>) {
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      json = JSON.parse(trimmed) as Record<string, unknown>;
    } else {
      for (const line of trimmed.split('\n')) {
        if (line.startsWith('data: ')) {
          json = JSON.parse(line.substring(6).trim()) as Record<string, unknown>;
          break;
        }
      }
    }
    return { status: res.status, json, text };
  }

  // Step 2: Initialize MCP connection using Streamable HTTP
  console.log('--- Initializing MCP Session ---');
  const initRes = await sendMcp({
    jsonrpc: '2.0',
    id: 'init-1',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'module4-tester', version: '1.0.0' },
    },
  });
  console.log(`[Initialize] HTTP ${initRes.status}, JSON-RPC response:`, JSON.stringify(initRes.json?.result));

  // Tool discovery
  console.log('\n--- Tool Discovery (tools/list) ---');
  const listToolsRes = await sendMcp({
    jsonrpc: '2.0',
    id: 'list-tools-1',
    method: 'tools/list',
    params: {},
  });
  const discoveredTools = (listToolsRes.json?.result as { tools: Array<{ name: string; description: string }> })?.tools || [];
  console.log(`Discovered ${discoveredTools.length} tools:`);
  for (const t of discoveredTools) {
    console.log(`  - ${t.name}: ${t.description.substring(0, 70)}...`);
  }

  // Step 3: Test all 8 registered tools + health_check with valid inputs one by one
  console.log('\n--- Testing All Registered Tools (Valid Inputs) ---');

  const toolsToTest: Array<{
    name: string;
    category: 'catalog' | 'order' | 'diagnostic';
    input: Record<string, unknown>;
    describe: (data: unknown) => string;
  }> = [
    {
      name: 'health_check',
      category: 'diagnostic',
      input: { verbose: true },
      describe: (d: any) => `Status: ${d?.status}, uptime: ${d?.uptimeSeconds}s, target: ${d?.upstream?.targetUrl}`,
    },
    {
      name: 'list_products',
      category: 'catalog',
      input: { per_page: 5, page: 1, status: 'publish' },
      describe: (d: any) => `Returned ${d?.items?.length} products, total: ${d?.totalItems}`,
    },
    {
      name: 'search_products',
      category: 'catalog',
      input: { query: 'Leather', per_page: 5 },
      describe: (d: any) => `Query "${d?.query}" returned ${d?.products?.length} matches, totalMatches: ${d?.totalMatches}`,
    },
    {
      name: 'get_product',
      category: 'catalog',
      input: { id: 101 },
      describe: (d: any) => `Product ID ${d?.id}: "${d?.name}", SKU: "${d?.sku}", price: "${d?.price}"`,
    },
    {
      name: 'get_low_stock_products',
      category: 'catalog',
      input: { threshold: 20 },
      describe: (d: any) => `Evaluated ${d?.evaluatedCount} items, found ${d?.lowStockCount} below threshold ${d?.threshold}`,
    },
    {
      name: 'list_recent_orders',
      category: 'order',
      input: { per_page: 5, page: 1 },
      describe: (d: any) => `Returned ${d?.items?.length} orders, total: ${d?.totalItems}, order ID: ${d?.items?.[0]?.id}`,
    },
    {
      name: 'get_order',
      category: 'order',
      input: { id: 2001 },
      describe: (d: any) => `Order ID ${d?.id}: status: "${d?.status}", total: "${d?.total}", lines: ${d?.lineItems?.length}`,
    },
    {
      name: 'search_orders_by_status',
      category: 'order',
      input: { status: 'processing', per_page: 5 },
      describe: (d: any) => `Found ${d?.orders?.length} orders matching status "${d?.statusFilter}", total: ${d?.totalOrders}`,
    },
    {
      name: 'get_order_summary',
      category: 'order',
      input: { id: 2001 },
      describe: (d: any) => `Summary Order ID ${d?.id}: status: "${d?.status}", total: "${d?.total} ${d?.currency}", items: ${d?.itemCount}`,
    },
  ];

  for (const t of toolsToTest) {
    const start = performance.now();
    try {
      const res = await sendMcp({
        jsonrpc: '2.0',
        id: `call-${t.name}`,
        method: 'tools/call',
        params: {
          name: t.name,
          arguments: t.input,
        },
      });

      const dur = Math.round(performance.now() - start);
      const callResult = res.json?.result as { content?: Array<{ type: string; text: string }>; isError?: boolean };

      if (callResult?.isError) {
        toolResults.push({
          toolName: t.name,
          category: t.category,
          input: t.input,
          status: 'FAILED',
          durationMs: dur,
          outputSummary: `Tool returned isError: true - ${callResult.content?.[0]?.text}`,
        });
      } else {
        const rawText = callResult?.content?.[0]?.text ?? '{}';
        const parsed = JSON.parse(rawText);
        const summary = t.describe(parsed);
        toolResults.push({
          toolName: t.name,
          category: t.category,
          input: t.input,
          status: 'SUCCESS',
          durationMs: dur,
          outputSummary: summary,
        });
      }
    } catch (err: any) {
      const dur = Math.round(performance.now() - start);
      toolResults.push({
        toolName: t.name,
        category: t.category,
        input: t.input,
        status: 'FAILED',
        durationMs: dur,
        outputSummary: `Network/parse exception: ${err.message}`,
      });
    }
  }

  // Real store connectivity check
  console.log('\n--- Checking Real WooCommerce Store Status ---');
  let realStoreStatus = 'BLOCKED / UNREACHABLE';
  let realStoreDetails = '';
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
    const storeUrl = process.env['WOOCOMMERCE_BASE_URL'] || 'https://woocommerce-test.local';
    const storeRes = await fetch(storeUrl, { signal: AbortSignal.timeout(3000) });
    realStoreStatus = `ONLINE (HTTP ${storeRes.status})`;
    realStoreDetails = `Store URL ${storeUrl} answered with HTTP ${storeRes.status}`;
  } catch (err: any) {
    realStoreStatus = 'BLOCKED / UNREACHABLE';
    realStoreDetails = `Connection to store failed: ${err.message}`;
  }

  // Print results table
  console.log('\n========================================================================================');
  console.log('| Tool Name                 | Category   | Status   | Time   | Output Summary           |');
  console.log('========================================================================================');
  for (const r of toolResults) {
    const namePad = r.toolName.padEnd(25);
    const catPad = r.category.padEnd(10);
    const statusPad = r.status.padEnd(8);
    const timePad = `${r.durationMs}ms`.padEnd(6);
    console.log(`| ${namePad} | ${catPad} | ${statusPad} | ${timePad} | ${r.outputSummary}`);
  }
  console.log('========================================================================================');
  console.log(`\nReal WooCommerce Integration Status: ${realStoreStatus}`);
  console.log(`Details: ${realStoreDetails}`);

  // Cleanup
  await gatewayServer.stop();
  mockWcServer.close();
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
