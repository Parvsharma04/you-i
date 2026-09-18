import Constants from 'expo-constants';

/**
 * Typed accessor for values injected by app.config.ts's `extra` field.
 * Add fields here (and to app.config.ts) as api client / socket / storage
 * modules need more per-build-profile configuration.
 */
export interface Env {
  apiUrl: string;
  appEnv: string;
}

function readEnv(): Env {
  const extra = Constants.expoConfig?.extra as Partial<Env> | undefined;

  return {
    apiUrl: extra?.apiUrl ?? 'http://localhost:4000',
    appEnv: extra?.appEnv ?? 'development',
  };
}

export const env: Env = readEnv();
