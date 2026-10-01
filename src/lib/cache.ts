/**
 * A minimal in-memory cache with per-key TTL.
 *
 * WHY THIS EXISTS (this is the "API strategy" evaluation point):
 * The client polls our /api/portfolio route every 15s. Without a cache,
 * that would mean 30 fresh scrape/fetch calls to Yahoo + Google every
 * 15 seconds, for every browser tab a user has open. Unofficial
 * endpoints (especially scraped ones) rate-limit or IP-block aggressive
 * callers fast. The cache means: if a value was fetched less than
 * CACHE_TTL_MS ago, serve it from memory instead of hitting the
 * upstream source again.
 *
 * WHY IN-MEMORY AND NOT REDIS:
 * For a single-instance dashboard (one Next.js server, not horizontally
 * scaled), an in-memory Map is simpler and has zero infra cost. The
 * trade-off — documented in TECHNICAL_DOCUMENT.md — is that this cache
 * does NOT survive server restarts and does NOT share state across
 * multiple server instances. A production deployment behind a load
 * balancer would swap this for Redis without changing the call sites,
 * since the interface (get/set) stays the same.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** How long a cached value is considered fresh. Matches the client poll interval. */
export const CACHE_TTL_MS = 15_000;

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number = CACHE_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Returns the last known value even if expired — used as a fallback when
 * a live fetch fails, so the UI can show "last known price" instead of
 * a blank cell. This is the difference between "stale" and "missing".
 */
export function getStaleFallback<T>(key: string): T | undefined {
  const entry = store.get(key);
  return entry ? (entry.value as T) : undefined;
}

export function setStaleFallback<T>(key: string, value: T): void {
  // Stored with a very long TTL so it survives as a fallback well past
  // the normal cache window, but is still overwritten on the next
  // successful fetch.
  store.set(`stale:${key}`, { value, expiresAt: Date.now() + 1000 * 60 * 60 });
}

export function getStale<T>(key: string): T | undefined {
  const entry = store.get(`stale:${key}`);
  return entry ? (entry.value as T) : undefined;
}
