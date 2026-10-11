import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { User, ApiKeyRecord, UpstreamServer, AuditLogRecord } from '../types/index.js';
import { logger } from '../logging/logger.js';

export interface StorageData {
  users: User[];
  apiKeys: ApiKeyRecord[];
  upstreams: UpstreamServer[];
  auditLogs: AuditLogRecord[];
}

export class JsonStore {
  private filePath: string;
  private data: StorageData;
  private isPersisting = false;
  private isReadOnly = false;

  constructor(dataDir: string = './data', filename: string = 'gateway-data.json') {
    let resolvedDir = dataDir;
    try {
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }
    } catch (err) {
      logger.warn({ err, targetDir: resolvedDir }, 'Failed to create configured dataDir; attempting fallback to temporary directory');
      try {
        const fallbackDir = path.join(os.tmpdir(), 'wc-mcp-data');
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        resolvedDir = fallbackDir;
      } catch (fallbackErr) {
        logger.error({ fallbackErr }, 'Failed to create fallback directory; operating in memory-only mode');
        this.isReadOnly = true;
      }
    }

    this.filePath = path.join(resolvedDir, filename);
    this.data = this.load();
  }

  private load(): StorageData {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : [],
          upstreams: Array.isArray(parsed.upstreams) ? parsed.upstreams : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        };
      } catch (err) {
        logger.warn({ err, file: this.filePath }, 'Failed to parse storage file; initializing empty storage state');
      }
    }
    return {
      users: [],
      apiKeys: [],
      upstreams: [],
      auditLogs: [],
    };
  }

  public save(): void {
    if (this.isPersisting || this.isReadOnly) return;
    this.isPersisting = true;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      logger.error({ err, file: this.filePath }, 'Failed to write storage file');
    } finally {
      this.isPersisting = false;
    }
  }

  // --- Users ---
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public addUser(user: User): void {
    const existingIdx = this.data.users.findIndex((u) => u.id === user.id || u.username === user.username);
    if (existingIdx >= 0) {
      this.data.users[existingIdx] = user;
    } else {
      this.data.users.push(user);
    }
    this.save();
  }

  // --- API Keys ---
  public getApiKeys(): ApiKeyRecord[] {
    return [...this.data.apiKeys];
  }

  public getApiKeyById(id: string): ApiKeyRecord | undefined {
    return this.data.apiKeys.find((k) => k.id === id);
  }

  public getApiKeyByHash(keyHash: string): ApiKeyRecord | undefined {
    return this.data.apiKeys.find((k) => k.keyHash === keyHash);
  }

  public addApiKey(apiKey: ApiKeyRecord): void {
    this.data.apiKeys.push(apiKey);
    this.save();
  }

  public revokeApiKey(id: string): boolean {
    const key = this.data.apiKeys.find((k) => k.id === id);
    if (!key) return false;
    key.revoked = true;
    key.revokedAt = new Date().toISOString();
    this.save();
    return true;
  }

  // --- Upstreams ---
  public getUpstreams(): UpstreamServer[] {
    return [...this.data.upstreams];
  }

  public getUpstreamById(id: string): UpstreamServer | undefined {
    return this.data.upstreams.find((u) => u.id === id);
  }

  public getUpstreamByPrefix(prefix: string): UpstreamServer | undefined {
    return this.data.upstreams.find((u) => u.prefix === prefix);
  }

  public addUpstream(upstream: UpstreamServer): void {
    const idx = this.data.upstreams.findIndex((u) => u.id === upstream.id);
    if (idx >= 0) {
      this.data.upstreams[idx] = upstream;
    } else {
      this.data.upstreams.push(upstream);
    }
    this.save();
  }

  public updateUpstream(id: string, updates: Partial<UpstreamServer>): UpstreamServer | undefined {
    const upstream = this.data.upstreams.find((u) => u.id === id);
    if (!upstream) return undefined;
    Object.assign(upstream, updates);
    this.save();
    return upstream;
  }

  public setUpstreamEnabled(id: string, enabled: boolean): boolean {
    const upstream = this.data.upstreams.find((u) => u.id === id);
    if (!upstream) return false;
    upstream.enabled = enabled;
    upstream.status = enabled ? 'healthy' : 'disabled';
    this.save();
    return true;
  }

  public deleteUpstream(id: string): boolean {
    const initialLen = this.data.upstreams.length;
    this.data.upstreams = this.data.upstreams.filter((u) => u.id !== id);
    const deleted = this.data.upstreams.length < initialLen;
    if (deleted) this.save();
    return deleted;
  }

  // --- Audit Logs ---
  public addAuditLog(log: AuditLogRecord): void {
    this.data.auditLogs.unshift(log); // newest first
    // keep maximum 10,000 logs in memory/disk
    if (this.data.auditLogs.length > 10000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 10000);
    }
    this.save();
  }

  public getAuditLogs(limit = 100): AuditLogRecord[] {
    return this.data.auditLogs.slice(0, limit);
  }

  public clearAll(): void {
    this.data = { users: [], apiKeys: [], upstreams: [], auditLogs: [] };
    this.save();
  }
}
