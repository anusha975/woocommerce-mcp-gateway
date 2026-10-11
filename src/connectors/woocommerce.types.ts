export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface ProductListParams extends PaginationParams {
  search?: string;
  category?: string;
  status?: 'any' | 'draft' | 'pending' | 'private' | 'publish';
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  sku?: string;
  min_price?: string;
  max_price?: string;
  orderby?: 'date' | 'id' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';
  order?: 'asc' | 'desc';
}

export interface OrderListParams extends PaginationParams {
  search?: string;
  status?:
    | 'any'
    | 'pending'
    | 'processing'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'failed'
    | 'trash';
  customer?: number;
  after?: string;
  before?: string;
  orderby?: 'date' | 'id' | 'title' | 'slug';
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductCategorySummary {
  id: number;
  name: string;
  slug: string;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  sku: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  stockStatus: string;
  stockQuantity: number | null;
  categories: ProductCategorySummary[];
}

export interface ProductDetail extends ProductSummary {
  description: string;
  shortDescription: string;
  permalink: string;
  taxStatus: string;
  taxClass: string;
  manageStock: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
}

export interface OrderLineItem {
  id: number;
  name: string;
  productId: number;
  variationId: number;
  quantity: number;
  subtotal: string;
  total: string;
  sku: string;
  price: number;
}

export interface SafeCustomerSummary {
  customerId: number;
  country?: string;
  state?: string;
  city?: string;
}

export interface OrderSummary {
  id: number;
  number: string;
  status: string;
  currency: string;
  dateCreated: string;
  dateModified: string;
  total: string;
  totalTax: string;
  shippingTotal: string;
  paymentMethodTitle: string;
  totalLineItems: number;
}

export interface OrderDetail extends OrderSummary {
  customer: SafeCustomerSummary;
  lineItems: OrderLineItem[];
  shippingLines: Array<{
    methodTitle: string;
    total: string;
  }>;
  feeLines: Array<{
    name: string;
    total: string;
  }>;
  couponLines: Array<{
    code: string;
    discount: string;
  }>;
}

export interface StoreConfigCheckResult {
  status: 'ok' | 'error';
  storeUrl: string;
  apiVersion: string;
  latencyMs: number;
  authenticated: boolean;
  message?: string;
}

export interface CreateProductParams {
  name: string;
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  regular_price?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  status?: 'draft' | 'pending' | 'private' | 'publish';
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
}

export interface CreatedProductResult {
  id: number;
  name: string;
  sku: string;
  price: string;
  status: string;
}

export interface UpdateOrderStatusParams {
  id: number;
  status:
    | 'pending'
    | 'processing'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'failed'
    | 'trash';
}

export interface UpdatedOrderResult {
  id: number;
  status: string;
}
