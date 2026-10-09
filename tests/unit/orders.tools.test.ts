import { describe, it, expect, vi } from 'vitest';
import { WooCommerceClient } from '../../src/connectors/woocommerce.client.js';
import { WooCommerceNotFoundError } from '../../src/connectors/woocommerce.errors.js';
import { mockRawOrderDetail } from '../fixtures/woocommerce.fixtures.js';

describe('Order Tools Unit & Logic Tests', () => {
  const defaultOptions = {
    baseUrl: 'https://mock-store.example.com',
    consumerKey: 'ck_test',
    consumerSecret: 'cs_test',
  };

  it('should strip customer PII (phone, email, street address) from order details', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawOrderDetail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    const order = await client.getOrder(2001);

    expect(order.id).toBe(2001);
    expect(order.customer.city).toBe('Seattle');

    // Verify PII is absent from returned model
    const serialized = JSON.stringify(order);
    expect(serialized).not.toContain('jane.doe@example-sensitive.com');
    expect(serialized).not.toContain('555-0199');
    expect(serialized).not.toContain('123 Confidential Way');
  });

  it('should handle missing order ID with WooCommerceNotFoundError', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'woocommerce_rest_shop_order_invalid_id', message: 'Invalid ID.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.getOrder(99999)).rejects.toThrow(WooCommerceNotFoundError);
  });
});
