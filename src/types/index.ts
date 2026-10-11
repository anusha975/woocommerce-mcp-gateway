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
  dataDir?: string;
  security: SecurityConfig;
  woocommerce: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    timeoutMs: number;
    verifySsl: boolean;
  };
}

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  revoked: boolean;
  createdAt: string;
  revokedAt?: string;
}

export type UpstreamTransport = 'streamable-http' | 'sse';
export type UpstreamStatus = 'healthy' | 'unreachable' | 'disabled' | 'unknown';

export interface UpstreamServer {
  id: string;
  name: string;
  prefix: string;
  url: string;
  transport: UpstreamTransport;
  headers?: Record<string, string>;
  enabled: boolean;
  status: UpstreamStatus;
  lastCheckedAt?: string;
  latencyMs?: number;
  error?: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  upstreamId: string;
  upstreamName: string;
  toolName: string;
  durationMs: number;
  success: boolean;
  error?: string;
}
