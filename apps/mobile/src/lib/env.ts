import Constants from 'expo-constants';
import { z } from 'zod';

/**
 * Typed accessor for values injected by app.config.ts's `extra` field.
 * Add fields here (and to app.config.ts) as api client / socket / storage
 * modules need more per-build-profile configuration.
 */
export interface Env {
  apiUrl: string;
  wsUrl: string;
  appEnv: string;
}

const envSchema = z.object({
  apiUrl: z.string().min(1),
  wsUrl: z.string().min(1),
  appEnv: z.string().min(1),
});

function readEnv(): Env {
  const extra = Constants.expoConfig?.extra;

  const missing: string[] = [];
  if (!extra?.apiUrl) missing.push('EXPO_PUBLIC_API_URL');
  if (!extra?.wsUrl) missing.push('EXPO_PUBLIC_WS_URL');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Check app.config.ts / EAS Build environment configuration.',
    );
  }

  const parsed = envSchema.safeParse(extra);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

export const env: Env = readEnv();
