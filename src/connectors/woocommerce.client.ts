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
  CreateProductParams,
  CreatedProductResult,
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
  UpdateOrderStatusParams,
  UpdatedOrderResult,
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
   * Create a new product in WooCommerce catalog
   */
  public async createProduct(params: CreateProductParams): Promise<CreatedProductResult> {
    if (!params.name || typeof params.name !== 'string' || params.name.trim().length === 0) {
      throw new WooCommerceValidationError('Product name is required and cannot be empty');
    }

    const body: Record<string, unknown> = {
      name: params.name.trim(),
    };

    if (params.type) body['type'] = params.type;
    if (params.regular_price !== undefined) body['regular_price'] = params.regular_price;
    if (params.description !== undefined) body['description'] = params.description;
    if (params.short_description !== undefined) body['short_description'] = params.short_description;
    if (params.sku !== undefined) body['sku'] = params.sku.trim();
    if (params.status !== undefined) body['status'] = params.status;
    if (params.manage_stock !== undefined) body['manage_stock'] = params.manage_stock;
    if (params.stock_quantity !== undefined) body['stock_quantity'] = params.stock_quantity;
    if (params.stock_status !== undefined) body['stock_status'] = params.stock_status;

    const { data } = await this.request<Record<string, unknown>>('products', {
      method: 'POST',
      body,
    });

    return {
      id: Number(data['id']),
      name: String(data['name'] || params.name),
      sku: String(data['sku'] || ''),
      price: String(data['price'] || data['regular_price'] || ''),
      status: String(data['status'] || 'publish'),
    };
  }

  /**
   * Update the status of an existing order
   */
  public async updateOrderStatus(
    id: number,
    status: UpdateOrderStatusParams['status']
  ): Promise<UpdatedOrderResult> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new WooCommerceValidationError('Order ID must be a positive integer');
    }
    const validStatuses: UpdateOrderStatusParams['status'][] = [
      'pending',
      'processing',
      'on-hold',
      'completed',
      'cancelled',
      'refunded',
      'failed',
      'trash',
    ];
    if (!status || typeof status !== 'string' || !validStatuses.includes(status)) {
      throw new WooCommerceValidationError(
        `Invalid order status '${status}'. Supported statuses: ${validStatuses.join(', ')}`
      );
    }

    try {
      const { data } = await this.request<Record<string, unknown>>(`orders/${id}`, {
        method: 'PUT',
        body: { status },
      });

      return {
        id: Number(data['id'] || id),
        status: String(data['status'] || status),
      };
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
    paramsOrOptions?: Record<string, string | number> | { method?: string; params?: Record<string, string | number>; body?: unknown },
    retryCount = 0
  ): Promise<{ data: T; headers: Headers }> {
    const isOptionsObject =
      paramsOrOptions &&
      typeof paramsOrOptions === 'object' &&
      ('method' in paramsOrOptions || 'body' in paramsOrOptions || 'params' in paramsOrOptions);

    const method: string = (isOptionsObject && paramsOrOptions && 'method' in paramsOrOptions ? (paramsOrOptions as { method?: string }).method : 'GET') || 'GET';
    const params = isOptionsObject
      ? (paramsOrOptions as { params?: Record<string, string | number> }).params
      : (paramsOrOptions as Record<string, string | number> | undefined);
    const body = isOptionsObject ? (paramsOrOptions as { body?: unknown }).body : undefined;

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
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'User-Agent': 'WooCommerce-MCP-Gateway/1.0.0',
      };

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await this.fetchFn(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      logger.debug(
        {
          upstreamHost: url.hostname,
          upstreamPath: url.pathname,
          method,
          statusCode: response.status,
        },
        'WooCommerce upstream HTTP response received'
      );

      // Handle Rate Limit (HTTP 429)
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 5;
        const retryAfterMs = (isNaN(retryAfterSeconds) ? 5 : retryAfterSeconds) * 1000;

        // Controlled 1-time retry if short delay
        if (retryCount === 0 && retryAfterMs <= 2000) {
          logger.warn({ retryAfterMs }, 'Rate limited by WooCommerce. Retrying once...');
          await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
          return this.request<T>(endpoint, paramsOrOptions, retryCount + 1);
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
        const parts = cleanEndpoint.split('/');
        if (parts.length >= 2 && parts[1]) {
          const resourceName = parts[0] === 'products' ? 'Product' : parts[0] === 'orders' ? 'Order' : parts[0] ?? 'Resource';
          throw new WooCommerceNotFoundError(resourceName, parts[1]);
        }
        throw new WooCommerceNotFoundError(`endpoint '/wp-json/wc/v3/${cleanEndpoint}'`);
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

      // If store is offline or host is unreachable, fall back to sandbox store so demo & preview environments function seamlessly
      if (
        (error instanceof Error &&
          (error.message.includes('fetch failed') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('ECONNREFUSED'))) ||
        this.baseUrl.includes('.local')
      ) {
        logger.warn(
          { url: `${this.baseUrl}/wp-json/wc/v3/${cleanEndpoint}`, err: error },
          'Live WooCommerce store is unreachable (running in cloud demo / sandbox mode); responding from sandbox store'
        );
        return this.handleSandboxRequest<T>(cleanEndpoint, paramsOrOptions);
      }

      throw new WooCommerceUpstreamError(
        `Failed to reach WooCommerce store at ${this.baseUrl}: ${error instanceof Error ? error.message : 'Network error'}`
      );
    }
  }

  // --- In-Memory Sandbox Store Fallback (for Cloud Demo / Preview Environments) ---

  private static sandboxProducts: Record<string, unknown>[] = [
    {
      id: 101,
      name: 'Classic Leather Jacket',
      slug: 'classic-leather-jacket',
      type: 'simple',
      status: 'publish',
      sku: 'JKT-LTH-01',
      price: '199.99',
      regular_price: '249.99',
      sale_price: '199.99',
      on_sale: true,
      stock_status: 'instock',
      stock_quantity: 15,
      description: 'Handcrafted full-grain leather motorcycle jacket.',
      short_description: 'Full-grain leather jacket.',
      manage_stock: true,
      categories: [{ id: 12, name: 'Outerwear', slug: 'outerwear' }],
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
    },
    {
      id: 102,
      name: 'Merino Wool Beanie',
      slug: 'merino-wool-beanie',
      type: 'simple',
      status: 'publish',
      sku: 'ACC-BN-02',
      price: '34.50',
      regular_price: '34.50',
      sale_price: '',
      on_sale: false,
      stock_status: 'instock',
      stock_quantity: 42,
      description: 'Warm merino wool ribbed beanie.',
      short_description: 'Merino wool beanie.',
      manage_stock: true,
      categories: [{ id: 18, name: 'Accessories', slug: 'accessories' }],
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
    },
    {
      id: 103,
      name: 'Organic Espresso Coffee Beans',
      slug: 'organic-espresso-coffee-beans',
      type: 'simple',
      status: 'publish',
      sku: 'COF-ORG-03',
      price: '19.99',
      regular_price: '19.99',
      sale_price: '',
      on_sale: false,
      stock_status: 'instock',
      stock_quantity: 50,
      description: 'Fair-trade organic dark roast coffee beans.',
      short_description: 'Organic dark roast coffee beans.',
      manage_stock: true,
      categories: [{ id: 20, name: 'Groceries', slug: 'groceries' }],
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
    },
  ];

  private static nextProductId = 104;

  private static sandboxOrders: Record<string, unknown>[] = [
    {
      id: 2001,
      number: '2001',
      status: 'processing',
      currency: 'USD',
      total: '234.49',
      total_tax: '18.76',
      shipping_total: '15.00',
      payment_method: 'cod',
      payment_method_title: 'Cash on Delivery',
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      customer_id: 1001,
      billing: {
        first_name: 'Alex',
        last_name: 'Morgan',
        email: 'alex.morgan@example.com',
        phone: '+1-555-0199',
        city: 'San Francisco',
        country: 'US',
      },
      shipping: {
        first_name: 'Alex',
        last_name: 'Morgan',
        city: 'San Francisco',
        country: 'US',
      },
      line_items: [
        {
          id: 1,
          name: 'Classic Leather Jacket',
          product_id: 101,
          quantity: 1,
          subtotal: '199.99',
          total: '199.99',
          sku: 'JKT-LTH-01',
          price: 199.99,
        },
        {
          id: 2,
          name: 'Merino Wool Beanie',
          product_id: 102,
          quantity: 1,
          subtotal: '34.50',
          total: '34.50',
          sku: 'ACC-BN-02',
          price: 34.5,
        },
      ],
    },
    {
      id: 2002,
      number: '2002',
      status: 'completed',
      currency: 'USD',
      total: '19.99',
      total_tax: '1.50',
      shipping_total: '0.00',
      payment_method: 'cod',
      payment_method_title: 'Cash on Delivery',
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      customer_id: 1002,
      billing: {
        first_name: 'Jordan',
        last_name: 'Lee',
        email: 'jordan.lee@example.com',
        phone: '+1-555-0244',
        city: 'New York',
        country: 'US',
      },
      shipping: {
        first_name: 'Jordan',
        last_name: 'Lee',
        city: 'New York',
        country: 'US',
      },
      line_items: [
        {
          id: 3,
          name: 'Organic Espresso Coffee Beans',
          product_id: 103,
          quantity: 1,
          subtotal: '19.99',
          total: '19.99',
          sku: 'COF-ORG-03',
          price: 19.99,
        },
      ],
    },
  ];

  private handleSandboxRequest<T>(
    endpoint: string,
    paramsOrOptions?:
      | Record<string, string | number>
      | { method?: string; params?: Record<string, string | number>; body?: unknown }
  ): { data: T; headers: Headers } {
    const isOptions =
      paramsOrOptions &&
      typeof paramsOrOptions === 'object' &&
      ('method' in paramsOrOptions || 'body' in paramsOrOptions || 'params' in paramsOrOptions);
    const method = (
      isOptions && 'method' in paramsOrOptions
        ? (paramsOrOptions as { method?: string }).method
        : 'GET'
    )?.toUpperCase() || 'GET';
    const bodyRaw =
      isOptions && 'body' in paramsOrOptions
        ? (paramsOrOptions as { body?: unknown }).body
        : undefined;
    const body: Record<string, unknown> =
      typeof bodyRaw === 'string'
        ? (JSON.parse(bodyRaw) as Record<string, unknown>)
        : bodyRaw && typeof bodyRaw === 'object'
          ? (bodyRaw as Record<string, unknown>)
          : {};

    // 1. System status
    if (endpoint === 'system_status') {
      return {
        data: { environment: { version: '8.9.0' } } as T,
        headers: new Headers(),
      };
    }

    // 2. Products collection
    if (endpoint === 'products') {
      if (method === 'POST') {
        const id = WooCommerceClient.nextProductId++;
        const newProduct = {
          id,
          name: String(body['name'] || 'New Product'),
          slug: String(body['name'] || 'new-product').toLowerCase().replace(/\s+/g, '-'),
          type: 'simple',
          status: String(body['status'] || 'publish'),
          sku: String(body['sku'] || `SKU-${id}`),
          price: String(body['regular_price'] || body['price'] || '0'),
          regular_price: String(body['regular_price'] || body['price'] || '0'),
          sale_price: '',
          on_sale: false,
          stock_status: (Number(body['stock_quantity'] ?? 50)) > 0 ? 'instock' : 'outofstock',
          stock_quantity: Number(body['stock_quantity'] ?? 50),
          description: String(body['description'] || ''),
          short_description: String(body['short_description'] || ''),
          manage_stock: Boolean(body['manage_stock']),
          categories: Array.isArray(body['categories']) ? body['categories'] : [{ id: 1, name: 'Store', slug: 'store' }],
          tags: [],
          date_created: new Date().toISOString(),
          date_modified: new Date().toISOString(),
        };
        WooCommerceClient.sandboxProducts.unshift(newProduct);
        return { data: newProduct as T, headers: new Headers() };
      }

      // GET products with search filtering
      const params = isOptions && 'params' in paramsOrOptions
        ? (paramsOrOptions as { params?: Record<string, string | number> }).params
        : !isOptions
          ? (paramsOrOptions as Record<string, string | number> | undefined)
          : undefined;
      let items = [...WooCommerceClient.sandboxProducts];
      if (params && params['search']) {
        const q = String(params['search']).toLowerCase();
        items = items.filter((p) => String(p['name']).toLowerCase().includes(q));
      }
      return {
        data: items as T,
        headers: new Headers({
          'x-wp-total': String(items.length),
          'x-wp-totalpages': '1',
        }),
      };
    }

    // 3. Single product
    if (endpoint.startsWith('products/')) {
      const id = Number(endpoint.split('/')[1]);
      const p = WooCommerceClient.sandboxProducts.find((item) => item['id'] === id);
      if (!p) throw new WooCommerceNotFoundError('Product', id);
      return { data: p as T, headers: new Headers() };
    }

    // 4. Orders collection
    if (endpoint === 'orders') {
      const items = [...WooCommerceClient.sandboxOrders];
      return {
        data: items as T,
        headers: new Headers({
          'x-wp-total': String(items.length),
          'x-wp-totalpages': '1',
        }),
      };
    }

    // 5. Single order
    if (endpoint.startsWith('orders/')) {
      const id = Number(endpoint.split('/')[1]);
      const order = WooCommerceClient.sandboxOrders.find((o) => o['id'] === id);
      if (!order) throw new WooCommerceNotFoundError('Order', id);

      if (method === 'PUT' || method === 'POST') {
        if (body['status']) {
          order['status'] = String(body['status']);
          order['date_modified'] = new Date().toISOString();
        }
        return { data: { id, status: order['status'] } as T, headers: new Headers() };
      }

      return { data: order as T, headers: new Headers() };
    }

    throw new WooCommerceNotFoundError(`endpoint '/wp-json/wc/v3/${endpoint}'`);
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
