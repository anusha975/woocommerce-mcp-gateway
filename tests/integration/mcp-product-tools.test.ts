import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../../src/tools/index.js';
import { WooCommerceClient } from '../../src/connectors/woocommerce.client.js';
import type { AppConfig } from '../../src/types/index.js';
import {
  mockRawProductsList,
  mockRawProductDetail,
} from '../fixtures/woocommerce.fixtures.js';

describe('MCP Product Tools Integration Tests', () => {
  const mockConfig: AppConfig = {
    env: 'test',
    port: 3000,
    host: '0.0.0.0',
    logLevel: 'info',
    security: {
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
      corsAllowedOrigins: [],
      maxBodySizeBytes: 1048576,
    },
    woocommerce: {
      url: 'https://store.example.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      timeoutMs: 5000,
      verifySsl: true,
    },
  };

  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;
  let mcpServer: ReturnType<typeof createMcpServer>;

  const mockFetch = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/wp-json/wc/v3/products/101')) {
      return new Response(JSON.stringify(mockRawProductDetail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/wp-json/wc/v3/products/99999')) {
      return new Response(JSON.stringify({ code: 'not_found', message: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/wp-json/wc/v3/products')) {
      return new Response(JSON.stringify(mockRawProductsList), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-wp-total': '2',
          'x-wp-totalpages': '1',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  });

  beforeAll(async () => {
    const wcClient = new WooCommerceClient({
      baseUrl: mockConfig.woocommerce.url,
      consumerKey: mockConfig.woocommerce.consumerKey,
      consumerSecret: mockConfig.woocommerce.consumerSecret,
      fetchFn: mockFetch,
    });

    mcpServer = createMcpServer(mockConfig, wcClient);
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client(
      {
        name: 'test-product-tools-client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
    await mcpServer.close();
  });

  it('should discover all registered MCP tools including product tools', async () => {
    const response = await client.listTools();
    const toolNames = response.tools.map((t) => t.name);

    expect(toolNames).toContain('health_check');
    expect(toolNames).toContain('list_products');
    expect(toolNames).toContain('search_products');
    expect(toolNames).toContain('get_product');
    expect(toolNames).toContain('get_low_stock_products');
  });

  it('should invoke list_products and return paginated product list', async () => {
    const result = await client.callTool({
      name: 'list_products',
      arguments: { page: 1, per_page: 5, category: '12' },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content.length).toBe(1);

    const parsed = JSON.parse(content[0]?.text ?? '{}');
    expect(parsed.items).toBeDefined();
    expect(parsed.items.length).toBe(2);
    expect(parsed.items[0].name).toBe('Classic Leather Jacket');
  });

  it('should invoke search_products and match query', async () => {
    const result = await client.callTool({
      name: 'search_products',
      arguments: { query: 'leather jacket' },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0]?.text ?? '{}');

    expect(parsed.query).toBe('leather jacket');
    expect(parsed.products.length).toBe(2);
    expect(parsed.products[0].sku).toBe('JKT-LTH-01');
  });

  it('should invoke get_product by ID and return detail attributes', async () => {
    const result = await client.callTool({
      name: 'get_product',
      arguments: { id: 101 },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const product = JSON.parse(content[0]?.text ?? '{}');

    expect(product.id).toBe(101);
    expect(product.name).toBe('Classic Leather Jacket');
    expect(product.dimensions.length).toBe('40');
    expect(product.attributes.length).toBe(2);
  });

  it('should return safe error response when product ID is not found', async () => {
    const result = await client.callTool({
      name: 'get_product',
      arguments: { id: 99999 },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('not found');
  });

  it('should invoke get_low_stock_products with custom threshold', async () => {
    const result = await client.callTool({
      name: 'get_low_stock_products',
      arguments: { threshold: 20 },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0]?.text ?? '{}');

    expect(parsed.threshold).toBe(20);
    expect(parsed.items).toBeDefined();
    // In mock data: Jacket has stock 15 <= 20, Beanie has stock 42 > 20
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].name).toBe('Classic Leather Jacket');
    expect(parsed.items[0].stockQuantity).toBe(15);
  });

  it('should reject invalid tool arguments with schema validation error', async () => {
    // Missing required 'query' parameter for search_products
    const result = await client.callTool({
      name: 'search_products',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('Invalid arguments');
  });
});
