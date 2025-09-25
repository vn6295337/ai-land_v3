/**
 * Local Storage Service
 *
 * This module provides a type-safe wrapper around localStorage with
 * JSON serialization, error handling, and storage quota management.
 */

/**
 * Storage options
 */
interface StorageOptions {
  /** Encryption key for sensitive data */
  encrypt?: boolean;
  /** TTL in milliseconds */
  ttl?: number;
  /** Whether to compress data */
  compress?: boolean;
}

/**
 * Storage item with metadata
 */
interface StorageItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
  compressed?: boolean;
}

/**
 * Storage statistics
 */
interface StorageStats {
  totalKeys: number;
  totalSize: number;
  availableSpace: number;
  usagePercentage: number;
  largestItems: Array<{ key: string; size: number }>;
}

/**
 * LocalStorageService class
 */
export class LocalStorageService {
  private readonly prefix: string;
  private readonly maxKeyLength = 100;

  constructor(prefix = 'aimodels_') {
    this.prefix = prefix;
  }

  /**
   * Store data in localStorage
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      this.validateKey(key);

      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: options.ttl,
        encrypted: options.encrypt,
        compressed: options.compress
      };

      let serialized = JSON.stringify(item);

      // Compress if requested
      if (options.compress) {
        serialized = this.compress(serialized);
      }

      // Encrypt if requested
      if (options.encrypt) {
        serialized = this.encrypt(serialized);
      }

      const fullKey = this.getFullKey(key);
      localStorage.setItem(fullKey, serialized);

      return true;
    } catch (error) {
      console.error('LocalStorage set error:', error);
      return false;
    }
  }

  /**
   * Retrieve data from localStorage
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      this.validateKey(key);

      const fullKey = this.getFullKey(key);
      let serialized = localStorage.getItem(fullKey);

      if (!serialized) {
        return defaultValue;
      }

      // Decrypt if needed
      if (this.isEncrypted(serialized)) {
        serialized = this.decrypt(serialized);
      }

      // Decompress if needed
      if (this.isCompressed(serialized)) {
        serialized = this.decompress(serialized);
      }

      const item: StorageItem<T> = JSON.parse(serialized);

      // Check TTL
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return defaultValue;
      }

      return item.data;
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): boolean {
    try {
      this.validateKey(key);

      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('LocalStorage remove error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    try {
      this.validateKey(key);

      const fullKey = this.getFullKey(key);
      return localStorage.getItem(fullKey) !== null;
    } catch (error) {
      console.error('LocalStorage has error:', error);
      return false;
    }
  }

  /**
   * Clear all items with this service's prefix
   */
  clear(): boolean {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('LocalStorage clear error:', error);
      return false;
    }
  }

  /**
   * Get all keys managed by this service
   */
  keys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    } catch (error) {
      console.error('LocalStorage keys error:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): StorageStats {
    try {
      const keys = this.getAllKeys();
      let totalSize = 0;
      const itemSizes: Array<{ key: string; size: number }> = [];

      keys.forEach(fullKey => {
        const value = localStorage.getItem(fullKey);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          itemSizes.push({
            key: fullKey.substring(this.prefix.length),
            size
          });
        }
      });

      // Sort by size (largest first)
      itemSizes.sort((a, b) => b.size - a.size);

      // Estimate available space (most browsers have ~5-10MB limit)
      const estimatedQuota = 5 * 1024 * 1024; // 5MB
      const availableSpace = Math.max(0, estimatedQuota - totalSize);
      const usagePercentage = (totalSize / estimatedQuota) * 100;

      return {
        totalKeys: keys.length,
        totalSize,
        availableSpace,
        usagePercentage,
        largestItems: itemSizes.slice(0, 10) // Top 10 largest items
      };
    } catch (error) {
      console.error('LocalStorage stats error:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        availableSpace: 0,
        usagePercentage: 0,
        largestItems: []
      };
    }
  }

  /**
   * Clean up expired items
   */
  cleanup(): number {
    try {
      let removedCount = 0;
      const keys = this.keys();

      keys.forEach(key => {
        const item = this.getStorageItem(key);
        if (item && item.ttl && Date.now() - item.timestamp > item.ttl) {
          this.remove(key);
          removedCount++;
        }
      });

      return removedCount;
    } catch (error) {
      console.error('LocalStorage cleanup error:', error);
      return 0;
    }
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = `${this.prefix}__test__`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<{
    quota: number;
    usage: number;
    available: number;
  } | null> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0)
        };
      }
      return null;
    } catch (error) {
      console.error('Quota info error:', error);
      return null;
    }
  }

  /**
   * Validate key format
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    if (key.length > this.maxKeyLength) {
      throw new Error(`Key length cannot exceed ${this.maxKeyLength} characters`);
    }

    if (key.includes('\0')) {
      throw new Error('Key cannot contain null characters');
    }
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get all keys with prefix
   */
  private getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Get storage item with metadata
   */
  private getStorageItem<T>(key: string): StorageItem<T> | null {
    try {
      const fullKey = this.getFullKey(key);
      const serialized = localStorage.getItem(fullKey);

      if (!serialized) {
        return null;
      }

      return JSON.parse(serialized);
    } catch (error) {
      return null;
    }
  }

  /**
   * Simple compression using JSON optimization
   */
  private compress(data: string): string {
    // Simple compression by removing unnecessary whitespace
    return JSON.stringify(JSON.parse(data));
  }

  /**
   * Decompress data
   */
  private decompress(data: string): string {
    return data; // No actual decompression needed for our simple method
  }

  /**
   * Check if data appears compressed
   */
  private isCompressed(data: string): boolean {
    // For our simple method, we don't need to detect compression
    return false;
  }

  /**
   * Simple encryption (for demo purposes - use proper encryption in production)
   */
  private encrypt(data: string): string {
    // Simple base64 encoding (NOT secure - replace with proper encryption)
    return `enc:${btoa(data)}`;
  }

  /**
   * Decrypt data
   */
  private decrypt(data: string): string {
    if (data.startsWith('enc:')) {
      return atob(data.substring(4));
    }
    return data;
  }

  /**
   * Check if data appears encrypted
   */
  private isEncrypted(data: string): boolean {
    return data.startsWith('enc:');
  }
}

/**
 * Create LocalStorageService instance
 */
export const createLocalStorageService = (prefix?: string): LocalStorageService => {
  return new LocalStorageService(prefix);
};

/**
 * Default LocalStorageService instance
 */
export const storageService = createLocalStorageService();