import crypto from 'node:crypto';
import type { JsonStore } from '../storage/store.js';
import type { AuditLogRecord } from '../types/index.js';

export interface RecordToolCallParams {
  userId: string;
  username: string;
  upstreamId: string;
  upstreamName: string;
  toolName: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export class AuditService {
  constructor(private store: JsonStore) {}

  public recordToolCall(params: RecordToolCallParams): AuditLogRecord {
    const record: AuditLogRecord = {
      id: `aud_${crypto.randomUUID().slice(0, 10)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      username: params.username,
      upstreamId: params.upstreamId,
      upstreamName: params.upstreamName,
      toolName: params.toolName,
      durationMs: Math.max(0, Math.round(params.durationMs)),
      success: params.success,
      error: params.error ? this.sanitizeErrorMessage(params.error) : undefined,
    };

    this.store.addAuditLog(record);
    return record;
  }

  public getLogs(options?: {
    userId?: string;
    upstreamId?: string;
    toolName?: string;
    limit?: number;
  }): AuditLogRecord[] {
    let logs = this.store.getAuditLogs(options?.limit ?? 200);

    if (options?.userId) {
      logs = logs.filter((l) => l.userId === options.userId);
    }
    if (options?.upstreamId) {
      logs = logs.filter((l) => l.upstreamId === options.upstreamId);
    }
    if (options?.toolName) {
      logs = logs.filter((l) => l.toolName === options.toolName);
    }

    return logs;
  }

  private sanitizeErrorMessage(msg: string): string {
    return msg
      .replace(/consumer_secret=([^\s&]+)/gi, 'consumer_secret=[REDACTED]')
      .replace(/consumer_key=([^\s&]+)/gi, 'consumer_key=[REDACTED]')
      .replace(/Bearer\s+([A-Za-z0-9_.-]+)/gi, 'Bearer [REDACTED]')
      .replace(/password=([^\s&]+)/gi, 'password=[REDACTED]');
  }
}
