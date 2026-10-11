import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function createSupportMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'customer-support-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 1. Tool: get_customer_satisfaction
  server.tool(
    'get_customer_satisfaction',
    'Retrieves Customer Satisfaction (CSAT) rating, Net Promoter Score tier, and open ticket count for a customer.',
    {
      customerId: z.number().int().positive().describe('Customer numerical identifier'),
    },
    async (args) => {
      // Mock CRM lookup
      const result = {
        customerId: args.customerId,
        csatScore: 4.8,
        csatScale: 5.0,
        npsCategory: 'Promoter',
        sentiment: 'Highly Satisfied',
        lifetimeTickets: 2,
        openTickets: 0,
        averageResolutionHours: 3.2,
        preferredChannel: 'Email',
        lastInteractionDate: '2026-10-08T14:30:00Z',
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

  // 2. Tool: initiate_return_request
  server.tool(
    'initiate_return_request',
    'Validates customer return window eligibility and generates a Return Merchandise Authorization (RMA) tracking code.',
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
    async (args) => {
      const rmaId = `RMA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const result = {
        rmaNumber: rmaId,
        orderId: args.orderId,
        status: 'authorized',
        eligibleForFullRefund: true,
        restockingFeeDeducted: 0,
        returnWindowDaysRemaining: 21,
        returnMethod: 'Prepaid Courier Drop-Off (USPS / DHL)',
        instructions:
          'Pack the items in original packaging. Affix the generated RMA barcode label to the outside. Drop off at any authorized parcel hub.',
        createdAt: new Date().toISOString(),
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

  // 3. Tool: get_vip_status
  server.tool(
    'get_vip_status',
    'Determines VIP loyalty rewards tier, perks, and custom discount entitlement based on cumulative customer spend.',
    {
      customerId: z.number().int().positive().describe('Customer ID'),
    },
    async (args) => {
      // Deterministic tier based on customerId
      const spend = (args.customerId * 137.5) % 3000;
      let tier = 'Bronze Standard';
      let discountPercentage = 0;
      let freeExpeditedShipping = false;

      if (spend > 1500) {
        tier = 'Platinum Executive';
        discountPercentage = 20;
        freeExpeditedShipping = true;
      } else if (spend > 750) {
        tier = 'Gold VIP';
        discountPercentage = 15;
        freeExpeditedShipping = true;
      } else if (spend > 250) {
        tier = 'Silver Member';
        discountPercentage = 5;
        freeExpeditedShipping = false;
      }

      const result = {
        customerId: args.customerId,
        tier,
        lifetimeSpendEstimated: `$${spend.toFixed(2)}`,
        discountPercentage,
        freeExpeditedShipping,
        dedicatedSupportAgent: discountPercentage >= 15 ? 'Assigned' : 'Standard Queue',
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
