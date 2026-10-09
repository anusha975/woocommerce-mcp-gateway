import { AppError } from '../errors/index.js';

export class WooCommerceError extends AppError {
  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      details?: unknown;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: options.code ?? 'WOOCOMMERCE_ERROR',
      statusCode: options.statusCode ?? 502,
      details: options.details,
      cause: options.cause,
    });
  }
}

export class WooCommerceAuthError extends WooCommerceError {
  constructor(message: string = 'WooCommerce authentication failed. Verify Consumer Key & Secret.', details?: unknown) {
    super(message, {
      code: 'WOOCOMMERCE_AUTH_ERROR',
      statusCode: 401,
      details,
    });
  }
}

export class WooCommerceNotFoundError extends WooCommerceError {
  constructor(resource: string, id: string | number) {
    super(`WooCommerce ${resource} with ID '${id}' was not found.`, {
      code: 'WOOCOMMERCE_NOT_FOUND',
      statusCode: 404,
    });
  }
}

export class WooCommerceRateLimitError extends WooCommerceError {
  public readonly retryAfterMs: number;

  constructor(message: string = 'WooCommerce API rate limit exceeded.', retryAfterMs: number = 5000) {
    super(message, {
      code: 'WOOCOMMERCE_RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      details: { retryAfterMs },
    });
    this.retryAfterMs = retryAfterMs;
  }
}

export class WooCommerceValidationError extends WooCommerceError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: 'WOOCOMMERCE_VALIDATION_ERROR',
      statusCode: 400,
      details,
    });
  }
}

export class WooCommerceTimeoutError extends WooCommerceError {
  constructor(timeoutMs: number) {
    super(`WooCommerce API request timed out after ${timeoutMs}ms.`, {
      code: 'WOOCOMMERCE_TIMEOUT',
      statusCode: 504,
      details: { timeoutMs },
    });
  }
}

export class WooCommerceUpstreamError extends WooCommerceError {
  constructor(message: string = 'WooCommerce upstream service error.', statusCode: number = 502, details?: unknown) {
    super(message, {
      code: 'WOOCOMMERCE_UPSTREAM_ERROR',
      statusCode,
      details,
    });
  }
}
