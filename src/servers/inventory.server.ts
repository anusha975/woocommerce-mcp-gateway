import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function createInventoryMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'inventory-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Mock Warehouse Database
  const warehouseDatabase: Record<
    string,
    { aisle: string; bin: string; onHand: number; reserved: number; sku: string }
  > = {
    'WOO-ALBUM': { aisle: 'Aisle 2', bin: 'B-04', onHand: 42, reserved: 2, sku: 'WOO-ALBUM' },
    'WOO-SINGLE': { aisle: 'Aisle 2', bin: 'B-05', onHand: 120, reserved: 5, sku: 'WOO-SINGLE' },
    'WOO-HOODIE': { aisle: 'Aisle 5', bin: 'H-12', onHand: 18, reserved: 4, sku: 'WOO-HOODIE' },
    'WOO-TSHIRT': { aisle: 'Aisle 3', bin: 'T-01', onHand: 85, reserved: 10, sku: 'WOO-TSHIRT' },
    'DEFAULT': { aisle: 'Aisle 1', bin: 'General-01', onHand: 50, reserved: 0, sku: 'DEFAULT' },
  };

  // 1. Tool: check_warehouse_stock
  server.tool(
    'check_warehouse_stock',
    'Checks physical warehouse location, on-hand quantity, reserved units, and available units for a product SKU or ID.',
    {
      sku: z.string().describe('Stock Keeping Unit (SKU) identifier'),
    },
    async (args) => {
      const item = warehouseDatabase[args.sku.toUpperCase()] || {
        aisle: 'Aisle 9',
        bin: 'Overflow-B',
        onHand: 25,
        reserved: 1,
        sku: args.sku,
      };

      const available = Math.max(0, item.onHand - item.reserved);
      const result = {
        sku: item.sku,
        warehouse: 'Main Distribution Center #1 (North)',
        location: `${item.aisle}, Bin ${item.bin}`,
        quantityOnHand: item.onHand,
        quantityReserved: item.reserved,
        quantityAvailable: available,
        status: available > 10 ? 'in_stock' : available > 0 ? 'low_stock' : 'out_of_stock',
        lastCountDate: '2026-10-10T08:00:00Z',
      };

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

  // 2. Tool: list_suppliers
  server.tool(
    'list_suppliers',
    'Lists approved warehouse supply chain vendors, lead times in days, reliability scores, and contact information.',
    {
      category: z.string().optional().describe('Optional category filter (e.g. apparel, music, accessories)'),
    },
    async (args) => {
      const suppliers = [
        {
          id: 'SUP-01',
          name: 'Apex Apparel Fabricators Ltd.',
          category: 'apparel',
          leadTimeDays: 5,
          reliabilityScore: 0.98,
          contactEmail: 'orders@apex-apparel.test',
          terms: 'Net 30',
        },
        {
          id: 'SUP-02',
          name: 'SoundWave Vinyl & Media Pressing',
          category: 'music',
          leadTimeDays: 14,
          reliabilityScore: 0.94,
          contactEmail: 'dispatch@soundwave-press.test',
          terms: 'Net 15',
        },
        {
          id: 'SUP-03',
          name: 'Global Merchandise & Goods Inc.',
          category: 'accessories',
          leadTimeDays: 7,
          reliabilityScore: 0.96,
          contactEmail: 'fulfillment@globalmerch.test',
          terms: 'Net 30',
        },
      ];

      const filtered = args.category
        ? suppliers.filter((s) => s.category.toLowerCase() === args.category?.toLowerCase())
        : suppliers;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: filtered.length, suppliers: filtered }, null, 2),
          },
        ],
      };
    }
  );

  // 3. Tool: calculate_reorder_point
  server.tool(
    'calculate_reorder_point',
    'Calculates optimal inventory reorder threshold and safety stock based on daily sales velocity and vendor lead time.',
    {
      sku: z.string().describe('Product SKU'),
      dailySalesVelocity: z.number().positive().default(5).describe('Average units sold per calendar day'),
      leadTimeDays: z.number().int().positive().default(7).describe('Supplier delivery lead time in days'),
      safetyStockBufferPercent: z.number().min(0).max(100).default(20).describe('Safety buffer percentage (e.g. 20)'),
    },
    async (args) => {
      const leadTimeDemand = args.dailySalesVelocity * args.leadTimeDays;
      const safetyStock = Math.ceil(leadTimeDemand * (args.safetyStockBufferPercent / 100));
      const reorderPoint = leadTimeDemand + safetyStock;
      const recommendedOrderQuantity = Math.max(reorderPoint * 2, 50);

      const result = {
        sku: args.sku,
        dailySalesVelocity: args.dailySalesVelocity,
        leadTimeDays: args.leadTimeDays,
        leadTimeDemand,
        safetyStock,
        reorderPoint,
        recommendedOrderQuantity,
        formula: 'ReorderPoint = (DailyVelocity * LeadTime) + SafetyStock',
      };

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

  return server;
}
