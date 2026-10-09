import dotenv from 'dotenv';
import { validateEnvironment } from './env.js';
import type { AppConfig } from '../types/index.js';

// Load .env if present
dotenv.config();

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnvironment(process.env);
  }
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export { validateEnvironment, envSchema } from './env.js';
export type { RawEnvironment } from './env.js';
