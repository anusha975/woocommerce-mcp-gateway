import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppConfig, User } from '../types/index.js';
import type { McpAggregator } from './aggregator.js';
import type { UpstreamService } from '../services/upstream.service.js';
import type { AuditService } from '../services/audit.service.js';
import { SERVER_NAME, SERVER_VERSION } from '../tools/index.js';
import {
  listProductsInputSchema,
  searchProductsInputSchema,
  getProductInputSchema,
  getLowStockProductsInputSchema,
  createProductInputSchema,
} from '../tools/products.tools.js';
import {
  listRecentOrdersInputSchema,
  listOrdersInputSchema,
  getOrderInputSchema,
  searchOrdersByStatusInputSchema,
  getOrderSummaryInputSchema,
  updateOrderStatusInputSchema,
} from '../tools/orders.tools.js';
import { healthCheckInputSchema } from '../tools/health.tool.js';
import { z } from 'zod';

/**
 * Creates an aggregated McpServer exposing tools from all registered upstream servers
 * with namespacing, collision handling, failure isolation, and per-call audit logging.
 */
export function createAggregatedMcpServer(
  _config: AppConfig,
  aggregator: McpAggregator,
  upstreamService: UpstreamService,
  _auditService: AuditService,
  currentUser?: User
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

  const fallbackUser: User = currentUser || {
    id: 'usr_default',
    username: 'api_client',
    role: 'member',
    createdAt: new Date().toISOString(),
  };

  const isEnabled = (prefix: string) => {
    const ups = upstreamService.listUpstreams().find((u) => u.prefix === prefix);
    return ups ? ups.enabled : true;
  };

  // ---------------------------------------------------------------------------
  // UPSTREAM 1: WooCommerce Tools (Canonical Names)
  // ---------------------------------------------------------------------------
  if (isEnabled('wc')) {
    server.tool(
      'health_check',
      'Returns structured operational health, environment status, and upstream WooCommerce configuration.',
      healthCheckInputSchema,
      async (args) => aggregator.executeToolCall('wc__health_check', args, fallbackUser)
    );

    server.tool(
      'list_products',
      'Lists WooCommerce catalog products with filtering, pagination, and stock status filters.',
      listProductsInputSchema,
      async (args) => aggregator.executeToolCall('wc__list_products', args, fallbackUser)
    );

    server.tool(
      'search_products',
      'Searches catalog products by query string with status filtering.',
      searchProductsInputSchema,
      async (args) => aggregator.executeToolCall('wc__search_products', args, fallbackUser)
    );

    server.tool(
      'get_product',
      'Retrieves detailed WooCommerce product by numeric ID.',
      getProductInputSchema,
      async (args) => aggregator.executeToolCall('wc__get_product', args, fallbackUser)
    );

    server.tool(
      'get_low_stock_products',
      'Lists products with stock quantity below threshold.',
      getLowStockProductsInputSchema,
      async (args) => aggregator.executeToolCall('wc__get_low_stock_products', args, fallbackUser)
    );

    server.tool(
      'create_product',
      'Creates a new product in the WooCommerce catalog.',
      createProductInputSchema,
      async (args) => aggregator.executeToolCall('wc__create_product', args, fallbackUser)
    );

    server.tool(
      'list_recent_orders',
      'Lists recent store orders with customer PII exclusion and status filtering.',
      listRecentOrdersInputSchema,
      async (args) => aggregator.executeToolCall('wc__list_recent_orders', args, fallbackUser)
    );

    server.tool(
      'list_orders',
      'Lists store orders with customer PII exclusion, pagination, and status filtering.',
      listOrdersInputSchema,
      async (args) => aggregator.executeToolCall('wc__list_orders', args, fallbackUser)
    );

    server.tool(
      'get_order',
      'Retrieves detailed WooCommerce order by ID with billing and line items.',
      getOrderInputSchema,
      async (args) => aggregator.executeToolCall('wc__get_order', args, fallbackUser)
    );

    server.tool(
      'search_orders_by_status',
      'Filters store orders by exact lifecycle status.',
      searchOrdersByStatusInputSchema,
      async (args) => aggregator.executeToolCall('wc__search_orders_by_status', args, fallbackUser)
    );

    server.tool(
      'get_order_summary',
      'Retrieves safe high-level order summary with customer PII excluded.',
      getOrderSummaryInputSchema,
      async (args) => aggregator.executeToolCall('wc__get_order_summary', args, fallbackUser)
    );

    server.tool(
      'update_order_status',
      'Updates the fulfillment status of an order.',
      updateOrderStatusInputSchema,
      async (args) => aggregator.executeToolCall('wc__update_order_status', args, fallbackUser)
    );
  }

  // ---------------------------------------------------------------------------
  // UPSTREAM 2: Inventory & Warehouse Tools (Prefix: inv__)
  // ---------------------------------------------------------------------------
  if (isEnabled('inv')) {
    server.tool(
      'inv__check_warehouse_stock',
      '[Warehouse & Inventory] Checks physical warehouse aisle, bin, reserved units, and available stock for a SKU',
      {
        sku: z.string().describe('Stock Keeping Unit (SKU) identifier'),
      },
      async (args) => aggregator.executeToolCall('inv__check_warehouse_stock', args, fallbackUser)
    );

    server.tool(
      'inv__list_suppliers',
      '[Warehouse & Inventory] Lists approved suppliers, lead times, reliability scores, and vendor contacts',
      {
        category: z.string().optional().describe('Optional category filter (e.g. apparel, music, accessories)'),
      },
      async (args) => aggregator.executeToolCall('inv__list_suppliers', args, fallbackUser)
    );

    server.tool(
      'inv__calculate_reorder_point',
      '[Warehouse & Inventory] Calculates optimal inventory reorder threshold and safety stock buffer',
      {
        sku: z.string().describe('Product SKU'),
        dailySalesVelocity: z.number().positive().default(5).describe('Average units sold per calendar day'),
        leadTimeDays: z.number().int().positive().default(7).describe('Supplier delivery lead time in days'),
        safetyStockBufferPercent: z.number().min(0).max(100).default(20).describe('Safety buffer percentage'),
      },
      async (args) => aggregator.executeToolCall('inv__calculate_reorder_point', args, fallbackUser)
    );
  }

  // ---------------------------------------------------------------------------
  // UPSTREAM 3: Customer Support & Returns Tools (Prefix: sup__)
  // ---------------------------------------------------------------------------
  if (isEnabled('sup')) {
    server.tool(
      'sup__get_customer_satisfaction',
      '[Customer Support] Retrieves CSAT score, Net Promoter Score tier, and open ticket count for a customer',
      {
        customerId: z.number().int().positive().describe('Customer numerical identifier'),
      },
      async (args) => aggregator.executeToolCall('sup__get_customer_satisfaction', args, fallbackUser)
    );

    server.tool(
      'sup__initiate_return_request',
      '[Customer Support] Validates 30-day return eligibility and generates an RMA tracking code for an order',
      {
        orderId: z.number().int().positive().describe('WooCommerce order ID to return items from'),
        reason: z.enum([
          'defective_item',
          'wrong_item_received',
          'changed_mind',
          'sizing_fit_issue',
          'arrived_too_late',
        ]).describe('Standard return reason category'),
        customerNotes: z.string().optional().describe('Additional notes from customer'),
      },
      async (args) => aggregator.executeToolCall('sup__initiate_return_request', args, fallbackUser)
    );

    server.tool(
      'sup__get_vip_status',
      '[Customer Support] Determines VIP loyalty tier, perk entitlements, and discounts based on lifetime spend',
      {
        customerId: z.number().int().positive().describe('Customer ID'),
      },
      async (args) => aggregator.executeToolCall('sup__get_vip_status', args, fallbackUser)
    );
  }

  return server;
}
