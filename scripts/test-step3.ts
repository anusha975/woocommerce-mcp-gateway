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

interface TestCaseResult {
  id: number;
  testCase: string;
  category: string;
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL';
  secretsLeaked: boolean;
  durationMs: number;
}

const testResults: TestCaseResult[] = [];
const SENSITIVE_STRINGS = [
  'ck_secret_mock_consumer_key_123',
  'cs_super_confidential_secret_999',
  'sec_test_api_key_top_secret_token',
];

function checkSecretLeakage(content: string): boolean {
  for (const secret of SENSITIVE_STRINGS) {
    if (content.includes(secret)) {
      return true;
    }
  }
  return false;
}

async function runStep3Tests() {
  console.log('=== Step 3: Input Validation, Error Handling, Timeout & Security Testing ===\n');

  // 1. Setup mock WooCommerce server with controllable error routes
  const wcApp: Express = express();
  wcApp.use(express.json());

  // Normal routes
  wcApp.get('/wp-json/wc/v3/products', (req, res) => {
    res.setHeader('X-WP-Total', '2');
    res.setHeader('X-WP-TotalPages', '1');
    res.json(mockRawProductsList);
  });

  wcApp.get('/wp-json/wc/v3/products/:id', (req, res) => {
    const id = Number(req.params.id);
    if (id === 101) {
      res.json(mockRawProductDetail);
    } else if (id === 500) {
      res.status(500).json({ code: 'internal_server_error', message: 'Upstream fatal crash' });
    } else if (id === 999999) {
      res.status(404).json({ code: 'woocommerce_rest_product_invalid_id', message: 'Product not found.' });
    } else if (id === 777) {
      // Simulate timeout by not responding immediately
      setTimeout(() => {
        if (!res.headersSent) res.json({ id: 777 });
      }, 3000);
    } else {
      res.status(404).json({ code: 'woocommerce_rest_product_invalid_id', message: 'Not found.' });
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
      res.status(404).json({ code: 'woocommerce_rest_order_invalid_id', message: 'Order not found.' });
    }
  });

  const mockWcServer: Server = await new Promise((resolve) => {
    const s = wcApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const mockWcPort = (mockWcServer.address() as { port: number }).port;

  // 2. Start Gateway Server with short timeout for timeout tests
  const testApiKey = SENSITIVE_STRINGS[2]!;
  const gatewayConfig: AppConfig = {
    env: 'test',
    port: mockWcPort + 20,
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
      consumerKey: SENSITIVE_STRINGS[0]!,
      consumerSecret: SENSITIVE_STRINGS[1]!,
      timeoutMs: 500, // 500ms timeout for deterministic timeout testing
      verifySsl: false,
    },
  };

  const gatewayServer = await startGatewayServer(gatewayConfig);
  const gatewayUrl = `http://127.0.0.1:${gatewayConfig.port}`;

  // Helper to send tool calls
  async function callTool(name: string, args: Record<string, unknown>) {
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `test-${name}`,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
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
    return { httpStatus: res.status, json, text };
  }

  // Record test helper
  function record(
    id: number,
    testCase: string,
    category: string,
    expected: string,
    actual: string,
    passed: boolean,
    rawOutput: string,
    durationMs: number
  ) {
    const leaked = checkSecretLeakage(rawOutput);
    testResults.push({
      id,
      testCase,
      category,
      expectedResult: expected,
      actualResult: actual,
      status: passed && !leaked ? 'PASS' : 'FAIL',
      secretsLeaked: leaked,
      durationMs,
    });
  }

  // =========================================================================
  // Section 1: Invalid Inputs Across All 9 Tools
  // =========================================================================

  // 1. health_check: invalid verbose type
  {
    const start = performance.now();
    const res = await callTool('health_check', { verbose: 'not-a-bool' as any });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(1, 'health_check with invalid non-boolean verbose', 'Input Validation', 'isError: true with schema validation error', `isError: ${isErr}, msg: "${msg.substring(0, 45)}"`, isErr === true, res.text, dur);
  }

  // 2. list_products: min_price > max_price
  {
    const start = performance.now();
    const res = await callTool('list_products', { min_price: '100.00', max_price: '10.00' });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    const validMsg = msg.includes('min_price') && msg.includes('cannot be greater than max_price');
    record(2, 'list_products with min_price > max_price', 'Input Validation', 'isError: true with price boundary error', `isError: ${isErr}, msg: "${msg}"`, isErr === true && validMsg, res.text, dur);
  }

  // 3. list_products: per_page > 100
  {
    const start = performance.now();
    const res = await callTool('list_products', { per_page: 500 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(3, 'list_products with per_page exceeding max (500)', 'Input Validation', 'isError: true (per_page cannot exceed 100)', `isError: ${isErr}, msg: "${msg.substring(0, 50)}"`, isErr === true, res.text, dur);
  }

  // 4. search_products: empty query
  {
    const start = performance.now();
    const res = await callTool('search_products', { query: '' });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(4, 'search_products with empty query string', 'Input Validation', 'isError: true (query cannot be empty)', `isError: ${isErr}, msg: "${msg.substring(0, 50)}"`, isErr === true, res.text, dur);
  }

  // 5. get_product: negative ID
  {
    const start = performance.now();
    const res = await callTool('get_product', { id: -5 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(5, 'get_product with negative ID (-5)', 'Input Validation', 'isError: true (ID must be at least 1)', `isError: ${isErr}, msg: "${msg.substring(0, 50)}"`, isErr === true, res.text, dur);
  }

  // 6. get_low_stock_products: negative threshold
  {
    const start = performance.now();
    const res = await callTool('get_low_stock_products', { threshold: -10 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(6, 'get_low_stock_products with negative threshold (-10)', 'Input Validation', 'isError: true (threshold must be >= 0)', `isError: ${isErr}, msg: "${msg.substring(0, 50)}"`, isErr === true, res.text, dur);
  }

  // 7. list_recent_orders: inverted date range (after > before)
  {
    const start = performance.now();
    const res = await callTool('list_recent_orders', { after: '2026-10-15', before: '2026-10-01' });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(7, 'list_recent_orders with inverted dates (after > before)', 'Input Validation', 'isError: true ("after" cannot be later than "before")', `isError: ${isErr}, msg: "${msg}"`, isErr === true && msg.includes('after'), res.text, dur);
  }

  // 8. get_order: negative ID
  {
    const start = performance.now();
    const res = await callTool('get_order', { id: -99 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(8, 'get_order with negative order ID (-99)', 'Input Validation', 'isError: true (order ID must be at least 1)', `isError: ${isErr}, msg: "${msg.substring(0, 50)}"`, isErr === true, res.text, dur);
  }

  // 9. search_orders_by_status: invalid status enum
  {
    const start = performance.now();
    const res = await callTool('search_orders_by_status', { status: 'invalid_status_xyz' as any });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(9, 'search_orders_by_status with invalid status string', 'Input Validation', 'isError: true (enum validation error)', `isError: ${isErr}, msg: "${msg.substring(0, 50)}"`, isErr === true, res.text, dur);
  }

  // 10. get_order_summary: negative ID
  {
    const start = performance.now();
    const res = await callTool('get_order_summary', { id: -1 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(10, 'get_order_summary with negative ID (-1)', 'Input Validation', 'isError: true (ID must be at least 1)', `isError: ${isErr}, msg: "${msg.substring(0, 50)}"`, isErr === true, res.text, dur);
  }

  // =========================================================================
  // Section 2: Upstream Errors & Timeout Handling
  // =========================================================================

  // 11. Upstream HTTP 404: Non-existent product ID 999999
  {
    const start = performance.now();
    const res = await callTool('get_product', { id: 999999 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(11, 'Upstream HTTP 404 (non-existent product ID)', 'Upstream Error Handling', 'isError: true with "not found" message', `isError: ${isErr}, msg: "${msg}"`, isErr === true && msg.includes('not found'), res.text, dur);
  }

  // 12. Upstream HTTP 500: Server crash on upstream store
  {
    const start = performance.now();
    const res = await callTool('get_product', { id: 500 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(12, 'Upstream HTTP 500 (store internal crash)', 'Upstream Error Handling', 'isError: true with "server error (HTTP 500)"', `isError: ${isErr}, msg: "${msg}"`, isErr === true && msg.includes('500'), res.text, dur);
  }

  // 13. Upstream Timeout: Response delayed beyond timeoutMs (500ms)
  {
    const start = performance.now();
    const res = await callTool('get_product', { id: 777 });
    const dur = Math.round(performance.now() - start);
    const isErr = (res.json?.result as any)?.isError;
    const msg = (res.json?.result as any)?.content?.[0]?.text ?? '';
    record(13, 'Upstream Timeout (store response delayed beyond 500ms)', 'Timeout Handling', 'isError: true with timeout notification', `isError: ${isErr}, msg: "${msg}"`, isErr === true && (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')), res.text, dur);
  }

  // 14. Upstream Connection Refused: closed port
  {
    const start = performance.now();
    // Create client pointing to a closed port
    const badPort = mockWcPort + 999;
    const badConfig: AppConfig = {
      ...gatewayConfig,
      port: mockWcPort + 35,
      woocommerce: { ...gatewayConfig.woocommerce, url: `http://127.0.0.1:${badPort}` },
    };
    const badServer = await startGatewayServer(badConfig);
    const res = await fetch(`http://127.0.0.1:${badConfig.port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'conn-refuse',
        method: 'tools/call',
        params: { name: 'list_products', arguments: {} },
      }),
    });
    const text = await res.text();
    const dur = Math.round(performance.now() - start);
    const isErr = text.includes('isError') && text.includes('true');
    record(14, 'Upstream Connection Refused (store offline / closed port)', 'Upstream Error Handling', 'isError: true (connection refused without process crash)', `Handled safely with error: ${isErr}`, isErr, text, dur);
    await badServer.stop();
  }

  // =========================================================================
  // Section 3: Protocol, Malformed Requests & Authentication
  // =========================================================================

  // 15. Malformed JSON syntax in HTTP body
  {
    const start = performance.now();
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: '{"jsonrpc": "2.0", invalid_json',
    });
    const dur = Math.round(performance.now() - start);
    record(15, 'Malformed JSON payload (invalid syntax)', 'Protocol Robustness', 'HTTP 400 Bad Request', `HTTP ${res.status}`, res.status === 400, await res.text(), dur);
  }

  // 16. Missing jsonrpc version or malformed protocol field
  {
    const start = performance.now();
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({ id: 10, method: 'tools/list' }), // Missing jsonrpc: "2.0"
    });
    const text = await res.text();
    const dur = Math.round(performance.now() - start);
    // Protocol requires jsonrpc error or code
    const isHandled = text.includes('error') || res.status === 400;
    record(16, 'Malformed JSON-RPC (missing jsonrpc: "2.0")', 'Protocol Robustness', 'JSON-RPC error code or HTTP 400', `HTTP ${res.status}, response contains error: ${isHandled}`, isHandled, text, dur);
  }

  // 17. Unknown JSON-RPC method
  {
    const start = performance.now();
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'unknown-1', method: 'non_existent_method', params: {} }),
    });
    const text = await res.text();
    const dur = Math.round(performance.now() - start);
    const hasMethodError = text.includes('Method not found') || text.includes('-32601') || text.includes('error');
    record(17, 'Unknown JSON-RPC method ("non_existent_method")', 'Protocol Robustness', 'Method not found (-32601)', `HTTP ${res.status}, error returned: ${hasMethodError}`, hasMethodError, text, dur);
  }

  // 18. Authentication: Missing Authorization header (when GATEWAY_API_KEY is configured)
  // Note: When GATEWAY_API_KEY is omitted/empty (default dev mode), auth is disabled (authRequired: false) and requests do not return 401.
  {
    const start = performance.now();
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'auth-1', method: 'tools/list' }),
    });
    const dur = Math.round(performance.now() - start);
    record(18, 'Authentication: Missing Authorization header (when GATEWAY_API_KEY is configured)', 'Security & Auth', 'HTTP 401 Unauthorized', `HTTP ${res.status}`, res.status === 401, await res.text(), dur);
  }

  // 19. Authentication: Invalid Bearer token (when GATEWAY_API_KEY is configured)
  {
    const start = performance.now();
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': 'Bearer wrong_token_xyz',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'auth-2', method: 'tools/list' }),
    });
    const dur = Math.round(performance.now() - start);
    record(19, 'Authentication: Invalid Bearer token (when GATEWAY_API_KEY is configured)', 'Security & Auth', 'HTTP 401 Unauthorized', `HTTP ${res.status}`, res.status === 401, await res.text(), dur);
  }

  // 20. Content Negotiation: Missing Accept header on POST /mcp
  {
    const start = performance.now();
    const res = await fetch(`${gatewayUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
        'Accept': 'text/plain', // Does not accept application/json or text/event-stream
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'accept-1', method: 'tools/list' }),
    });
    const dur = Math.round(performance.now() - start);
    record(20, 'Content Negotiation: Missing required Accept header', 'Protocol Robustness', 'HTTP 406 Not Acceptable', `HTTP ${res.status}`, res.status === 406, await res.text(), dur);
  }

  // Print results
  console.log('\n========================================================================================================================');
  console.log('| ID | Test Case                                              | Category              | Status | Leaked | Time | Actual Result |');
  console.log('========================================================================================================================');
  for (const r of testResults) {
    const idPad = String(r.id).padEnd(2);
    const testPad = r.testCase.padEnd(52);
    const catPad = r.category.padEnd(21);
    const statusPad = r.status.padEnd(6);
    const leakPad = (r.secretsLeaked ? 'YES' : 'NO').padEnd(6);
    const timePad = `${r.durationMs}ms`.padEnd(5);
    console.log(`| ${idPad} | ${testPad} | ${catPad} | ${statusPad} | ${leakPad} | ${timePad} | ${r.actualResult.substring(0, 40)} |`);
  }
  console.log('========================================================================================================================');

  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === 'PASS').length;
  const failed = testResults.filter((r) => r.status === 'FAIL').length;
  const anyLeaked = testResults.some((r) => r.secretsLeaked);

  console.log(`\nStep 3 Summary: ${passed}/${total} Passed, ${failed} Failed. Secrets Leaked: ${anyLeaked ? 'YES (CRITICAL)' : 'NONE (VERIFIED SAFE)'}`);

  // Cleanup
  await gatewayServer.stop();
  mockWcServer.close();
}

runStep3Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
