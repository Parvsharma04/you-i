// Single source of truth for the CORS allowlist, consumed by both the HTTP
// server (main.ts) and the socket.io gateway (quiz.gateway.ts) — previously
// these were configured independently and could drift.
//
// `ALLOWED_ORIGINS` is a comma-separated list, e.g.
// "https://youandi.app,https://www.youandi.app". Falls back to the legacy
// single-origin `FRONTEND_URL` for backward compatibility, then to the local
// dev origin.
//
// Mobile clients (Expo / React Native) don't send an `Origin` header at
// all, so they are never subject to this check — only browser-based
// callers (apps/web) are. Requests with no Origin header are always
// allowed through; this is what makes mobile "just work" today, and it's
// intentional, not a hole, since the header can't be used to prove a
// browser origin either way.
function parseAllowedOrigins(): string[] {
  const raw =
    process.env.ALLOWED_ORIGINS ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000';

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

export interface SharedCorsOptions {
  origin: (
    requestOrigin: string | undefined,
    callback: CorsOriginCallback,
  ) => void;
  credentials: boolean;
}

export function buildCorsOptions(): SharedCorsOptions {
  const allowedOrigins = parseAllowedOrigins();

  return {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${requestOrigin} not allowed by CORS`));
    },
    credentials: true,
  };
}
