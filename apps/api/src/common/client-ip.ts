import type { Request } from 'express';

/**
 * Best-effort client IP for rate limiting. Trusts the first hop in
 * X-Forwarded-For when present, otherwise falls back to the connection IP.
 * Not used for authentication — only for abuse throttling.
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return request.ip ?? undefined;
}
