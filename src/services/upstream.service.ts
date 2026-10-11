import crypto from 'node:crypto';
import type { JsonStore } from '../storage/store.js';
import type { UpstreamServer, UpstreamTransport } from '../types/index.js';
import { logger } from '../logging/logger.js';

export interface RegisterUpstreamParams {
  name: string;
  prefix: string;
  url: string;
  transport?: UpstreamTransport;
  headers?: Record<string, string>;
  enabled?: boolean;
}

export class UpstreamService {
  constructor(private store: JsonStore) {}

  public seedDefaultUpstreams(baseUrl: string = 'http://127.0.0.1:3000', isTestEnv: boolean = false): void {
    const existing = this.store.getUpstreams();

    const defaults: UpstreamServer[] = [
      {
        id: 'ups_woocommerce',
        name: 'WooCommerce Storefront & Orders',
        prefix: 'wc',
        url: `${baseUrl}/upstream/woocommerce/mcp`,
        transport: 'streamable-http',
        enabled: true,
        status: 'healthy',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'ups_inventory',
        name: 'Warehouse & Inventory Management',
        prefix: 'inv',
        url: `${baseUrl}/upstream/inventory/mcp`,
        transport: 'streamable-http',
        enabled: !isTestEnv,
        status: !isTestEnv ? 'healthy' : 'disabled',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'ups_support',
        name: 'Customer Support & Returns',
        prefix: 'sup',
        url: `${baseUrl}/upstream/support/mcp`,
        transport: 'streamable-http',
        enabled: !isTestEnv,
        status: !isTestEnv ? 'healthy' : 'disabled',
        lastCheckedAt: new Date().toISOString(),
      },
    ];

    for (const def of defaults) {
      if (!existing.some((u) => u.id === def.id || u.prefix === def.prefix)) {
        this.store.addUpstream(def);
      }
    }
  }

  public listUpstreams(): UpstreamServer[] {
    return this.store.getUpstreams();
  }

  public getUpstream(id: string): UpstreamServer | undefined {
    return this.store.getUpstreamById(id);
  }

  public registerUpstream(params: RegisterUpstreamParams): UpstreamServer {
    const cleanPrefix = params.prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanPrefix) {
      throw new Error('Prefix must contain alphanumeric characters');
    }

    const existing = this.store.getUpstreams();
    if (existing.some((u) => u.prefix === cleanPrefix)) {
      throw new Error(`Upstream with prefix '${cleanPrefix}' already exists`);
    }

    const upstream: UpstreamServer = {
      id: `ups_${crypto.randomUUID().slice(0, 8)}`,
      name: params.name.trim(),
      prefix: cleanPrefix,
      url: params.url.trim(),
      transport: params.transport || 'streamable-http',
      headers: params.headers,
      enabled: params.enabled ?? true,
      status: params.enabled !== false ? 'healthy' : 'disabled',
      lastCheckedAt: new Date().toISOString(),
    };

    this.store.addUpstream(upstream);
    logger.info({ id: upstream.id, prefix: upstream.prefix, url: upstream.url }, 'Registered new upstream MCP server');
    return upstream;
  }

  public updateUpstream(id: string, updates: Partial<RegisterUpstreamParams>): UpstreamServer {
    const upstream = this.store.getUpstreamById(id);
    if (!upstream) {
      throw new Error(`Upstream server '${id}' not found`);
    }

    if (updates.prefix && updates.prefix !== upstream.prefix) {
      const clean = updates.prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
      const conflict = this.store.getUpstreams().find((u) => u.id !== id && u.prefix === clean);
      if (conflict) {
        throw new Error(`Prefix '${clean}' is already in use by '${conflict.name}'`);
      }
      updates.prefix = clean;
    }

    const updated = this.store.updateUpstream(id, updates);
    if (!updated) {
      throw new Error(`Failed to update upstream server '${id}'`);
    }
    return updated;
  }

  public setUpstreamEnabled(id: string, enabled: boolean): boolean {
    return this.store.setUpstreamEnabled(id, enabled);
  }

  public deleteUpstream(id: string): boolean {
    return this.store.deleteUpstream(id);
  }

  public async checkHealth(id: string): Promise<{ status: 'healthy' | 'unreachable'; latencyMs: number; error?: string }> {
    const upstream = this.store.getUpstreamById(id);
    if (!upstream) {
      throw new Error(`Upstream server '${id}' not found`);
    }

    const start = performance.now();
    try {
      const response = await fetch(upstream.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(upstream.headers || {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'ping',
        }),
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Math.round(performance.now() - start);
      const isOk = response.status < 500;
      const status = isOk ? 'healthy' : 'unreachable';

      this.store.updateUpstream(id, {
        status: upstream.enabled ? status : 'disabled',
        lastCheckedAt: new Date().toISOString(),
        latencyMs,
      });

      return { status, latencyMs };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      this.store.updateUpstream(id, {
        status: 'unreachable',
        lastCheckedAt: new Date().toISOString(),
        latencyMs,
        error: errorMsg,
      });
      return { status: 'unreachable', latencyMs, error: errorMsg };
    }
  }
}
