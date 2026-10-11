import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WooCommerceClient } from '../connectors/woocommerce.client.js';
import { WooCommerceError } from '../connectors/woocommerce.errors.js';
import { logger } from '../logging/logger.js';

// --- Supported WooCommerce Order Statuses ---
export const WOOCOMMERCE_ORDER_STATUSES = [
  'pending',
  'processing',
  'on-hold',
  'completed',
  'cancelled',
  'refunded',
  'failed',
  'trash',
] as const;

export type OrderStatus = (typeof WOOCOMMERCE_ORDER_STATUSES)[number];

// ISO 8601 validation for date filters
const isoDateSchema = z
  .string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    'Date must be a valid ISO 8601 date string (e.g. "2026-10-01T00:00:00Z" or "2026-10-01")'
  );

// --- Input Schemas ---

export const listRecentOrdersInputSchema = {
  page: z
    .number()
    .int()
    .min(1, 'page must be at least 1')
    .default(1)
    .describe('Page number (starts at 1)'),
  per_page: z
    .number()
    .int()
    .min(1, 'per_page must be at least 1')
    .max(100, 'per_page cannot exceed 100')
    .default(10)
    .describe('Number of orders per page (1 to 100, default 10)'),
  status: z
    .enum(['any', ...WOOCOMMERCE_ORDER_STATUSES])
    .optional()
    .describe('Filter orders by status (e.g., "processing", "completed", "on-hold")'),
  after: isoDateSchema
    .optional()
    .describe('Limit response to orders created after this ISO 8601 date (e.g. "2026-10-01T00:00:00Z")'),
  before: isoDateSchema
    .optional()
    .describe('Limit response to orders created before this ISO 8601 date (e.g. "2026-10-09T23:59:59Z")'),
  orderby: z
    .enum(['date', 'id', 'title', 'slug'])
    .default('date')
    .describe('Sort field (default: "date")'),
  order: z
    .enum(['asc', 'desc'])
    .default('desc')
    .describe('Sort direction (default: "desc" for most recent first)'),
};

export const listOrdersInputSchema = listRecentOrdersInputSchema;

export const getOrderInputSchema = {
  id: z
    .number()
    .int('Order ID must be an integer')
    .positive('Order ID must be a positive number')
    .describe('The unique numeric WooCommerce order ID (e.g. 2001)'),
};

export const searchOrdersByStatusInputSchema = {
  status: z
    .enum(WOOCOMMERCE_ORDER_STATUSES)
    .describe('The WooCommerce order status to filter by: pending, processing, on-hold, completed, cancelled, refunded, failed, trash'),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number (starts at 1)'),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Number of items per page (1 to 100, default 10)'),
};

export const getOrderSummaryInputSchema = {
  id: z
    .number()
    .int('Order ID must be an integer')
    .positive('Order ID must be a positive number')
    .describe('The unique numeric WooCommerce order ID (e.g. 2001)'),
};

export const updateOrderStatusInputSchema = {
  id: z
    .number()
    .int('Order ID must be an integer')
    .positive('Order ID must be a positive number')
    .describe('The unique numeric WooCommerce order ID (e.g. 2001)'),
  status: z
    .enum(WOOCOMMERCE_ORDER_STATUSES)
    .describe('The target WooCommerce order status: pending, processing, on-hold, completed, cancelled, refunded, failed, trash'),
};

/**
 * Formats a safe tool error message masking sensitive information
 */
function formatToolError(error: unknown): string {
  if (error instanceof WooCommerceError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred while executing the order operation.';
}

/**
 * Registers all order-related read-only tools on the MCP server
 */
export function registerOrderTools(server: McpServer, client: WooCommerceClient): void {
  // 1. list_recent_orders
  server.tool(
    'list_recent_orders',
    'Retrieve recent orders from WooCommerce with validated pagination, date filtering, and sorting. Excludes customer PII.',
    listRecentOrdersInputSchema,
    async (args) => {
      try {
        if (args.after && args.before) {
          const afterDate = new Date(args.after).getTime();
          const beforeDate = new Date(args.before).getTime();
          if (afterDate > beforeDate) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: 'Validation error: "after" date cannot be later than "before" date.',
                },
              ],
            };
          }
        }

        const result = await client.listOrders({
          page: args.page,
          per_page: args.per_page,
          status: args.status,
          after: args.after,
          before: args.before,
          orderby: args.orderby,
          order: args.order,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error }, 'Failed to execute list_recent_orders');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 1b. list_orders (Canonical MCP name for list_recent_orders)
  server.tool(
    'list_orders',
    'List store orders from WooCommerce with validated pagination, status filtering, and date boundaries. Excludes customer PII.',
    listRecentOrdersInputSchema,
    async (args) => {
      try {
        if (args.after && args.before) {
          const afterDate = new Date(args.after).getTime();
          const beforeDate = new Date(args.before).getTime();
          if (afterDate > beforeDate) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: 'Validation error: "after" date cannot be later than "before" date.',
                },
              ],
            };
          }
        }

        const result = await client.listOrders({
          page: args.page,
          per_page: args.per_page,
          status: args.status,
          after: args.after,
          before: args.before,
          orderby: args.orderby,
          order: args.order,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error }, 'Failed to execute list_orders');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 2. get_order
  server.tool(
    'get_order',
    'Retrieve detailed information for a specific order by ID (line items, shipping lines, totals, fee lines). Strictly excludes customer PII and payment secrets.',
    getOrderInputSchema,
    async (args) => {
      try {
        const order = await client.getOrder(args.id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(order, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error, orderId: args.id }, 'Failed to execute get_order');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 3. search_orders_by_status
  server.tool(
    'search_orders_by_status',
    'List orders filtered by an explicitly supported WooCommerce order status (pending, processing, on-hold, completed, cancelled, refunded, failed, trash).',
    searchOrdersByStatusInputSchema,
    async (args) => {
      try {
        const result = await client.listOrders({
          status: args.status,
          page: args.page,
          per_page: args.per_page,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  statusFilter: args.status,
                  page: result.page,
                  perPage: result.perPage,
                  totalOrders: result.totalItems,
                  totalPages: result.totalPages,
                  orders: result.items,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error, status: args.status }, 'Failed to execute search_orders_by_status');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 4. get_order_summary
  server.tool(
    'get_order_summary',
    'Retrieve a concise summary of an order including order ID, status, currency, financial totals, line item names/quantities, and timestamps.',
    getOrderSummaryInputSchema,
    async (args) => {
      try {
        const order = await client.getOrder(args.id);

        const summary = {
          id: order.id,
          number: order.number,
          status: order.status,
          currency: order.currency,
          total: order.total,
          totalTax: order.totalTax,
          shippingTotal: order.shippingTotal,
          paymentMethod: order.paymentMethodTitle,
          dateCreated: order.dateCreated,
          dateModified: order.dateModified,
          itemCount: order.lineItems.length,
          items: order.lineItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            total: item.total,
            sku: item.sku,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error, orderId: args.id }, 'Failed to execute get_order_summary');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 5. update_order_status
  server.tool(
    'update_order_status',
    'Update the status of an existing WooCommerce order (e.g. processing, completed, on-hold, cancelled, refunded, failed, trash).',
    updateOrderStatusInputSchema,
    async (args) => {
      try {
        const result = await client.updateOrderStatus(args.id, args.status);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error, orderId: args.id, status: args.status }, 'Failed to execute update_order_status');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );
}
