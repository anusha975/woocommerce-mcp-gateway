import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppConfig, User } from '../types/index.js';
import type { UpstreamService } from '../services/upstream.service.js';
import type { AuditService } from '../services/audit.service.js';
import type { StoreProvisioningService } from '../services/store-provisioning.service.js';
import { createMcpServer as createWcServer } from '../tools/index.js';
import { createInventoryMcpServer } from '../servers/inventory.server.js';
import { createSupportMcpServer } from '../servers/support.server.js';
import { WooCommerceClient } from '../connectors/woocommerce.client.js';
import { logger } from '../logging/logger.js';

export interface AggregatedToolDefinition {
  name: string;
  originalName: string;
  upstreamId: string;
  upstreamPrefix: string;
  upstreamName: string;
  description?: string;
  inputSchema: unknown;
}

interface ProvisionedStoreRuntime {
  storeId: string;
  storeName: string;
  prefix: string;
  updatedAt: string;
  client: WooCommerceClient;
  server: McpServer;
}

export class McpAggregator {
  private wcServer: McpServer;
  private inventoryServer: McpServer;
  private supportServer: McpServer;
  private storeServers = new Map<string, ProvisionedStoreRuntime>();

  constructor(
    private config: AppConfig,
    private upstreamService: UpstreamService,
    private auditService: AuditService,
    private storeService?: StoreProvisioningService
  ) {
    this.wcServer = createWcServer(this.config);
    this.inventoryServer = createInventoryMcpServer();
    this.supportServer = createSupportMcpServer();

    if (this.storeService) {
      this.storeService.onStoreChanged(() => {
        this.syncStoreServers();
      });
      this.syncStoreServers();
    }
  }

  /**
   * Synchronizes active WooCommerce store instances from the StoreProvisioningService.
   */
  public syncStoreServers(): void {
    if (!this.storeService) return;
    this.storeService.seedDefaultStore(this.config);
    const stores = this.storeService.listStores();
    const activePrefixes = new Set(stores.map((s) => s.prefix.toLowerCase()));

    // Evict deprovisioned stores
    for (const prefix of this.storeServers.keys()) {
      if (!activePrefixes.has(prefix) && prefix !== 'wc') {
        this.storeServers.delete(prefix);
      }
    }

    // Provision or update instances
    for (const store of stores) {
      const prefix = store.prefix.toLowerCase();
      const existing = this.storeServers.get(prefix);

      if (!existing || existing.updatedAt !== store.updatedAt) {
        const client = new WooCommerceClient({
          baseUrl: store.url,
          consumerKey: store.consumerKey,
          consumerSecret: store.consumerSecret,
          timeoutMs: store.timeoutMs,
        });

        const storeConfig: AppConfig = {
          ...this.config,
          woocommerce: {
            url: store.url,
            consumerKey: store.consumerKey,
            consumerSecret: store.consumerSecret,
            timeoutMs: store.timeoutMs,
            verifySsl: store.verifySsl,
          },
        };

        const server = createWcServer(storeConfig, client);

        this.storeServers.set(prefix, {
          storeId: store.id,
          storeName: store.name,
          prefix,
          updatedAt: store.updatedAt,
          client,
          server,
        });

        if (prefix === 'wc') {
          this.wcServer = server;
        }

        logger.debug({ prefix, storeId: store.id }, 'Synchronized provisioned store runtime server');
      }
    }
  }

  /**
   * Retrieves all available tools from currently enabled upstream servers and provisioned stores.
   * If a store or upstream is disabled, its tools are completely omitted from discovery.
   */
  public async getAggregatedTools(): Promise<AggregatedToolDefinition[]> {
    const aggregated: AggregatedToolDefinition[] = [];

    // 1. Discover tools from provisioned stores
    if (this.storeService) {
      this.syncStoreServers();
      const enabledStores = this.storeService.listStores().filter((s) => s.enabled);

      for (const store of enabledStores) {
        const runtime = this.storeServers.get(store.prefix.toLowerCase());
        if (!runtime) continue;

        try {
          const tools = this.extractToolsFromServer(runtime.server);
          for (const tool of tools) {
            aggregated.push({
              name: `${store.prefix}__${tool.name}`,
              originalName: tool.name,
              upstreamId: store.id,
              upstreamPrefix: store.prefix,
              upstreamName: store.name,
              description: `[${store.name}] ${tool.description || ''}`,
              inputSchema: tool.inputSchema,
            });
          }
        } catch (err) {
          logger.warn({ storeId: store.id, err }, 'Failed to load tools from provisioned store');
        }
      }
    }

    // 2. Discover tools from registered upstream servers (Inventory, Support, etc.)
    const upstreams = this.upstreamService.listUpstreams().filter((u) => u.enabled);

    for (const upstream of upstreams) {
      // If storeService already handled 'wc' prefix, avoid duplicate entries
      const hasWcStore = this.storeService ? this.storeService.listStores().some((s) => s.prefix.toLowerCase() === 'wc' && s.enabled) : false;
      if (hasWcStore && upstream.prefix.toLowerCase() === 'wc') {
        continue;
      }

      try {
        const tools = await this.fetchToolsFromUpstream(upstream.prefix);
        for (const tool of tools) {
          aggregated.push({
            name: `${upstream.prefix}__${tool.name}`,
            originalName: tool.name,
            upstreamId: upstream.id,
            upstreamPrefix: upstream.prefix,
            upstreamName: upstream.name,
            description: `[${upstream.name}] ${tool.description || ''}`,
            inputSchema: tool.inputSchema,
          });
        }
      } catch (err) {
        logger.warn({ upstreamId: upstream.id, err }, 'Failed to load tools from upstream during discovery');
      }
    }

    return aggregated;
  }

  /**
   * Dispatches a tool call to the appropriate provisioned store or upstream server
   * with failure isolation, timeout handling, and persistent audit logging.
   */
  public async executeToolCall(
    prefixedToolName: string,
    toolArgs: Record<string, unknown>,
    user: User
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const start = performance.now();
    const parts = prefixedToolName.split('__');
    const prefix = parts.length > 1 ? (parts[0] || '').toLowerCase() : 'wc';
    const originalToolName = parts.length > 1 ? parts.slice(1).join('__') : prefixedToolName;

    // A. Check provisioned stores first
    const provisionedStore = this.storeService?.getStoreByPrefix(prefix);
    if (provisionedStore) {
      if (!provisionedStore.enabled) {
        const durationMs = performance.now() - start;
        this.auditService.recordToolCall({
          userId: user.id,
          username: user.username,
          upstreamId: provisionedStore.id,
          upstreamName: provisionedStore.name,
          toolName: originalToolName,
          durationMs,
          success: false,
          error: `Store '${provisionedStore.name}' is currently disabled`,
        });

        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'STORE_DISABLED',
                  message: `Provisioned store '${provisionedStore.name}' (${provisionedStore.prefix}) is currently disabled by administrator.`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      try {
        const result = await this.dispatchToUpstream(prefix, originalToolName, toolArgs);
        const durationMs = performance.now() - start;

        this.auditService.recordToolCall({
          userId: user.id,
          username: user.username,
          upstreamId: provisionedStore.id,
          upstreamName: provisionedStore.name,
          toolName: originalToolName,
          durationMs,
          success: !result.isError,
          error: result.isError ? 'Tool returned error result' : undefined,
        });

        return result;
      } catch (err: unknown) {
        const durationMs = performance.now() - start;
        const errorMessage = err instanceof Error ? err.message : 'Unknown store invocation error';

        this.auditService.recordToolCall({
          userId: user.id,
          username: user.username,
          upstreamId: provisionedStore.id,
          upstreamName: provisionedStore.name,
          toolName: originalToolName,
          durationMs,
          success: false,
          error: errorMessage,
        });

        logger.error({ store: provisionedStore.name, tool: originalToolName, err }, 'Provisioned store tool execution failed');

        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'STORE_EXECUTION_FAILURE',
                  store: provisionedStore.name,
                  prefix: provisionedStore.prefix,
                  tool: originalToolName,
                  message: `Failed to execute tool on provisioned store: ${errorMessage}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    // B. Check registered upstream servers (Inventory, Support, etc.)
    const upstream = this.upstreamService.listUpstreams().find((u) => u.prefix === prefix);

    if (!upstream) {
      const durationMs = performance.now() - start;
      this.auditService.recordToolCall({
        userId: user.id,
        username: user.username,
        upstreamId: 'unknown',
        upstreamName: 'Unknown',
        toolName: prefixedToolName,
        durationMs,
        success: false,
        error: `No registered upstream server or provisioned store matches prefix '${prefix}'`,
      });

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'UNKNOWN_UPSTREAM',
                message: `Tool '${prefixedToolName}' belongs to an unrecognized upstream server or store prefix '${prefix}'.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (!upstream.enabled) {
      const durationMs = performance.now() - start;
      this.auditService.recordToolCall({
        userId: user.id,
        username: user.username,
        upstreamId: upstream.id,
        upstreamName: upstream.name,
        toolName: originalToolName,
        durationMs,
        success: false,
        error: `Upstream '${upstream.name}' is currently disabled`,
      });

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'UPSTREAM_DISABLED',
                message: `Upstream server '${upstream.name}' (${upstream.prefix}) is currently disabled by administrator.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    try {
      const result = await this.dispatchToUpstream(upstream.prefix, originalToolName, toolArgs);
      const durationMs = performance.now() - start;

      this.auditService.recordToolCall({
        userId: user.id,
        username: user.username,
        upstreamId: upstream.id,
        upstreamName: upstream.name,
        toolName: originalToolName,
        durationMs,
        success: !result.isError,
        error: result.isError ? 'Tool returned error result' : undefined,
      });

      return result;
    } catch (err: unknown) {
      const durationMs = performance.now() - start;
      const errorMessage = err instanceof Error ? err.message : 'Unknown upstream invocation error';

      this.auditService.recordToolCall({
        userId: user.id,
        username: user.username,
        upstreamId: upstream.id,
        upstreamName: upstream.name,
        toolName: originalToolName,
        durationMs,
        success: false,
        error: errorMessage,
      });

      logger.error({ upstream: upstream.name, tool: originalToolName, err }, 'Upstream tool execution failed');

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'UPSTREAM_EXECUTION_FAILURE',
                upstream: upstream.name,
                tool: originalToolName,
                message: `Failed to execute tool on upstream server: ${errorMessage}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private extractToolsFromServer(server: McpServer): Array<{ name: string; description?: string; inputSchema: unknown }> {
    const raw = server as unknown as { _registeredTools: Record<string, { description?: string; inputSchema?: unknown }> };
    const tools = raw._registeredTools || {};
    return Object.entries(tools).map(([name, def]) => ({
      name,
      description: def.description,
      inputSchema: def.inputSchema,
    }));
  }

  private async fetchToolsFromUpstream(prefix: string): Promise<Array<{ name: string; description?: string; inputSchema: unknown }>> {
    const lowerPrefix = prefix.toLowerCase();

    if (this.storeServers.has(lowerPrefix)) {
      return this.extractToolsFromServer(this.storeServers.get(lowerPrefix)!.server);
    }

    switch (lowerPrefix) {
      case 'wc':
        return this.extractToolsFromServer(this.wcServer);
      case 'inv':
        return this.extractToolsFromServer(this.inventoryServer);
      case 'sup':
        return this.extractToolsFromServer(this.supportServer);
      default:
        return [];
    }
  }

  private async dispatchToUpstream(
    prefix: string,
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const lowerPrefix = prefix.toLowerCase();

    if (this.storeServers.has(lowerPrefix)) {
      return this.executeOnMcpServer(this.storeServers.get(lowerPrefix)!.server, toolName, toolArgs);
    }

    switch (lowerPrefix) {
      case 'wc':
        return this.executeOnMcpServer(this.wcServer, toolName, toolArgs);
      case 'inv':
        return this.executeOnMcpServer(this.inventoryServer, toolName, toolArgs);
      case 'sup':
        return this.executeOnMcpServer(this.supportServer, toolName, toolArgs);
      default:
        throw new Error(`Upstream handler for '${prefix}' is not available`);
    }
  }

  private async executeOnMcpServer(
    server: McpServer,
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const raw = server as unknown as {
      _registeredTools: Record<
        string,
        {
          handler: (args: Record<string, unknown>, extra: unknown) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>;
        }
      >;
    };

    const tool = raw._registeredTools[toolName];
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found on target server`);
    }

    return await tool.handler(toolArgs, {});
  }

  public getServerByPrefix(prefix: string): McpServer | undefined {
    const lowerPrefix = prefix.toLowerCase();
    if (this.storeServers.has(lowerPrefix)) {
      return this.storeServers.get(lowerPrefix)?.server;
    }

    switch (lowerPrefix) {
      case 'wc':
        return this.wcServer;
      case 'inv':
        return this.inventoryServer;
      case 'sup':
        return this.supportServer;
      default:
        return undefined;
    }
  }

  public async getRawToolsForPrefix(
    prefix: string
  ): Promise<Array<{ name: string; description?: string; inputSchema: unknown }>> {
    return this.fetchToolsFromUpstream(prefix);
  }

  public async executeRawTool(
    prefix: string,
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    return this.dispatchToUpstream(prefix, toolName, toolArgs);
  }
}
