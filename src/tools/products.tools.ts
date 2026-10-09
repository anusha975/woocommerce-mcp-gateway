import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WooCommerceClient } from '../connectors/woocommerce.client.js';
import { WooCommerceError } from '../connectors/woocommerce.errors.js';
import { logger } from '../logging/logger.js';

// --- Input Schemas ---

export const listProductsInputSchema = {
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
    .describe('Number of items per page (1 to 100, default 10)'),
  category: z
    .string()
    .optional()
    .describe('Filter products by category ID (e.g., "12")'),
  status: z
    .enum(['any', 'draft', 'pending', 'private', 'publish'])
    .default('publish')
    .describe('Product publishing status'),
  stock_status: z
    .enum(['instock', 'outofstock', 'onbackorder'])
    .optional()
    .describe('Filter by stock status'),
  sku: z
    .string()
    .optional()
    .describe('Filter by exact product SKU'),
  min_price: z
    .string()
    .optional()
    .describe('Minimum price boundary in store currency (e.g. "10.00")'),
  max_price: z
    .string()
    .optional()
    .describe('Maximum price boundary in store currency (e.g. "100.00")'),
  orderby: z
    .enum(['date', 'id', 'title', 'slug', 'price', 'popularity', 'rating'])
    .default('date')
    .describe('Field to sort by'),
  order: z
    .enum(['asc', 'desc'])
    .default('desc')
    .describe('Sort direction: "asc" or "desc"'),
};

export const searchProductsInputSchema = {
  query: z
    .string()
    .min(1, 'Search query cannot be empty')
    .describe('Search keyword or phrase matching product titles, descriptions, or SKUs'),
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

export const getProductInputSchema = {
  id: z
    .number()
    .int('Product ID must be an integer')
    .positive('Product ID must be a positive number')
    .describe('The unique numeric WooCommerce product ID (e.g. 101)'),
};

export const getLowStockProductsInputSchema = {
  threshold: z
    .number()
    .int('Threshold must be an integer')
    .min(0, 'Threshold cannot be negative')
    .default(5)
    .describe('Stock threshold number (default: 5). Products with tracked stock at or below this value are returned.'),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number for scanning catalog'),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Batch size of products to inspect per page (1 to 100, default 20)'),
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
  return 'An unexpected error occurred while executing the product operation.';
}

/**
 * Registers all product-related read-only tools on the MCP server
 */
export function registerProductTools(server: McpServer, client: WooCommerceClient): void {
  // 1. list_products
  server.tool(
    'list_products',
    'List products from the WooCommerce catalog with pagination, status, category, price filtering, and sorting.',
    listProductsInputSchema,
    async (args) => {
      try {
        if (args.min_price && args.max_price) {
          const min = parseFloat(args.min_price);
          const max = parseFloat(args.max_price);
          if (!isNaN(min) && !isNaN(max) && min > max) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Validation error: min_price (${min}) cannot be greater than max_price (${max}).`,
                },
              ],
            };
          }
        }

        const result = await client.listProducts(args);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error }, 'Failed to execute list_products');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 2. search_products
  server.tool(
    'search_products',
    'Search WooCommerce products by matching keywords against product titles, descriptions, and SKUs.',
    searchProductsInputSchema,
    async (args) => {
      try {
        const result = await client.listProducts({
          search: args.query,
          page: args.page,
          per_page: args.per_page,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query: args.query,
                  totalMatches: result.totalItems,
                  page: result.page,
                  perPage: result.perPage,
                  totalPages: result.totalPages,
                  products: result.items,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error }, 'Failed to execute search_products');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 3. get_product
  server.tool(
    'get_product',
    'Retrieve full details for a single product by its WooCommerce product ID (including price, SKU, attributes, dimensions, stock, tags, and images).',
    getProductInputSchema,
    async (args) => {
      try {
        const product = await client.getProduct(args.id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(product, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error, productId: args.id }, 'Failed to execute get_product');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );

  // 4. get_low_stock_products
  server.tool(
    'get_low_stock_products',
    'Retrieve products that are low in stock or out of stock based on a configurable stock threshold. Safely handles products with untracked inventory.',
    getLowStockProductsInputSchema,
    async (args) => {
      try {
        const result = await client.listProducts({
          page: args.page,
          per_page: args.per_page,
          status: 'publish',
        });

        const lowStockItems = result.items
          .filter((item) => {
            // Case 1: Out of stock status
            if (item.stockStatus === 'outofstock') {
              return true;
            }
            // Case 2: Stock tracking enabled and quantity at or below threshold
            if (item.stockQuantity !== null && item.stockQuantity <= args.threshold) {
              return true;
            }
            // Note: If stock tracking is disabled (stockQuantity is null and stockStatus is instock),
            // we do NOT falsely flag it as low stock to avoid misleading inventory claims.
            return false;
          })
          .map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            price: item.price,
            stockStatus: item.stockStatus,
            stockQuantity: item.stockQuantity,
            inventoryTracked: item.stockQuantity !== null,
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  threshold: args.threshold,
                  evaluatedCount: result.items.length,
                  lowStockCount: lowStockItems.length,
                  page: result.page,
                  perPage: result.perPage,
                  totalPages: result.totalPages,
                  items: lowStockItems,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.warn({ err: error }, 'Failed to execute get_low_stock_products');
        return {
          isError: true,
          content: [{ type: 'text', text: formatToolError(error) }],
        };
      }
    }
  );
}
