interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function readCache<T>(key: string, maxAgeMs: number = 5 * 60 * 1000): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    const ageMs = Date.now() - entry.timestamp;

    if (ageMs > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
  }
}

export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
  }
}

export function clearCacheByPattern(pattern: string | RegExp): void {
  try {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    const keys = Object.keys(localStorage).filter((key) => regex.test(key));
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
  }
}

export function getCacheTTL(key: string, maxAgeMs: number = 5 * 60 * 1000): number {
  try {
    const item = localStorage.getItem(key);
    if (!item) return -1;

    const entry: CacheEntry<unknown> = JSON.parse(item);
    const remainingMs = maxAgeMs - (Date.now() - entry.timestamp);
    return Math.max(0, remainingMs);
  } catch {
    return -1;
  }
}
