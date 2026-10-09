import { describe, it, expect, beforeAll } from 'vitest';
import { WooCommerceClient } from '../../src/connectors/woocommerce.client.js';

const isLiveTestEnabled =
  process.env['RUN_LIVE_TESTS'] === 'true' &&
  Boolean(process.env['WOOCOMMERCE_BASE_URL'] || process.env['WOOCOMMERCE_URL']) &&
  Boolean(process.env['WOOCOMMERCE_CONSUMER_KEY']) &&
  !process.env['WOOCOMMERCE_CONSUMER_KEY']?.includes('placeholder') &&
  Boolean(process.env['WOOCOMMERCE_CONSUMER_SECRET']) &&
  !process.env['WOOCOMMERCE_CONSUMER_SECRET']?.includes('placeholder');

describe.skipIf(!isLiveTestEnabled)(
  'WooCommerce Live Integration Tests (Optional / Gated)',
  () => {
    let liveClient: WooCommerceClient;

    beforeAll(() => {
      liveClient = new WooCommerceClient({
        baseUrl: (process.env['WOOCOMMERCE_BASE_URL'] || process.env['WOOCOMMERCE_URL']) || 'https://placeholder-store.com',
        consumerKey: process.env['WOOCOMMERCE_CONSUMER_KEY'] || 'ck_placeholder',
        consumerSecret: process.env['WOOCOMMERCE_CONSUMER_SECRET'] || 'cs_placeholder',
        timeoutMs: 15000,
      });
    });

    it('should successfully ping live WooCommerce store', async () => {
      const result = await liveClient.checkConfiguration();
      expect(result.status).toBe('ok');
      expect(result.authenticated).toBe(true);
    });

    it('should list products from live store', async () => {
      const products = await liveClient.listProducts({ per_page: 5 });
      expect(Array.isArray(products.items)).toBe(true);
      expect(products.page).toBe(1);
    });
  }
);
