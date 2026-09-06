import prisma from '@/lib/prisma';

/**
 * CacheService - MySQL-based caching for Hostinger shared hosting
 * Provides simple get/set/delete with TTL (Time To Live)
 */

export const CacheService = {
  /**
   * Get cached value by key
   * @param {string} key - Unique cache key
   * @returns {Promise<any|null>} - Cached value or null if not found/expired
   */
  async get(key) {
    try {
      const cached = await prisma.cache.findUnique({
        where: { cacheKey: key },
        select: { cacheValue: true, expiresAt: true },
      });

      if (!cached) return null;

      // Check if expired
      if (new Date(cached.expiresAt) < new Date()) {
        // Delete expired entry
        await prisma.cache.delete({ where: { cacheKey: key } }).catch(() => {});
        return null;
      }

      // Parse and return cached value
      try {
        return JSON.parse(cached.cacheValue);
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  },

  /**
   * Set cache value with TTL
   * @param {string} key - Unique cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttlSeconds - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttlSeconds = 60) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const cacheValue = JSON.stringify(value);

      await prisma.cache.upsert({
        where: { cacheKey: key },
        create: {
          cacheKey: key,
          cacheValue,
          expiresAt,
        },
        update: {
          cacheValue,
          expiresAt,
        },
      });

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete cache by key
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    try {
      await prisma.cache.delete({ where: { cacheKey: key } }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete multiple cache entries by prefix
   * @param {string} prefix - Key prefix to match
   * @returns {Promise<number>} - Number of deleted entries
   */
  async deleteByPrefix(prefix) {
    try {
      const result = await prisma.cache.deleteMany({
        where: {
          cacheKey: { startsWith: prefix },
        },
      });
      return result.count;
    } catch {
      return 0;
    }
  },

  /**
   * Clear all expired cache entries
   * @returns {Promise<number>} - Number of deleted entries
   */
  async clearExpired() {
    try {
      const result = await prisma.cache.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
      return result.count;
    } catch {
      return 0;
    }
  },

  /**
   * Clear all cache entries
   * @returns {Promise<number>} - Number of deleted entries
   */
  async clearAll() {
    try {
      const result = await prisma.cache.deleteMany({});
      return result.count;
    } catch {
      return 0;
    }
  },
};