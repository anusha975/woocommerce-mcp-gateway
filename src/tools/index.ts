import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppConfig } from '../types/index.js';
import { WooCommerceClient } from '../connectors/woocommerce.client.js';
import { healthCheckInputSchema, handleHealthCheck } from './health.tool.js';
import { registerProductTools } from './products.tools.js';
import { registerOrderTools } from './orders.tools.js';

export const SERVER_NAME = 'woocommerce-mcp-gateway';
export const SERVER_VERSION = '1.0.0';

/**
 * Instantiates and configures an McpServer instance with all registered tools.
 */
export function createMcpServer(
  config: AppConfig,
  client?: WooCommerceClient
): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  const wcClient = client ?? WooCommerceClient.fromConfig(config);

  // 1. Register diagnostic health check tool
  server.tool(
    'health_check',
    'Returns structured operational health, environment status, and upstream WooCommerce configuration without exposing sensitive secrets.',
    healthCheckInputSchema,
    async (args) => {
      const result = handleHealthCheck(config, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // 2. Register WooCommerce product tools
  registerProductTools(server, wcClient);

  // 3. Register WooCommerce order tools
  registerOrderTools(server, wcClient);

  return server;
}

export * from './health.tool.js';
export * from './products.tools.js';
export * from './orders.tools.js';
