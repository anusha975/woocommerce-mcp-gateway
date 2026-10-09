import { describe, it, expect } from 'vitest';
import { sanitizeObject, createLogger } from '../../src/logging/logger.js';

describe('Logger & Secret Redaction', () => {
  it('should redact sensitive keys in nested object structures', () => {
    const rawData = {
      storeName: 'Test Boutique',
      consumer_secret: 'cs_super_secret_key_12345',
      nested: {
        consumer_key: 'ck_nested_key_9999',
        password: 'my-admin-password',
        publicField: 'safe-value',
      },
      list: [
        { token: 'secret-bearer-token', id: 1 },
        { name: 'shoes', price: '49.99' },
      ],
    };

    const sanitized = sanitizeObject(rawData);

    expect(sanitized.storeName).toBe('Test Boutique');
    expect(sanitized.consumer_secret).toBe('[REDACTED]');
    expect(sanitized.nested.consumer_key).toBe('[REDACTED]');
    expect(sanitized.nested.password).toBe('[REDACTED]');
    expect(sanitized.nested.publicField).toBe('safe-value');
    expect(sanitized.list[0]?.token).toBe('[REDACTED]');
    expect(sanitized.list[0]?.id).toBe(1);
    expect(sanitized.list[1]?.name).toBe('shoes');
  });

  it('should return primitive values unchanged', () => {
    expect(sanitizeObject('simple-string')).toBe('simple-string');
    expect(sanitizeObject(123)).toBe(123);
    expect(sanitizeObject(null)).toBe(null);
    expect(sanitizeObject(undefined)).toBe(undefined);
  });

  it('should create logger instance without error', () => {
    const customLogger = createLogger({ level: 'debug', pretty: false });
    expect(customLogger).toBeDefined();
    expect(typeof customLogger.info).toBe('function');
    expect(typeof customLogger.error).toBe('function');
  });
});
