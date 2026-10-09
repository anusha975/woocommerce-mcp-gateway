import { describe, it, expect, vi } from 'vitest';
import { WooCommerceClient } from '../../src/connectors/woocommerce.client.js';
import {
  WooCommerceAuthError,
  WooCommerceNotFoundError,
  WooCommerceRateLimitError,
  WooCommerceTimeoutError,
  WooCommerceUpstreamError,
  WooCommerceValidationError,
  WooCommerceError,
} from '../../src/connectors/woocommerce.errors.js';
import {
  mockRawProductsList,
  mockRawProductDetail,
  mockRawOrdersList,
  mockRawOrderDetail,
} from '../fixtures/woocommerce.fixtures.js';

describe('WooCommerceClient (Unit & Mocked HTTP)', () => {
  const defaultOptions = {
    baseUrl: 'https://mock-store.example.com',
    consumerKey: 'ck_mock_key_123',
    consumerSecret: 'cs_mock_secret_456',
    timeoutMs: 2000,
  };

  it('should list products and return normalized pagination structure', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawProductsList), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-wp-total': '42',
          'x-wp-totalpages': '5',
        },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    const result = await client.listProducts({ page: 2, per_page: 10, search: 'jacket' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/wp-json/wc/v3/products');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('per_page=10');
    expect(calledUrl).toContain('search=jacket');

    expect(result.page).toBe(2);
    expect(result.perPage).toBe(10);
    expect(result.totalItems).toBe(42);
    expect(result.totalPages).toBe(5);
    expect(result.items.length).toBe(2);

    const firstProduct = result.items[0];
    expect(firstProduct?.id).toBe(101);
    expect(firstProduct?.name).toBe('Classic Leather Jacket');
    expect(firstProduct?.price).toBe('199.99');
    expect(firstProduct?.stockQuantity).toBe(15);
    expect(firstProduct?.categories[0]?.name).toBe('Outerwear');
  });

  it('should retrieve a single product by ID with normalized details', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawProductDetail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    const product = await client.getProduct(101);

    expect(product.id).toBe(101);
    expect(product.sku).toBe('JKT-LTH-01');
    expect(product.description).toContain('motorcycle jacket');
    expect(product.dimensions.length).toBe('40');
    expect(product.attributes.length).toBe(2);
    expect(product.tags[0]?.name).toBe('Winter');
    expect(product.images[0]?.src).toContain('jacket-front.jpg');
  });

  it('should list orders and return normalized order summaries', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawOrdersList), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-wp-total': '1',
          'x-wp-totalpages': '1',
        },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    const result = await client.listOrders({ status: 'processing' });

    expect(result.items.length).toBe(1);
    const firstOrder = result.items[0];
    expect(firstOrder?.id).toBe(2001);
    expect(firstOrder?.total).toBe('234.49');
    expect(firstOrder?.paymentMethodTitle).toBe('Credit Card (Stripe)');
    expect(firstOrder?.totalLineItems).toBe(2);
  });

  it('should retrieve order details and keep sensitive customer personal info safe', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawOrderDetail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    const order = await client.getOrder(2001);

    expect(order.id).toBe(2001);
    expect(order.lineItems.length).toBe(1);
    expect(order.lineItems[0]?.name).toBe('Classic Leather Jacket');
    expect(order.shippingLines[0]?.methodTitle).toBe('Priority Express');

    // Customer safe representation: city/state/country preserved, but phone/email/street omitted
    expect(order.customer.customerId).toBe(884);
    expect(order.customer.city).toBe('Seattle');
    expect(order.customer.state).toBe('WA');
    expect(order.customer.country).toBe('US');

    const stringified = JSON.stringify(order);
    expect(stringified).not.toContain('jane.doe@example-sensitive.com');
    expect(stringified).not.toContain('555-0199');
    expect(stringified).not.toContain('123 Confidential Way');
  });

  it('should throw WooCommerceValidationError on invalid product or order ID', async () => {
    const client = new WooCommerceClient(defaultOptions);

    await expect(client.getProduct(0)).rejects.toThrow(WooCommerceValidationError);
    await expect(client.getProduct(-5)).rejects.toThrow(WooCommerceValidationError);
    await expect(client.getOrder(0)).rejects.toThrow(WooCommerceValidationError);
  });

  it('should throw WooCommerceAuthError on HTTP 401/403 responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'woocommerce_rest_cannot_view', message: 'Sorry, you cannot list resources.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.listProducts()).rejects.toThrow(WooCommerceAuthError);
  });

  it('should throw WooCommerceNotFoundError on HTTP 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'woocommerce_rest_product_invalid_id', message: 'Invalid ID.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.getProduct(99999)).rejects.toThrow(WooCommerceNotFoundError);
  });

  it('should throw WooCommerceRateLimitError on HTTP 429 when retry delay is high', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Retry-After': '30' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.listProducts()).rejects.toThrow(WooCommerceRateLimitError);
  });

  it('should throw WooCommerceUpstreamError on HTTP 500 / 503 outages', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.listProducts()).rejects.toThrow(WooCommerceUpstreamError);
  });

  it('should throw WooCommerceError on malformed JSON response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('<html><body>Cloudflare 520 Error</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    await expect(client.listProducts()).rejects.toThrow(WooCommerceError);
  });

  it('should throw WooCommerceTimeoutError when request aborts', async () => {
    const mockFetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        const signal = options?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const client = new WooCommerceClient({
      ...defaultOptions,
      timeoutMs: 10,
      fetchFn: mockFetch,
    });

    await expect(client.listProducts()).rejects.toThrow(WooCommerceTimeoutError);
  });

  it('should perform safe configuration check via checkConfiguration', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ environment: { version: '8.9.0' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new WooCommerceClient({ ...defaultOptions, fetchFn: mockFetch });
    const check = await client.checkConfiguration();

    expect(check.status).toBe('ok');
    expect(check.authenticated).toBe(true);
    expect(check.storeUrl).toBe('https://mock-store.example.com');
    expect(typeof check.latencyMs).toBe('number');

    // Verify secrets are NOT printed in config check
    const stringified = JSON.stringify(check);
    expect(stringified).not.toContain('ck_mock_key_123');
    expect(stringified).not.toContain('cs_mock_secret_456');
  });
});
