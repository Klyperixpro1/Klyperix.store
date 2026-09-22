import { get, run } from '../db/database';

// In-Memory Fast Cache Layer
const memCache = new Map<string, { data: any; expiresAt: number }>();

export async function getCachedData<T = any>(cacheKey: string): Promise<T | null> {
  const now = Date.now();

  // 1. Check in-memory Map (<1ms)
  const inMem = memCache.get(cacheKey);
  if (inMem) {
    if (inMem.expiresAt > now) {
      return inMem.data as T;
    }
    memCache.delete(cacheKey);
  }

  // 2. Check SQLite persistent cache
  try {
    const row = await get<{ data_json: string; expires_at: string }>(
      'SELECT data_json, expires_at FROM api_cache WHERE cache_key = ?',
      [cacheKey]
    );

    if (row) {
      const expTime = new Date(row.expires_at).getTime();
      if (expTime > now) {
        const parsed = JSON.parse(row.data_json);
        memCache.set(cacheKey, { data: parsed, expiresAt: expTime });
        return parsed as T;
      }
      // Expired: delete
      await run('DELETE FROM api_cache WHERE cache_key = ?', [cacheKey]);
    }
  } catch (err) {
    // Ignore cache lookup errors
  }

  return null;
}

export async function setCachedData(cacheKey: string, data: any, ttlHours: number = 24): Promise<void> {
  const expTime = Date.now() + ttlHours * 60 * 60 * 1000;
  const expIso = new Date(expTime).toISOString();
  const dataJson = JSON.stringify(data);

  // 1. Store in memory
  memCache.set(cacheKey, { data, expiresAt: expTime });

  // 2. Store in SQLite
  try {
    await run(
      'INSERT OR REPLACE INTO api_cache (cache_key, data_json, expires_at) VALUES (?, ?, ?)',
      [cacheKey, dataJson, expIso]
    );
  } catch (err) {
    // Ignore cache write errors
  }
}
