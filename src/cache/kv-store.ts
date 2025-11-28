/**
 * KV Store wrapper for fast caching
 */

export interface CacheOptions {
  ttl?: number; // seconds
  metadata?: Record<string, any>;
}

export class KVCache {
  private kv: KVNamespace;
  private namespace: string;

  constructor(kv: KVNamespace, namespace: string) {
    this.kv = kv;
    this.namespace = namespace;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const value = await this.kv.get(fullKey, "json");
    return value as T | null;
  }

  async set<T = any>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const fullKey = this.getKey(key);
    const kvOptions: KVNamespacePutOptions = {};

    if (options.ttl) {
      kvOptions.expirationTtl = options.ttl;
    }

    if (options.metadata) {
      kvOptions.metadata = options.metadata;
    }

    await this.kv.put(fullKey, JSON.stringify(value), kvOptions);
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    await this.kv.delete(fullKey);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get with fallback - if not in cache, execute fn and cache result
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }
}

/**
 * Cache configuration for different data types
 */
export const CACHE_TTL = {
  VARIANT: 24 * 60 * 60,      // 24 hours
  GENE: 30 * 24 * 60 * 60,    // 30 days
  DRUG: 30 * 24 * 60 * 60,    // 30 days
  TRIAL: 7 * 24 * 60 * 60,    // 7 days
  DIAGNOSIS: 60 * 60,         // 1 hour
} as const;
