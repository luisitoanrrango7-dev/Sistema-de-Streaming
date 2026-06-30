interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheEntry<any>> = {};
const TTL_MS = 15000; // 15 seconds Cache TTL

export function getCachedData<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && (Date.now() - entry.timestamp) < TTL_MS) {
    return entry.data;
  }
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
}

export function invalidateCache(keys: string | string[]): void {
  const keysToInvalidate = Array.isArray(keys) ? keys : [keys];
  keysToInvalidate.forEach((key) => {
    delete cache[key];
  });
}

export function clearAllCache(): void {
  Object.keys(cache).forEach((key) => {
    delete cache[key];
  });
}
