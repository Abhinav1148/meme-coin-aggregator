import Redis from 'ioredis';
import logger from '../utils/logger';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export class CacheService {
  private client: Redis | null = null;
  private defaultTTL: number;
  private inMemoryCache: Map<string, CacheEntry> = new Map();
  private redisAvailable: boolean = false;
  private redisEnabled: boolean;

  constructor() {
    this.defaultTTL = parseInt(process.env.REDIS_TTL || '30', 10);
    this.redisEnabled = process.env.ENABLE_REDIS !== 'false';
    this.initializeRedis();
  }

  private initializeRedis(): void {
    if (!this.redisEnabled) {
      logger.info('Redis disabled via ENABLE_REDIS flag, using in-memory cache only');
      this.redisAvailable = false;
      return;
    }

    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Redis connection failed after 3 retries, using in-memory cache');
            this.redisAvailable = false;
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      this.client.on('error', (err) => {
        logger.warn('Redis connection error, falling back to in-memory cache:', err.message);
        this.redisAvailable = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.redisAvailable = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis is ready');
        this.redisAvailable = true;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed, using in-memory cache');
        this.redisAvailable = false;
      });

      // Attempt to connect
      this.client.connect().catch((err) => {
        logger.warn('Redis connection failed, using in-memory cache:', err.message);
        this.redisAvailable = false;
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis, using in-memory cache:', error);
      this.redisAvailable = false;
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const entry = this.inMemoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.inMemoryCache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  private setInMemory(key: string, value: unknown, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000;
    this.inMemoryCache.set(key, { value, expiresAt });
    
    // Clean up expired entries periodically
    if (this.inMemoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first if available
    if (this.redisEnabled && this.redisAvailable && this.client) {
      try {
        const data = await this.client.get(key);
        if (data) {
          return JSON.parse(data) as T;
        }
      } catch (error) {
        logger.debug(`Redis get failed for key ${key}, trying memory cache:`, error);
        this.redisAvailable = false;
      }
    }
    
    // Fallback to in-memory cache
    return this.getFromMemory<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const cacheTTL = ttl || this.defaultTTL;
    
    // Set in memory cache (always available)
    this.setInMemory(key, value, cacheTTL);
    
    // Try Redis if available
    if (this.redisEnabled && this.redisAvailable && this.client) {
      try {
        const serialized = JSON.stringify(value);
        await this.client.setex(key, cacheTTL, serialized);
      } catch (error) {
        logger.debug(`Redis set failed for key ${key}, using memory cache only:`, error);
        this.redisAvailable = false;
      }
    }
  }

  async del(key: string): Promise<void> {
    // Delete from memory
    this.inMemoryCache.delete(key);
    
    // Try Redis if available
    if (this.redisEnabled && this.redisAvailable && this.client) {
      try {
        await this.client.del(key);
      } catch (error) {
        logger.debug(`Redis delete failed for key ${key}:`, error);
        this.redisAvailable = false;
      }
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }

    logger.debug(`Cache miss for key: ${key}`);
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        logger.warn('Error closing Redis connection:', error);
      }
    }
    this.inMemoryCache.clear();
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }
}

export const cacheService = new CacheService();

