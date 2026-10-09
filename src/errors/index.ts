export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isOperational?: boolean;
      details?: unknown;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? 'INTERNAL_SERVER_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: 'CONFIGURATION_ERROR',
      statusCode: 500,
      details,
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  }
}

export class UpstreamServiceError extends AppError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super(message, {
      code: 'UPSTREAM_SERVICE_ERROR',
      statusCode: 502,
      details,
      cause,
    });
  }
}
