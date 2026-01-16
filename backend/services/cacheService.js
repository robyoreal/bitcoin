/**
 * Enhanced Caching Service
 * Supports multiple cache strategies: memory, Redis, and file-based
 */

const fs = require('fs').promises;
const path = require('path');

class CacheService {
  constructor(strategy = 'memory') {
    this.strategy = strategy;
    this.memoryCache = new Map();
    this.redisClient = null;
    this.cacheDir = path.join(__dirname, '../../.cache');

    // Default TTL values (in seconds)
    this.defaultTTL = {
      cryptoPrices: parseInt(process.env.CACHE_CRYPTO_PRICES_TTL) || 60,
      exchangeRates: parseInt(process.env.CACHE_EXCHANGE_RATES_TTL) || 300,
      topCryptos: parseInt(process.env.CACHE_TOP_CRYPTOS_TTL) || 120,
      searchResults: parseInt(process.env.CACHE_SEARCH_TTL) || 600
    };

    this.initializeCache();
  }

  async initializeCache() {
    if (this.strategy === 'redis') {
      await this.initRedis();
    } else if (this.strategy === 'file') {
      await this.initFileCache();
    }
    console.log(`Cache initialized with strategy: ${this.strategy}`);
  }

  async initRedis() {
    try {
      const redis = require('redis');
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis error:', err);
        console.log('Falling back to memory cache');
        this.strategy = 'memory';
        this.redisClient = null;
      });

      await this.redisClient.connect();
      console.log('Redis cache connected successfully');
    } catch (error) {
      console.error('Failed to initialize Redis:', error.message);
      console.log('Falling back to memory cache');
      this.strategy = 'memory';
    }
  }

  async initFileCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log('File cache directory initialized');
    } catch (error) {
      console.error('Failed to create cache directory:', error.message);
      console.log('Falling back to memory cache');
      this.strategy = 'memory';
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null if not found/expired
   */
  async get(key) {
    try {
      switch (this.strategy) {
        case 'redis':
          return await this.getFromRedis(key);
        case 'file':
          return await this.getFromFile(key);
        default:
          return this.getFromMemory(key);
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    try {
      switch (this.strategy) {
        case 'redis':
          return await this.setInRedis(key, value, ttl);
        case 'file':
          return await this.setInFile(key, value, ttl);
        default:
          return this.setInMemory(key, value, ttl);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    try {
      switch (this.strategy) {
        case 'redis':
          return await this.deleteFromRedis(key);
        case 'file':
          return await this.deleteFromFile(key);
        default:
          return this.deleteFromMemory(key);
      }
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Clear all cache entries
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      switch (this.strategy) {
        case 'redis':
          return await this.clearRedis();
        case 'file':
          return await this.clearFile();
        default:
          return this.clearMemory();
      }
    } catch (error) {
      console.error('Cache clear error:', error.message);
      return false;
    }
  }

  // Memory cache implementation
  getFromMemory(key) {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  setInMemory(key, value, ttl) {
    const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;
    this.memoryCache.set(key, { value, expiresAt });
    return true;
  }

  deleteFromMemory(key) {
    return this.memoryCache.delete(key);
  }

  clearMemory() {
    this.memoryCache.clear();
    return true;
  }

  // Redis cache implementation
  async getFromRedis(key) {
    if (!this.redisClient) return null;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setInRedis(key, value, ttl) {
    if (!this.redisClient) return false;
    const options = ttl ? { EX: ttl } : {};
    await this.redisClient.set(key, JSON.stringify(value), options);
    return true;
  }

  async deleteFromRedis(key) {
    if (!this.redisClient) return false;
    await this.redisClient.del(key);
    return true;
  }

  async clearRedis() {
    if (!this.redisClient) return false;
    await this.redisClient.flushDb();
    return true;
  }

  // File-based cache implementation
  getCacheFilePath(key) {
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  async getFromFile(key) {
    try {
      const filePath = this.getCacheFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      const item = JSON.parse(data);

      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.deleteFromFile(key);
        return null;
      }

      return item.value;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`File cache read error for ${key}:`, error.message);
      }
      return null;
    }
  }

  async setInFile(key, value, ttl) {
    try {
      const filePath = this.getCacheFilePath(key);
      const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;
      const data = JSON.stringify({ value, expiresAt });
      await fs.writeFile(filePath, data, 'utf8');
      return true;
    } catch (error) {
      console.error(`File cache write error for ${key}:`, error.message);
      return false;
    }
  }

  async deleteFromFile(key) {
    try {
      const filePath = this.getCacheFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`File cache delete error for ${key}:`, error.message);
      }
      return false;
    }
  }

  async clearFile() {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
      return true;
    } catch (error) {
      console.error('File cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Get statistics about cache usage
   * @returns {Promise<object>} - Cache statistics
   */
  async getStats() {
    const stats = {
      strategy: this.strategy,
      ttlConfig: this.defaultTTL
    };

    switch (this.strategy) {
      case 'redis':
        if (this.redisClient) {
          const info = await this.redisClient.info('stats');
          stats.details = info;
        }
        break;
      case 'file':
        try {
          const files = await fs.readdir(this.cacheDir);
          stats.entryCount = files.length;
        } catch (error) {
          stats.entryCount = 0;
        }
        break;
      default:
        stats.entryCount = this.memoryCache.size;
        break;
    }

    return stats;
  }

  /**
   * Cleanup expired entries (useful for memory and file cache)
   * @returns {Promise<number>} - Number of entries cleaned
   */
  async cleanup() {
    let cleaned = 0;

    switch (this.strategy) {
      case 'file':
        cleaned = await this.cleanupFileCache();
        break;
      case 'memory':
        cleaned = this.cleanupMemoryCache();
        break;
      // Redis handles expiration automatically
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  cleanupMemoryCache() {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  async cleanupFileCache() {
    let cleaned = 0;
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();

      for (const file of files) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const item = JSON.parse(data);

          if (item.expiresAt && now > item.expiresAt) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (error) {
          // Skip invalid files
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error.message);
    }

    return cleaned;
  }

  /**
   * Graceful shutdown
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Singleton instance
let cacheInstance = null;

function getCacheInstance() {
  if (!cacheInstance) {
    const strategy = process.env.CACHE_STRATEGY || 'memory';
    cacheInstance = new CacheService(strategy);
  }
  return cacheInstance;
}

module.exports = {
  CacheService,
  getCacheInstance
};
