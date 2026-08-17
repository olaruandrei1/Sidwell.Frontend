// Generic localStorage read-through/write-through cache for API responses.
//
// Pattern: a query's `initialData` is seeded synchronously from localStorage (instant paint,
// no loading spinner on repeat visits), the real request still fires in the background
// (`refetchOnMount: 'always'` on the caller's useQuery), and `withLocalCache` persists whatever
// the network returns so the next visit starts from fresh data. Add one entry to ROUTE_CACHE_KEYS
// per endpoint you want this behavior for — everything else (read/write/key building) is generic.

const ROUTE_CACHE_KEYS: Record<string, string> = {
  'ticker-detail': 'sw:cache:ticker:{symbol}',
  'ticker-indicators': 'sw:cache:ticker-indicators:{symbol}:{types}',
  'ticker-dividends': 'sw:cache:ticker-dividends:{symbol}',
};

function buildCacheKey(routeName: string, params: Record<string, string>): string | null {
  const template = ROUTE_CACHE_KEYS[routeName];
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (_, p: string) => params[p] ?? '');
}

export function readCache<T>(routeName: string, params: Record<string, string>): T | undefined {
  const key = buildCacheKey(routeName, params);
  if (!key) return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(routeName: string, params: Record<string, string>, value: T): void {
  const key = buildCacheKey(routeName, params);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or value not serializable — cache is a best-effort optimization, never fatal.
  }
}

/** Wraps a queryFn so a successful response is persisted to localStorage under routeName/params. */
export function withLocalCache<T>(
  routeName: string,
  params: Record<string, string>,
  fetcher: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const result = await fetcher();
    writeCache(routeName, params, result);
    return result;
  };
}
