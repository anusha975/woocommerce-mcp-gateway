import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppConfig, User } from '../types/index.js';
import type { UpstreamService } from '../services/upstream.service.js';
import type { AuditService } from '../services/audit.service.js';
import { createMcpServer as createWcServer } from '../tools/index.js';
import { createInventoryMcpServer } from '../servers/inventory.server.js';
import { createSupportMcpServer } from '../servers/support.server.js';
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

export class McpAggregator {
  private wcServer: McpServer;
  private inventoryServer: McpServer;
  private supportServer: McpServer;

  constructor(
    private config: AppConfig,
    private upstreamService: UpstreamService,
    private auditService: AuditService
  ) {
    this.wcServer = createWcServer(this.config);
    this.inventoryServer = createInventoryMcpServer();
    this.supportServer = createSupportMcpServer();
  }

  /**
   * Retrieves all available tools from currently enabled upstream servers.
   * If an upstream is disabled, its tools are completely omitted.
   */
  public async getAggregatedTools(): Promise<AggregatedToolDefinition[]> {
    const upstreams = this.upstreamService.listUpstreams().filter((u) => u.enabled);
    const aggregated: AggregatedToolDefinition[] = [];

    for (const upstream of upstreams) {
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
   * Dispatches a tool call to the appropriate upstream server with failure isolation,
   * timeout handling, and persistent audit logging.
   */
  public async executeToolCall(
    prefixedToolName: string,
    toolArgs: Record<string, unknown>,
    user: User
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const start = performance.now();
    const parts = prefixedToolName.split('__');
    const prefix = parts[0] || '';
    const originalToolName = parts.slice(1).join('__') || prefixedToolName;

    const upstream = this.upstreamService.listUpstreams().find((u) => u.prefix === prefix);

    // 1. Validate upstream existence and enabled state
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
        error: `No registered upstream server matches tool prefix '${prefix}'`,
      });

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'UNKNOWN_UPSTREAM',
                message: `Tool '${prefixedToolName}' belongs to an unrecognized upstream server prefix '${prefix}'.`,
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

    // 2. Dispatch to target upstream with failure isolation
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

      // Failure isolation: Return clean error ToolResult without crashing the gateway
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

  private async fetchToolsFromUpstream(prefix: string): Promise<Array<{ name: string; description?: string; inputSchema: unknown }>> {
    switch (prefix) {
      case 'wc': {
        const raw = this.wcServer as unknown as { _registeredTools: Record<string, { description?: string; inputSchema?: unknown }> };
        const tools = raw._registeredTools || {};
        return Object.entries(tools).map(([name, def]) => ({
          name,
          description: def.description,
          inputSchema: def.inputSchema,
        }));
      }
      case 'inv': {
        const raw = this.inventoryServer as unknown as { _registeredTools: Record<string, { description?: string; inputSchema?: unknown }> };
        const tools = raw._registeredTools || {};
        return Object.entries(tools).map(([name, def]) => ({
          name,
          description: def.description,
          inputSchema: def.inputSchema,
        }));
      }
      case 'sup': {
        const raw = this.supportServer as unknown as { _registeredTools: Record<string, { description?: string; inputSchema?: unknown }> };
        const tools = raw._registeredTools || {};
        return Object.entries(tools).map(([name, def]) => ({
          name,
          description: def.description,
          inputSchema: def.inputSchema,
        }));
      }
      default:
        return [];
    }
  }

  private async dispatchToUpstream(
    prefix: string,
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    switch (prefix) {
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
    switch (prefix) {
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
