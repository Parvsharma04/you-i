import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../services/cache.service';

interface UseCachedApiOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to skip the initial fetch entirely */
  skip?: boolean;
}

/**
 * A hook that attempts to load data from the cache first, falling back to an API call.
 * 
 * @param key The unique cache key for this data
 * @param fetchFn The function that fetches fresh data from the API
 * @param options Configuration options for cache and behavior
 */
export function useCachedApi<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseCachedApiOptions = {}
) {
  const { ttl = 5 * 60 * 1000, skip = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async (forceRefetch = false) => {
    if (skip && !forceRefetch) return;

    setLoading(true);
    setError(null);

    try {
      // If we aren't forcing a refetch, try the cache first
      if (!forceRefetch) {
        const cachedData = await cacheService.get<T>(key);
        if (cachedData !== null) {
          console.log(`[API] Cache HIT for ${key}`);
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      // No valid cache (or forced refetch), fetch fresh data
      console.log(`[API] Cache MISS for ${key}, fetching fresh data...`);
      const freshData = await fetchFn();
      console.log(`[API] Fetched fresh data for ${key}`);
      
      // Cache the newly fetched data
      await cacheService.set(key, freshData, ttl);
      
      setData(freshData);
    } catch (err) {
      const actualError = err instanceof Error ? err : new Error(String(err));
      
      // If network fails, attempt to get stale/existing data from cache as a fallback
      // We read directly without strict TTL enforcement if possible, but our cacheService.get
      // automatically deletes expired items. 
      // A more complex cache could keep stale data, but here we just try a standard get.
      const fallbackData = await cacheService.get<T>(key);
      if (fallbackData !== null) {
        setData(fallbackData);
        // We log the error but still return fallback data
        console.warn(`[useCachedApi] Fetch failed for ${key}, using cached fallback.`, actualError);
      } else {
        setError(actualError);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl, skip]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [loadData]);

  /**
   * Bypasses the cache, fetches fresh data, and updates the cache.
   */
  const refetch = async () => {
    await loadData(true);
  };

  return { data, loading, error, refetch };
}

/*
EXAMPLE USAGE:

import { useCachedApi } from './useCachedApi';

// Component usage:
const { data: session, loading, error, refetch } = useCachedApi(
  'session_abc123',
  () => api.getSession('abc123'),
  { ttl: 10 * 60 * 1000 } // 10 min cache
);

if (loading) return <Spinner />;
if (error) return <Text>Error: {error.message}</Text>;

return (
  <View>
    <Text>{session?.name}</Text>
    <Button title="Refresh" onPress={refetch} />
  </View>
);
*/
