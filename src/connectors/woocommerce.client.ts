import { logger } from '../logging/logger.js';
import type { AppConfig } from '../types/index.js';
import {
  WooCommerceAuthError,
  WooCommerceError,
  WooCommerceNotFoundError,
  WooCommerceRateLimitError,
  WooCommerceTimeoutError,
  WooCommerceUpstreamError,
  WooCommerceValidationError,
} from './woocommerce.errors.js';
import type {
  OrderDetail,
  OrderLineItem,
  OrderListParams,
  OrderSummary,
  PaginatedResponse,
  ProductDetail,
  ProductListParams,
  ProductSummary,
  SafeCustomerSummary,
  StoreConfigCheckResult,
} from './woocommerce.types.js';

export interface WooCommerceClientOptions {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class WooCommerceClient {
  private readonly baseUrl: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly authHeader: string;

  constructor(options: WooCommerceClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.consumerKey = options.consumerKey;
    this.consumerSecret = options.consumerSecret;
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;

    // Construct standard HTTP Basic Auth header
    const token = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    this.authHeader = `Basic ${token}`;
  }

  public static fromConfig(config: AppConfig, fetchFn?: typeof fetch): WooCommerceClient {
    return new WooCommerceClient({
      baseUrl: config.woocommerce.url,
      consumerKey: config.woocommerce.consumerKey,
      consumerSecret: config.woocommerce.consumerSecret,
      timeoutMs: config.woocommerce.timeoutMs,
      fetchFn,
    });
  }

  /**
   * Safe operational ping to verify connectivity and authentication
   */
  public async checkConfiguration(): Promise<StoreConfigCheckResult> {
    const start = Date.now();
    try {
      await this.request('system_status', { per_page: 1 });
      return {
        status: 'ok',
        storeUrl: this.baseUrl,
        apiVersion: 'v3',
        latencyMs: Date.now() - start,
        authenticated: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown connection failure';
      return {
        status: 'error',
        storeUrl: this.baseUrl,
        apiVersion: 'v3',
        latencyMs: Date.now() - start,
        authenticated: false,
        message,
      };
    }
  }

  /**
   * List products with pagination and filters
   */
  public async listProducts(
    params: ProductListParams = {}
  ): Promise<PaginatedResponse<ProductSummary>> {
    const page = Math.max(1, params.page ?? 1);
    const perPage = Math.min(100, Math.max(1, params.per_page ?? 10));

    const queryParams: Record<string, string | number> = {
      page,
      per_page: perPage,
    };

    if (params.search) queryParams['search'] = params.search;
    if (params.category) queryParams['category'] = params.category;
    if (params.status && params.status !== 'any') queryParams['status'] = params.status;
    if (params.stock_status) queryParams['stock_status'] = params.stock_status;
    if (params.sku) queryParams['sku'] = params.sku;
    if (params.min_price) queryParams['min_price'] = params.min_price;
    if (params.max_price) queryParams['max_price'] = params.max_price;
    if (params.orderby) queryParams['orderby'] = params.orderby;
    if (params.order) queryParams['order'] = params.order;

    const { data, headers } = await this.request<unknown[]>('products', queryParams);

    const totalItems = parseInt(headers.get('x-wp-total') || `${data.length}`, 10);
    const totalPages = parseInt(headers.get('x-wp-totalpages') || '1', 10);

    const items = data.map((item) => this.normalizeProductSummary(item as Record<string, unknown>));

    return {
      items,
      page,
      perPage,
      totalItems,
      totalPages,
    };
  }

  /**
   * Retrieve a single product by ID
   */
  public async getProduct(id: number): Promise<ProductDetail> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new WooCommerceValidationError('Product ID must be a positive integer');
    }

    try {
      const { data } = await this.request<Record<string, unknown>>(`products/${id}`);
      return this.normalizeProductDetail(data);
    } catch (err) {
      if (err instanceof WooCommerceNotFoundError || (err instanceof WooCommerceError && err.statusCode === 404)) {
        throw new WooCommerceNotFoundError('Product', id);
      }
      throw err;
    }
  }

  /**
   * List orders with pagination and status filters
   */
  public async listOrders(
    params: OrderListParams = {}
  ): Promise<PaginatedResponse<OrderSummary>> {
    const page = Math.max(1, params.page ?? 1);
    const perPage = Math.min(100, Math.max(1, params.per_page ?? 10));

    const queryParams: Record<string, string | number> = {
      page,
      per_page: perPage,
    };

    if (params.search) queryParams['search'] = params.search;
    if (params.status && params.status !== 'any') queryParams['status'] = params.status;
    if (params.customer) queryParams['customer'] = params.customer;
    if (params.after) queryParams['after'] = params.after;
    if (params.before) queryParams['before'] = params.before;
    if (params.orderby) queryParams['orderby'] = params.orderby;
    if (params.order) queryParams['order'] = params.order;

    const { data, headers } = await this.request<unknown[]>('orders', queryParams);

    const totalItems = parseInt(headers.get('x-wp-total') || `${data.length}`, 10);
    const totalPages = parseInt(headers.get('x-wp-totalpages') || '1', 10);

    const items = data.map((item) => this.normalizeOrderSummary(item as Record<string, unknown>));

    return {
      items,
      page,
      perPage,
      totalItems,
      totalPages,
    };
  }

  /**
   * Retrieve a single order by ID
   */
  public async getOrder(id: number): Promise<OrderDetail> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new WooCommerceValidationError('Order ID must be a positive integer');
    }

    try {
      const { data } = await this.request<Record<string, unknown>>(`orders/${id}`);
      return this.normalizeOrderDetail(data);
    } catch (err) {
      if (err instanceof WooCommerceNotFoundError || (err instanceof WooCommerceError && err.statusCode === 404)) {
        throw new WooCommerceNotFoundError('Order', id);
      }
      throw err;
    }
  }

  /**
   * Internal HTTP execution with timeout, safe parsing, and error mapping
   */
  private async request<T>(
    endpoint: string,
    params?: Record<string, string | number>,
    retryCount = 0
  ): Promise<{ data: T; headers: Headers }> {
    // Sanitized endpoint path validation
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    const url = new URL(`${this.baseUrl}/wp-json/wc/v3/${cleanEndpoint}`);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
          'User-Agent': 'WooCommerce-MCP-Gateway/1.0.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Rate Limit (HTTP 429)
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 5;
        const retryAfterMs = (isNaN(retryAfterSeconds) ? 5 : retryAfterSeconds) * 1000;

        // Controlled 1-time retry if short delay
        if (retryCount === 0 && retryAfterMs <= 2000) {
          logger.warn({ retryAfterMs }, 'Rate limited by WooCommerce. Retrying once...');
          await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
          return this.request<T>(endpoint, params, retryCount + 1);
        }

        throw new WooCommerceRateLimitError(
          'WooCommerce API rate limit exceeded. Please slow down requests.',
          retryAfterMs
        );
      }

      // Handle Authentication & Authorization (HTTP 401 / 403)
      if (response.status === 401 || response.status === 403) {
        throw new WooCommerceAuthError(
          `WooCommerce authentication failed (HTTP ${response.status}). Check Consumer Key and Secret permissions.`
        );
      }

      // Handle Not Found (HTTP 404)
      if (response.status === 404) {
        throw new WooCommerceNotFoundError('Resource', endpoint);
      }

      // Handle Bad Request (HTTP 400)
      if (response.status === 400) {
        let errMessage = 'Invalid request parameters sent to WooCommerce';
        try {
          const body = (await response.json()) as { message?: string };
          if (body.message) errMessage = body.message;
        } catch {
          // ignore parsing error
        }
        throw new WooCommerceValidationError(errMessage);
      }

      // Handle Upstream Server Errors (5xx)
      if (response.status >= 500) {
        throw new WooCommerceUpstreamError(
          `WooCommerce store returned server error (HTTP ${response.status})`,
          response.status
        );
      }

      if (!response.ok) {
        throw new WooCommerceError(
          `WooCommerce API error (HTTP ${response.status})`,
          { statusCode: response.status }
        );
      }

      // Safe JSON parsing
      const text = await response.text();
      let parsed: T;
      try {
        parsed = JSON.parse(text) as T;
      } catch (err) {
        throw new WooCommerceError('Malformed JSON received from WooCommerce upstream', {
          statusCode: 502,
          cause: err instanceof Error ? err : undefined,
        });
      }

      return { data: parsed, headers: response.headers };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof WooCommerceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new WooCommerceTimeoutError(this.timeoutMs);
      }

      throw new WooCommerceUpstreamError(
        `Failed to reach WooCommerce store at ${this.baseUrl}: ${error instanceof Error ? error.message : 'Network error'}`
      );
    }
  }

  // --- Normalizers ---

  private normalizeProductSummary(raw: Record<string, unknown>): ProductSummary {
    const rawCategories = Array.isArray(raw['categories']) ? raw['categories'] : [];
    const categories = rawCategories.map((cat: Record<string, unknown>) => ({
      id: Number(cat['id'] ?? 0),
      name: String(cat['name'] ?? ''),
      slug: String(cat['slug'] ?? ''),
    }));

    return {
      id: Number(raw['id'] ?? 0),
      name: String(raw['name'] ?? ''),
      slug: String(raw['slug'] ?? ''),
      type: String(raw['type'] ?? 'simple'),
      status: String(raw['status'] ?? 'publish'),
      sku: String(raw['sku'] ?? ''),
      price: String(raw['price'] ?? ''),
      regularPrice: String(raw['regular_price'] ?? ''),
      salePrice: String(raw['sale_price'] ?? ''),
      onSale: Boolean(raw['on_sale'] ?? false),
      stockStatus: String(raw['stock_status'] ?? 'instock'),
      stockQuantity: raw['stock_quantity'] !== null && raw['stock_quantity'] !== undefined
        ? Number(raw['stock_quantity'])
        : null,
      categories,
    };
  }

  private normalizeProductDetail(raw: Record<string, unknown>): ProductDetail {
    const summary = this.normalizeProductSummary(raw);

    const rawDimensions = (raw['dimensions'] as Record<string, unknown>) || {};
    const rawAttributes = Array.isArray(raw['attributes']) ? raw['attributes'] : [];
    const rawTags = Array.isArray(raw['tags']) ? raw['tags'] : [];
    const rawImages = Array.isArray(raw['images']) ? raw['images'] : [];

    return {
      ...summary,
      description: String(raw['description'] ?? ''),
      shortDescription: String(raw['short_description'] ?? ''),
      permalink: String(raw['permalink'] ?? ''),
      taxStatus: String(raw['tax_status'] ?? 'taxable'),
      taxClass: String(raw['tax_class'] ?? ''),
      manageStock: Boolean(raw['manage_stock'] ?? false),
      weight: String(raw['weight'] ?? ''),
      dimensions: {
        length: String(rawDimensions['length'] ?? ''),
        width: String(rawDimensions['width'] ?? ''),
        height: String(rawDimensions['height'] ?? ''),
      },
      attributes: rawAttributes.map((attr: Record<string, unknown>) => ({
        id: Number(attr['id'] ?? 0),
        name: String(attr['name'] ?? ''),
        options: Array.isArray(attr['options']) ? attr['options'].map(String) : [],
      })),
      tags: rawTags.map((tag: Record<string, unknown>) => ({
        id: Number(tag['id'] ?? 0),
        name: String(tag['name'] ?? ''),
        slug: String(tag['slug'] ?? ''),
      })),
      images: rawImages.map((img: Record<string, unknown>) => ({
        id: Number(img['id'] ?? 0),
        src: String(img['src'] ?? ''),
        alt: String(img['alt'] ?? ''),
      })),
    };
  }

  private normalizeOrderSummary(raw: Record<string, unknown>): OrderSummary {
    const lineItems = Array.isArray(raw['line_items']) ? raw['line_items'] : [];

    return {
      id: Number(raw['id'] ?? 0),
      number: String(raw['number'] ?? raw['id'] ?? ''),
      status: String(raw['status'] ?? 'pending'),
      currency: String(raw['currency'] ?? 'USD'),
      dateCreated: String(raw['date_created'] ?? ''),
      dateModified: String(raw['date_modified'] ?? ''),
      total: String(raw['total'] ?? '0.00'),
      totalTax: String(raw['total_tax'] ?? '0.00'),
      shippingTotal: String(raw['shipping_total'] ?? '0.00'),
      paymentMethodTitle: String(raw['payment_method_title'] ?? ''),
      totalLineItems: lineItems.length,
    };
  }

  private normalizeOrderDetail(raw: Record<string, unknown>): OrderDetail {
    const summary = this.normalizeOrderSummary(raw);
    const rawLineItems = Array.isArray(raw['line_items']) ? raw['line_items'] : [];
    const rawBilling = (raw['billing'] as Record<string, unknown>) || {};
    const rawShippingLines = Array.isArray(raw['shipping_lines']) ? raw['shipping_lines'] : [];
    const rawFeeLines = Array.isArray(raw['fee_lines']) ? raw['fee_lines'] : [];
    const rawCouponLines = Array.isArray(raw['coupon_lines']) ? raw['coupon_lines'] : [];

    const lineItems: OrderLineItem[] = rawLineItems.map((item: Record<string, unknown>) => ({
      id: Number(item['id'] ?? 0),
      name: String(item['name'] ?? ''),
      productId: Number(item['product_id'] ?? 0),
      variationId: Number(item['variation_id'] ?? 0),
      quantity: Number(item['quantity'] ?? 1),
      subtotal: String(item['subtotal'] ?? '0.00'),
      total: String(item['total'] ?? '0.00'),
      sku: String(item['sku'] ?? ''),
      price: Number(item['price'] ?? 0),
    }));

    // Safe customer representation (redacting raw phone, email, street address)
    const customer: SafeCustomerSummary = {
      customerId: Number(raw['customer_id'] ?? 0),
      country: rawBilling['country'] ? String(rawBilling['country']) : undefined,
      state: rawBilling['state'] ? String(rawBilling['state']) : undefined,
      city: rawBilling['city'] ? String(rawBilling['city']) : undefined,
    };

    return {
      ...summary,
      customer,
      lineItems,
      shippingLines: rawShippingLines.map((line: Record<string, unknown>) => ({
        methodTitle: String(line['method_title'] ?? ''),
        total: String(line['total'] ?? '0.00'),
      })),
      feeLines: rawFeeLines.map((fee: Record<string, unknown>) => ({
        name: String(fee['name'] ?? ''),
        total: String(fee['total'] ?? '0.00'),
      })),
      couponLines: rawCouponLines.map((coupon: Record<string, unknown>) => ({
        code: String(coupon['code'] ?? ''),
        discount: String(coupon['discount'] ?? '0.00'),
      })),
    };
  }
}
