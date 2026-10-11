import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { WooCommerceClient } from '../../src/connectors/woocommerce.client.js';
import { WooCommerceNotFoundError, WooCommerceUpstreamError } from '../../src/connectors/woocommerce.errors.js';
import { createProductInputSchema } from '../../src/tools/products.tools.js';

describe('Product Tools Unit & Logic Tests', () => {
  const defaultOptions = {
    baseUrl: 'https://mock-store.example.com',
    consumerKey: 'ck_test',
    consumerSecret: 'cs_test',
  };

  it('should filter low-stock items correctly without misrepresenting untracked inventory', async () => {
    const productsWithMixedInventory = [
      // 1. Tracked, below threshold (should be included)
      {
        id: 1,
        name: 'Low Stock Hat',
        slug: 'low-stock-hat',
        type: 'simple',
        status: 'publish',
        sku: 'HAT-01',
        price: '20.00',
        regular_price: '20.00',
        sale_price: '',
        on_sale: false,
        stock_status: 'instock',
        stock_quantity: 2,
        categories: [],
      },
      // 2. Tracked, above threshold (should NOT be included)
      {
        id: 2,
        name: 'Plentiful Socks',
        slug: 'plentiful-socks',
        type: 'simple',
        status: 'publish',
        sku: 'SCK-02',
        price: '10.00',
        regular_price: '10.00',
        sale_price: '',
        on_sale: false,
        stock_status: 'instock',
        stock_quantity: 50,
        categories: [],
      },
      // 3. Out of stock status (should be included)
      {
        id: 3,
        name: 'Sold Out Scarf',
        slug: 'sold-out-scarf',
        type: 'simple',
        status: 'publish',
        sku: 'SCF-03',
        price: '30.00',
        regular_price: '30.00',
        sale_price: '',
        on_sale: false,
        stock_status: 'outofstock',
        stock_quantity: 0,
        categories: [],
      },
      // 4. Untracked inventory (stock_quantity is null, stock_status is instock -> should NOT be included as low stock)
      {
        id: 4,
        name: 'Virtual Gift Card',
        slug: 'virtual-gift-card',
        type: 'virtual',
        status: 'publish',
        sku: 'GFT-04',
        price: '100.00',
        regular_price: '100.00',
        sale_price: '',
        on_sale: false,
        stock_status: 'instock',
        stock_quantity: null,
        categories: [],
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(productsWithMixedInventory), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-wp-total': '4',
          'x-wp-totalpages': '1',
        },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    const result = await client.listProducts();

    const threshold = 5;
    const lowStock = result.items.filter((item) => {
      if (item.stockStatus === 'outofstock') return true;
      if (item.stockQuantity !== null && item.stockQuantity <= threshold) return true;
      return false;
    });

    expect(lowStock.length).toBe(2);
    expect(lowStock.map((i) => i.id)).toEqual([1, 3]);

    // Ensure untracked product (#4) was not falsely flagged
    expect(lowStock.some((i) => i.id === 4)).toBe(false);
  });

  it('should handle getProduct not found error cleanly', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'woocommerce_rest_product_invalid_id', message: 'Invalid ID.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.getProduct(9999)).rejects.toThrow(WooCommerceNotFoundError);
  });

  it('should handle upstream outage cleanly', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('Bad Gateway', {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.listProducts()).rejects.toThrow(WooCommerceUpstreamError);
  });

  describe('createProductInputSchema', () => {
    const schema = z.object(createProductInputSchema);

    it('should validate and parse minimal valid input with defaults applied', () => {
      const parsed = schema.parse({ name: 'Minimal T-Shirt' });
      expect(parsed.name).toBe('Minimal T-Shirt');
      expect(parsed.type).toBe('simple');
      expect(parsed.status).toBe('publish');
    });

    it('should validate and parse complete valid input', () => {
      const input = {
        name: 'Premium Wool Sweater',
        type: 'simple' as const,
        regular_price: '79.99',
        description: '<p>A warm wool sweater</p>',
        short_description: 'Warm sweater',
        sku: 'SWT-WOL-01',
        status: 'draft' as const,
        manage_stock: true,
        stock_quantity: 15,
        stock_status: 'instock' as const,
      };

      const parsed = schema.parse(input);
      expect(parsed).toEqual(input);
    });

    it('should fail validation when name is missing or empty', () => {
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ name: '' })).toThrow();
    });

    it('should fail validation when type is invalid', () => {
      expect(() => schema.parse({ name: 'Item', type: 'subscription' as unknown as 'simple' })).toThrow();
    });

    it('should fail validation when status is invalid', () => {
      expect(() => schema.parse({ name: 'Item', status: 'archived' as unknown as 'publish' })).toThrow();
    });

    it('should fail validation when stock_status is invalid', () => {
      expect(() => schema.parse({ name: 'Item', stock_status: 'preorder' as unknown as 'instock' })).toThrow();
    });

    it('should fail validation when stock_quantity is not an integer', () => {
      expect(() => schema.parse({ name: 'Item', stock_quantity: 4.5 })).toThrow();
    });
  });
});
