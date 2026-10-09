import { describe, it, expect } from 'vitest';
import { validateEnvironment } from '../../src/config/env.js';
import { ConfigurationError } from '../../src/errors/index.js';

describe('Configuration Validation (Zod)', () => {
  const validEnv = {
    NODE_ENV: 'test',
    PORT: '4000',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'debug',
    GATEWAY_API_KEY: 'secret-gateway-token',
    WOOCOMMERCE_URL: 'https://store.example.com/',
    WOOCOMMERCE_CONSUMER_KEY: 'ck_test_12345',
    WOOCOMMERCE_CONSUMER_SECRET: 'cs_test_67890',
    WOOCOMMERCE_TIMEOUT_MS: '8000',
    WOOCOMMERCE_VERIFY_SSL: 'false',
  };

  it('should successfully parse valid environment variables', () => {
    const config = validateEnvironment(validEnv);

    expect(config.env).toBe('test');
    expect(config.port).toBe(4000);
    expect(config.host).toBe('127.0.0.1');
    expect(config.logLevel).toBe('debug');
    expect(config.gatewayApiKey).toBe('secret-gateway-token');
    // Trailing slash should be stripped
    expect(config.woocommerce.url).toBe('https://store.example.com');
    expect(config.woocommerce.consumerKey).toBe('ck_test_12345');
    expect(config.woocommerce.consumerSecret).toBe('cs_test_67890');
    expect(config.woocommerce.timeoutMs).toBe(8000);
    expect(config.woocommerce.verifySsl).toBe(false);
  });

  it('should apply sensible defaults for optional fields', () => {
    const minimalEnv = {
      WOOCOMMERCE_URL: 'https://minimal-store.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_min_key',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_min_secret',
    };

    const config = validateEnvironment(minimalEnv);

    expect(config.env).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.logLevel).toBe('info');
    expect(config.gatewayApiKey).toBeUndefined();
    expect(config.woocommerce.timeoutMs).toBe(10000);
    expect(config.woocommerce.verifySsl).toBe(true);
  });

  it('should throw ConfigurationError when required WooCommerce keys are missing', () => {
    const invalidEnv = {
      WOOCOMMERCE_URL: 'https://store.example.com',
      // Missing consumer key & secret
    };

    expect(() => validateEnvironment(invalidEnv)).toThrow(ConfigurationError);
  });

  it('should throw ConfigurationError when WOOCOMMERCE_URL is not a valid URL', () => {
    const invalidUrlEnv = {
      WOOCOMMERCE_URL: 'not-a-valid-url',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    };

    expect(() => validateEnvironment(invalidUrlEnv)).toThrow(ConfigurationError);
  });

  it('should throw ConfigurationError when PORT is out of valid TCP range', () => {
    const invalidPortEnv = {
      PORT: '99999',
      WOOCOMMERCE_URL: 'https://store.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    };

    expect(() => validateEnvironment(invalidPortEnv)).toThrow(ConfigurationError);
  });

  it('should throw ConfigurationError when WOOCOMMERCE_TIMEOUT_MS is less than 1000ms', () => {
    const invalidTimeoutEnv = {
      WOOCOMMERCE_URL: 'https://store.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
      WOOCOMMERCE_TIMEOUT_MS: '200',
    };

    expect(() => validateEnvironment(invalidTimeoutEnv)).toThrow(ConfigurationError);
  });

  it('should reject insecure HTTP for remote endpoints in production', () => {
    const remoteHttpProdEnv = {
      NODE_ENV: 'production',
      WOOCOMMERCE_URL: 'http://remote-store.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    };

    expect(() => validateEnvironment(remoteHttpProdEnv)).toThrow(ConfigurationError);
  });

  it('should permit localhost HTTP in production or development', () => {
    const localhostHttpEnv = {
      NODE_ENV: 'production',
      WOOCOMMERCE_URL: 'http://localhost:8080',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    };

    const config = validateEnvironment(localhostHttpEnv);
    expect(config.woocommerce.url).toBe('http://localhost:8080');
  });

  it('should accept WOOCOMMERCE_BASE_URL as an alias for WOOCOMMERCE_URL', () => {
    const aliasEnv = {
      WOOCOMMERCE_BASE_URL: 'https://alias-store.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    };

    const config = validateEnvironment(aliasEnv);
    expect(config.woocommerce.url).toBe('https://alias-store.example.com');
  });
});
