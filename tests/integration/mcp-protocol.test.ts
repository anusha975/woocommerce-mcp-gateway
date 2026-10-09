import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from '../../src/tools/index.js';
import type { AppConfig } from '../../src/types/index.js';

describe('MCP Protocol Integration Tests', () => {
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

  beforeAll(async () => {
    mcpServer = createMcpServer(mockConfig);
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client(
      {
        name: 'test-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
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

  it('should successfully perform capability negotiation and initialization', () => {
    const serverVersion = client.getServerVersion();
    expect(serverVersion).toBeDefined();
    expect(serverVersion?.name).toBe(SERVER_NAME);
    expect(serverVersion?.version).toBe(SERVER_VERSION);
  });

  it('should discover registered tools (tool listing)', async () => {
    const response = await client.listTools();

    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBeGreaterThanOrEqual(1);

    const healthTool = response.tools.find((t) => t.name === 'health_check');
    expect(healthTool).toBeDefined();
    expect(healthTool?.description).toContain('health');
    expect(healthTool?.inputSchema).toBeDefined();
  });

  it('should invoke health_check tool and return valid structured content', async () => {
    const result = await client.callTool({
      name: 'health_check',
      arguments: {},
    });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content).toBeDefined();
    expect(content.length).toBe(1);

    const firstContent = content[0];
    expect(firstContent?.type).toBe('text');

    if (firstContent?.type === 'text') {
      const parsed = JSON.parse(firstContent.text);
      expect(parsed.status).toBe('healthy');
      expect(parsed.service).toBe('woocommerce-mcp-gateway');
      expect(parsed.upstream.targetUrl).toBe('https://store.example.com');
    }
  });

  it('should invoke health_check tool with verbose flag', async () => {
    const result = await client.callTool({
      name: 'health_check',
      arguments: { verbose: true },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const firstContent = content[0];
    expect(firstContent?.type).toBe('text');

    if (firstContent?.type === 'text') {
      const parsed = JSON.parse(firstContent.text);
      expect(parsed.details).toBeDefined();
      expect(parsed.details.nodeVersion).toBe(process.version);
    }
  });

  it('should return isError: true when passing invalid arguments schema', async () => {
    const result = await client.callTool({
      name: 'health_check',
      arguments: { verbose: 'not-a-boolean' as unknown as boolean },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('Invalid arguments');
  });

  it('should return isError: true when invoking an unsupported / unknown tool', async () => {
    const result = await client.callTool({
      name: 'non_existent_tool_12345',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('non_existent_tool_12345');
  });
});
