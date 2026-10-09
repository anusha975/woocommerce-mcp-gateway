export type NodeEnv = 'development' | 'production' | 'test';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface SecurityConfig {
  gatewayApiKey?: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  corsAllowedOrigins: string[];
  maxBodySizeBytes: number;
}

export interface AppConfig {
  env: NodeEnv;
  port: number;
  host: string;
  logLevel: LogLevel;
  gatewayApiKey?: string;
  security: SecurityConfig;
  woocommerce: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    timeoutMs: number;
    verifySsl: boolean;
  };
}
