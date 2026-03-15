/**
 * Comprehensive Caching Service
 * Provides intelligent caching for API responses, user data, and computed values
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
  lastAccessed: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  cleanupInterval: number;
  enablePersistence: boolean;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    size: 0,
  };
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      enablePersistence: true,
      ...config,
    };

    this.startCleanupTimer();
    this.loadFromPersistence();
  }

  public static getInstance(config?: Partial<CacheConfig>): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  /**
   * Get cached data by key
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Set cached data with TTL
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTtl,
      hits: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;

    // Enforce max size limit
    if (this.cache.size > this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    // Persist to localStorage if enabled
    if (this.config.enablePersistence) {
      this.persistToStorage();
    }
  }

  /**
   * Get or set cached data with fallback function
   */
  public async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fallback();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Cache fallback function failed:', error);
      throw error;
    }
  }

  /**
   * Check if cache has key (without accessing)
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cached data by key
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  public clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    
    if (this.config.enablePersistence) {
      localStorage.removeItem('grantfather_cache');
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Generate cache key for API requests
   */
  public generateApiKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `api:${endpoint}:${sortedParams}`;
  }

  /**
   * Generate cache key for user-specific data
   */
  public generateUserKey(userId: string, resource: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `user:${userId}:${resource}:${sortedParams}`;
  }

  /**
   * Generate cache key for organization-specific data
   */
  public generateOrgKey(orgId: string, resource: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `org:${orgId}:${resource}:${sortedParams}`;
  }

  /**
   * Invalidate cache by pattern
   */
  public invalidatePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    this.stats.size = this.cache.size;
    return deletedCount;
  }

  /**
   * Invalidate user-specific cache
   */
  public invalidateUser(userId: string): number {
    return this.invalidatePattern(`^user:${userId}:`);
  }

  /**
   * Invalidate organization-specific cache
   */
  public invalidateOrganization(orgId: string): number {
    return this.invalidatePattern(`^org:${orgId}:`);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove 10% of entries (or at least 1)
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    this.stats.size = this.cache.size;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    this.stats.size = this.cache.size;
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: Removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistToStorage(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('grantfather_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromPersistence(): void {
    if (!this.config.enablePersistence) return;
    
    try {
      const stored = localStorage.getItem('grantfather_cache');
      if (!stored) return;
      
      const cacheData = JSON.parse(stored);
      const now = Date.now();
      
      for (const [key, entry] of cacheData) {
        // Only restore non-expired entries
        if (now - entry.timestamp < entry.ttl) {
          this.cache.set(key, entry);
        }
      }
      
      this.stats.size = this.cache.size;
      console.log(`📦 Cache restored: ${this.cache.size} entries from localStorage`);
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    return totalSize;
  }

  /**
   * Destroy cache service
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

export const cacheService = CacheService.getInstance();

/**
 * Cache key generators for different types of data
 */
export const CacheKeys = {
  /**
   * Generate cache key for AI responses
   */
  aiResponse: (applicationId: string, section: string, provider: string, model: string): string => {
    return `ai:${applicationId}:${section}:${provider}:${model}`;
  },

  /**
   * Generate cache key for user data
   */
  userData: (userId: string, resource: string, params: Record<string, any> = {}): string => {
    return cacheService.generateUserKey(userId, resource, params);
  },

  /**
   * Generate cache key for organization data
   */
  organizationData: (orgId: string, resource: string, params: Record<string, any> = {}): string => {
    return cacheService.generateOrgKey(orgId, resource, params);
  },

  /**
   * Generate cache key for API responses
   */
  apiResponse: (endpoint: string, params: Record<string, any> = {}): string => {
    return cacheService.generateApiKey(endpoint, params);
  },

  /**
   * Generate cache key for computed values
   */
  computed: (component: string, computation: string, params: Record<string, any> = {}): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `computed:${component}:${computation}:${sortedParams}`;
  }
};