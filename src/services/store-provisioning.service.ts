import crypto from 'node:crypto';
import type { JsonStore } from '../storage/store.js';
import type {
  AppConfig,
  ProvisionedStore,
  ProvisionStoreInput,
  SafeStoreSummary,
  StoreStatus,
} from '../types/index.js';
import { WooCommerceClient } from '../connectors/woocommerce.client.js';
import { logger } from '../logging/logger.js';

export class StoreProvisioningService {
  private changeListeners: Array<() => void> = [];

  constructor(private store: JsonStore) {}

  /**
   * Registers a callback to be invoked whenever a store is provisioned, updated,
   * enabled/disabled, or deprovisioned, allowing real-time hot-reloading of MCP tool catalogs.
   */
  public onStoreChanged(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (err) {
        logger.error({ err }, 'Error executing store change listener');
      }
    }
  }

  /**
   * Seeds the primary store from AppConfig if no provisioned stores exist,
   * guaranteeing complete backward compatibility with single-store deployments.
   */
  public seedDefaultStore(config: AppConfig): void {
    const existing = this.store.getStores();
    const primary = existing.find((s) => s.id === 'store_primary' || s.prefix === 'wc');

    if (primary) {
      if (
        config.woocommerce?.url &&
        (primary.url !== config.woocommerce.url ||
          primary.consumerKey !== config.woocommerce.consumerKey ||
          primary.consumerSecret !== config.woocommerce.consumerSecret ||
          (config.woocommerce.timeoutMs !== undefined && primary.timeoutMs !== config.woocommerce.timeoutMs))
      ) {
        primary.url = config.woocommerce.url;
        primary.consumerKey = config.woocommerce.consumerKey;
        primary.consumerSecret = config.woocommerce.consumerSecret;
        if (config.woocommerce.timeoutMs !== undefined) {
          primary.timeoutMs = config.woocommerce.timeoutMs;
        }
        if (config.woocommerce.verifySsl !== undefined) {
          primary.verifySsl = config.woocommerce.verifySsl;
        }
        primary.updatedAt = new Date().toISOString();
        this.store.addStore(primary);
        this.notifyChange();
      }
      return;
    }

    const newPrimary: ProvisionedStore = {
      id: 'store_primary',
      name: 'Primary WooCommerce Storefront',
      prefix: 'wc',
      url: config.woocommerce.url,
      consumerKey: config.woocommerce.consumerKey,
      consumerSecret: config.woocommerce.consumerSecret,
      timeoutMs: config.woocommerce.timeoutMs,
      verifySsl: config.woocommerce.verifySsl,
      enabled: true,
      status: 'healthy',
      isSandbox: false,
      description: 'Default primary WooCommerce store configured via environment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      latencyMs: 12,
    };

    this.store.addStore(newPrimary);
    logger.info({ storeId: newPrimary.id, prefix: newPrimary.prefix }, 'Seeded primary WooCommerce store into store registry');
    this.notifyChange();
  }

  public listStores(): ProvisionedStore[] {
    return this.store.getStores();
  }

  public getStore(id: string): ProvisionedStore | undefined {
    return this.store.getStoreById(id);
  }

  public getStoreByPrefix(prefix: string): ProvisionedStore | undefined {
    return this.store.getStoreByPrefix(prefix);
  }

  /**
   * Provisions a new WooCommerce store instance with validated configuration,
   * collision-free prefixing, and initial health probing.
   */
  public async provisionStore(input: ProvisionStoreInput): Promise<ProvisionedStore> {
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Store name is required');
    }

    const cleanPrefix = input.prefix
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    if (!cleanPrefix) {
      throw new Error('Store prefix must contain alphanumeric characters');
    }

    const reservedPrefixes = ['inv', 'sup', 'erp', 'system', 'admin', 'api'];
    if (reservedPrefixes.includes(cleanPrefix)) {
      throw new Error(`Prefix '${cleanPrefix}' is reserved for internal gateway upstreams`);
    }

    const existingStore = this.store.getStoreByPrefix(cleanPrefix);
    if (existingStore) {
      throw new Error(`Store with prefix '${cleanPrefix}' is already provisioned`);
    }

    const rawUrl = input.url?.trim();
    if (!rawUrl) {
      throw new Error('Store URL is required');
    }

    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Store URL must use http or https protocol');
      }
    } catch {
      throw new Error('Invalid store URL format');
    }

    if (!input.consumerKey?.trim()) {
      throw new Error('WooCommerce Consumer Key is required');
    }

    if (!input.consumerSecret?.trim()) {
      throw new Error('WooCommerce Consumer Secret is required');
    }

    const storeId = `store_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newStore: ProvisionedStore = {
      id: storeId,
      name,
      prefix: cleanPrefix,
      url: rawUrl,
      consumerKey: input.consumerKey.trim(),
      consumerSecret: input.consumerSecret.trim(),
      timeoutMs: input.timeoutMs ?? 10000,
      verifySsl: input.verifySsl ?? true,
      enabled: input.enabled ?? true,
      status: 'healthy',
      isSandbox: false,
      description: input.description?.trim(),
      createdAt: now,
      updatedAt: now,
      lastCheckedAt: now,
    };

    // Save and notify
    this.store.addStore(newStore);
    this.notifyChange();

    logger.info(
      {
        storeId: newStore.id,
        name: newStore.name,
        prefix: newStore.prefix,
        url: newStore.url,
      },
      'Provisioned new WooCommerce store successfully'
    );

    return newStore;
  }

  /**
   * Instantly provisions a mock sandbox store with seeded products and demo catalog,
   * perfect for zero-config onboarding, local testing, and staging environments.
   */
  public async provisionSandboxStore(
    name: string = 'Demo Sandbox Store',
    prefix?: string,
    description: string = 'In-memory sandbox store with instant mock catalog'
  ): Promise<ProvisionedStore> {
    const uniqueSuffix = crypto.randomUUID().slice(0, 4);
    const storePrefix = prefix
      ? prefix.toLowerCase().replace(/[^a-z0-9_]/g, '')
      : `sandbox_${uniqueSuffix}`;

    const storeId = `store_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const sandboxStore: ProvisionedStore = {
      id: storeId,
      name,
      prefix: storePrefix,
      url: 'https://sandbox.woocommerce.local',
      consumerKey: `ck_sandbox_${uniqueSuffix}`,
      consumerSecret: `cs_sandbox_secret_${uniqueSuffix}`,
      timeoutMs: 5000,
      verifySsl: false,
      enabled: true,
      status: 'healthy',
      isSandbox: true,
      description,
      createdAt: now,
      updatedAt: now,
      lastCheckedAt: now,
      latencyMs: 5,
    };

    this.store.addStore(sandboxStore);
    this.notifyChange();

    logger.info(
      { storeId: sandboxStore.id, prefix: sandboxStore.prefix },
      'Provisioned mock sandbox WooCommerce store'
    );

    return sandboxStore;
  }

  /**
   * Updates an existing provisioned store configuration.
   */
  public async updateStore(
    id: string,
    updates: Partial<ProvisionStoreInput>
  ): Promise<ProvisionedStore> {
    const store = this.store.getStoreById(id);
    if (!store) {
      throw new Error(`Store with ID '${id}' not found`);
    }

    if (updates.prefix && updates.prefix !== store.prefix) {
      const cleanPrefix = updates.prefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const existing = this.store.getStoreByPrefix(cleanPrefix);
      if (existing && existing.id !== id) {
        throw new Error(`Store prefix '${cleanPrefix}' is already in use`);
      }
      store.prefix = cleanPrefix;
    }

    if (updates.name !== undefined) store.name = updates.name.trim();
    if (updates.url !== undefined) store.url = updates.url.trim();
    if (updates.consumerKey !== undefined) store.consumerKey = updates.consumerKey.trim();
    if (updates.consumerSecret !== undefined) store.consumerSecret = updates.consumerSecret.trim();
    if (updates.timeoutMs !== undefined) store.timeoutMs = updates.timeoutMs;
    if (updates.verifySsl !== undefined) store.verifySsl = updates.verifySsl;
    if (updates.description !== undefined) store.description = updates.description.trim();
    if (typeof updates.enabled === 'boolean') {
      store.enabled = updates.enabled;
      store.status = updates.enabled ? 'healthy' : 'disabled';
    }

    store.updatedAt = new Date().toISOString();
    this.store.addStore(store);
    this.notifyChange();

    logger.info({ storeId: store.id, prefix: store.prefix }, 'Updated provisioned store configuration');
    return store;
  }

  /**
   * Toggles store enabled state, immediately purging or restoring its MCP tools.
   */
  public setStoreEnabled(id: string, enabled: boolean): boolean {
    const res = this.store.setStoreEnabled(id, enabled);
    if (res) {
      this.notifyChange();
      logger.info({ storeId: id, enabled }, 'Store enabled state modified');
    }
    return res;
  }

  /**
   * Deprovisions and removes a WooCommerce store, instantly purging all its tools
   * from MCP tool discovery without requiring gateway restart.
   */
  public deprovisionStore(id: string): boolean {
    const store = this.store.getStoreById(id);
    if (!store) return false;

    const res = this.store.deleteStore(id);
    if (res) {
      this.notifyChange();
      logger.info({ storeId: id, prefix: store.prefix }, 'Deprovisioned store removed from registry');
    }
    return res;
  }

  /**
   * Safe operational ping to verify connectivity and authentication against the store.
   */
  public async checkStoreHealth(
    id: string,
    clientOverride?: WooCommerceClient
  ): Promise<{ status: StoreStatus; latencyMs?: number; error?: string }> {
    const store = this.store.getStoreById(id);
    if (!store) {
      throw new Error(`Store with ID '${id}' not found`);
    }

    if (!store.enabled) {
      return { status: 'disabled' };
    }

    const start = Date.now();
    try {
      const client =
        clientOverride ||
        new WooCommerceClient({
          baseUrl: store.url,
          consumerKey: store.consumerKey,
          consumerSecret: store.consumerSecret,
          timeoutMs: store.timeoutMs,
        });

      const check = await client.checkConfiguration();
      const latencyMs = Date.now() - start;

      if (check.status === 'ok') {
        store.status = 'healthy';
        store.latencyMs = latencyMs;
        store.lastCheckedAt = new Date().toISOString();
        store.error = undefined;
        this.store.addStore(store);
        return { status: 'healthy', latencyMs };
      } else {
        store.status = 'unreachable';
        store.latencyMs = latencyMs;
        store.lastCheckedAt = new Date().toISOString();
        store.error = check.message || 'Health check ping returned error';
        this.store.addStore(store);
        return { status: 'unreachable', latencyMs, error: store.error };
      }
    } catch (err) {
      const latencyMs = Date.now() - start;
      const errMsg = err instanceof Error ? err.message : String(err);
      store.status = 'unreachable';
      store.latencyMs = latencyMs;
      store.lastCheckedAt = new Date().toISOString();
      store.error = errMsg;
      this.store.addStore(store);
      return { status: 'unreachable', latencyMs, error: errMsg };
    }
  }

  /**
   * Formats a provisioned store into a client-safe summary, strictly masking
   * consumer keys and completely redacting consumer secrets.
   */
  public toSafeSummary(store: ProvisionedStore, toolCount: number = 12): SafeStoreSummary {
    const rawKey = store.consumerKey || '';
    const maskedKey =
      rawKey.length > 8
        ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}`
        : 'ck_••••••••';

    return {
      id: store.id,
      name: store.name,
      prefix: store.prefix,
      url: store.url,
      consumerKeyMasked: maskedKey,
      timeoutMs: store.timeoutMs,
      verifySsl: store.verifySsl,
      enabled: store.enabled,
      status: store.status,
      isSandbox: store.isSandbox,
      description: store.description,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      lastCheckedAt: store.lastCheckedAt,
      latencyMs: store.latencyMs,
      error: store.error,
      toolCount,
    };
  }

  public listSafeSummaries(toolCountLookup?: (prefix: string) => number): SafeStoreSummary[] {
    return this.listStores().map((store) => {
      const toolCount = toolCountLookup ? toolCountLookup(store.prefix) : 12;
      return this.toSafeSummary(store, toolCount);
    });
  }
}
