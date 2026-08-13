/**
 * Per-IP fixed-window rate limiter, in memory.
 *
 * Only `POST /api/brief` uses it, because that route spends someone else's quota — reading a cached
 * brief is a file read and is deliberately unlimited.
 *
 * On Vercel this Map is per instance, so the real limit is `limit × instances` — leaky by
 * construction. That is documented in the README's Limitations rather than papered over with a
 * comment claiming otherwise; fixing it properly means Redis, which is not a thing this repo needs.
 *
 * The clock is injected so the tests do not sleep.
 */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets — goes straight into `Retry-After`. */
  retry_after_seconds: number;
}

interface Window {
  started: number;
  count: number;
}

/** Five generations per ten minutes. A demo needs a handful; a scraper needs more. */
export const DEFAULT_LIMIT = 5;
export const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimitOptions) {
  const windows = new Map<string, Window>();

  return function take(key: string): RateLimitResult {
    const timestamp = now();
    const existing = windows.get(key);

    if (!existing || timestamp - existing.started >= windowMs) {
      windows.set(key, { started: timestamp, count: 1 });
      return { allowed: true, remaining: limit - 1, retry_after_seconds: 0 };
    }

    const elapsed = timestamp - existing.started;
    const retryAfter = Math.ceil((windowMs - elapsed) / 1000);

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, retry_after_seconds: retryAfter };
    }

    existing.count += 1;
    return { allowed: true, remaining: limit - existing.count, retry_after_seconds: retryAfter };
  };
}
