import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache entry structure stored in AsyncStorage
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private prefix = '@youandi_cache_';
  private stats = { hits: 0, misses: 0, sets: 0 };

  /**
   * Retrieves an item from the cache.
   * Returns null if the item doesn't exist, is expired, or if an error occurs.
   * @param key The cache key to retrieve
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = `${this.prefix}${key}`;
      const itemString = await AsyncStorage.getItem(fullKey);
      
      if (!itemString) {
        this.stats.misses++;
        console.log(`[Cache] MISS (Not found): ${key}`);
        return null;
      }

      const item: CacheEntry<T> = JSON.parse(itemString);
      
      // Check if the cache entry has expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.stats.misses++;
        console.log(`[Cache] MISS (Expired): ${key}`);
        // Silently clean up expired item
        await this.delete(key);
        return null;
      }

      this.stats.hits++;
      console.log(`[Cache] HIT: ${key}`);
      return item.data;
    } catch (error) {
      this.stats.misses++;
      console.log(`[Cache] MISS (Error): ${key}`);
      // Silent failure for cache operations
      console.warn(`[CacheService] Failed to get key: ${key}`, error);
      return null;
    }
  }

  /**
   * Stores an item in the cache with a specified TTL.
   * @param key The cache key
   * @param data The data to store
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  async set<T>(key: string, data: T, ttl = 5 * 60 * 1000): Promise<void> {
    try {
      const fullKey = `${this.prefix}${key}`;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      
      await AsyncStorage.setItem(fullKey, JSON.stringify(entry));
      this.stats.sets++;
      console.log(`[Cache] SET: ${key} (TTL: ${ttl}ms)`);
    } catch (error) {
      // Silent failure for cache operations
      console.warn(`[CacheService] Failed to set key: ${key}`, error);
    }
  }

  /**
   * Removes a specific item from the cache.
   * @param key The cache key to remove
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = `${this.prefix}${key}`;
      await AsyncStorage.removeItem(fullKey);
      console.log(`[Cache] DELETE: ${key}`);
    } catch (error) {
      // Silent failure for cache operations
      console.warn(`[CacheService] Failed to delete key: ${key}`, error);
    }
  }

  /**
   * Clears all cache entries associated with this service.
   * Useful for testing or when a user logs out.
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.prefix));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.removeMany(cacheKeys);
        console.log(`[Cache] CLEARED ${cacheKeys.length} items`);
      }
      this.stats = { hits: 0, misses: 0, sets: 0 };
    } catch (error) {
      // Silent failure for cache operations
      console.warn('[CacheService] Failed to clear cache', error);
    }
  }

  /**
   * Returns current cache telemetry and prints it to the console.
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : '0.0';
    
    console.log(`\n================ CACHE STATS ================`);
    console.log(`Hits:   ${this.stats.hits}`);
    console.log(`Misses: ${this.stats.misses}`);
    console.log(`Sets:   ${this.stats.sets}`);
    console.log(`Hit Rate: ${hitRate}%`);
    console.log(`=============================================\n`);
    
    return this.stats;
  }
}

export const cacheService = new CacheService();

/*
EXAMPLE USAGE:

import { cacheService } from './cache.service';

// Store session data with a 10 minute TTL
await cacheService.set('session_abc123', sessionData, 10 * 60 * 1000); 

// Retrieve the session data later
const cached = await cacheService.get<SessionType>('session_abc123');
if (cached) {
  // Use cached data
} else {
  // Fetch from API and cache it
}
*/
