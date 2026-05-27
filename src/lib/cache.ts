/**
 * Cache utilities with TTL (Time-To-Live) support
 * Implements stale-while-revalidate pattern with automatic expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Reads from cache with TTL validation
 * @param key - Cache key
 * @param maxAgeMsMaximum age of cached data in milliseconds (default: 5 minutes)
 * @returns Cached data or null if expired/not found
 */
export function readCache<T>(
  key: string,
  maxAgeMs: number = 5 * 60 * 1000
): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    const ageMs = Date.now() - entry.timestamp;

    if (ageMs > maxAgeMs) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Writes data to cache with timestamp
 * @param key - Cache key
 * @param data - Data to cache
 */
export function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* Ignore quota errors */
  }
}

/**
 * Invalidates cache by key
 * @param key - Cache key to remove
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Ignore errors */
  }
}

/**
 * Clears all cached data matching a pattern
 * @param pattern - Regex or string pattern to match keys
 */
export function clearCacheByPattern(pattern: string | RegExp): void {
  try {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    const keys = Object.keys(localStorage).filter((key) => regex.test(key));
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* Ignore errors */
  }
}

/**
 * Gets remaining TTL for a cached item in seconds
 * @param key - Cache key
 * @param maxAgeMs - Maximum age threshold in milliseconds
 * @returns Remaining TTL in seconds, or -1 if expired/not found
 */
export function getCacheTTL(
  key: string,
  maxAgeMs: number = 5 * 60 * 1000
): number {
  try {
    const item = localStorage.getItem(key);
    if (!item) return -1;

    const entry: CacheEntry<unknown> = JSON.parse(item);
    const ageMs = Date.now() - entry.timestamp;
    const remainingMs = maxAgeMs - ageMs;

    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : -1;
  } catch {
    return -1;
  }
}
