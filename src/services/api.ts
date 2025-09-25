/**
 * API Service Layer
 *
 * This module provides a centralized HTTP client with error handling,
 * request/response interceptors, caching, and retry logic.
 */

import { APIResponse, ErrorState } from '../types/models';

/**
 * HTTP method types
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request configuration options
 */
interface RequestConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body for POST/PUT/PATCH */
  body?: unknown;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Whether to use cache */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Retry attempts */
  retries?: number;
  /** Authentication token */
  token?: string;
}

/**
 * Request interceptor function type
 */
type RequestInterceptor = (config: RequestConfig & { url: string; method: HttpMethod }) =>
  RequestConfig & { url: string; method: HttpMethod } | Promise<RequestConfig & { url: string; method: HttpMethod }>;

/**
 * Response interceptor function type
 */
type ResponseInterceptor<T = unknown> = (response: APIResponse<T>) => APIResponse<T> | Promise<APIResponse<T>>;

/**
 * Cache entry interface
 */
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Circuit breaker state
 */
type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

/**
 * ApiService class for HTTP requests with advanced features
 */
export class ApiService {
  private baseURL: string;
  private defaultTimeout: number;
  private cache: Map<string, CacheEntry>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  // Circuit breaker state
  private circuitBreakerState: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerConfig: CircuitBreakerConfig;

  constructor(
    baseURL = '',
    defaultTimeout = 30000,
    circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 300000
    }
  ) {
    this.baseURL = baseURL;
    this.defaultTimeout = defaultTimeout;
    this.cache = new Map();
    this.circuitBreakerConfig = circuitBreakerConfig;

    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 300000);
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * GET request with caching and error handling
   */
  async get<T>(endpoint: string, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>('GET', endpoint, config);
  }

  /**
   * POST request with request validation
   */
  async post<T>(endpoint: string, data: unknown, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>('POST', endpoint, { ...config, body: data });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: unknown, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...config, body: data });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: unknown, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...config, body: data });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>('DELETE', endpoint, config);
  }

  /**
   * Main request method with all features
   */
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    // Check circuit breaker
    if (this.circuitBreakerState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.circuitBreakerConfig.recoveryTimeout) {
        this.circuitBreakerState = 'HALF_OPEN';
      } else {
        return this.createErrorResponse('Service temporarily unavailable', 503);
      }
    }

    const url = this.buildUrl(endpoint, config.params);
    const cacheKey = this.getCacheKey(method, url, config.body);

    // Check cache for GET requests
    if (method === 'GET' && config.cache !== false) {
      const cachedResponse = this.getFromCache<T>(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Apply request interceptors
    let requestConfig = { ...config, url, method };
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    // Perform request with retry logic
    const maxRetries = config.retries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(requestConfig);

        // Reset circuit breaker on success
        if (this.circuitBreakerState === 'HALF_OPEN') {
          this.circuitBreakerState = 'CLOSED';
          this.failureCount = 0;
        }

        // Apply response interceptors
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse);
        }

        // Cache successful GET responses
        if (method === 'GET' && response.success && config.cache !== false) {
          this.setCache(cacheKey, response, config.cacheTTL || 300000); // Default 5 min TTL
        }

        return finalResponse;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          break;
        }

        // Exponential backoff delay
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Handle failure - update circuit breaker
    this.handleRequestFailure();

    return this.createErrorResponse(
      lastError?.message || 'Request failed after retries',
      500
    );
  }

  /**
   * Execute HTTP request
   */
  private async executeRequest<T>(config: RequestConfig & { url: string; method: HttpMethod }): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeout = config.timeout || this.defaultTimeout;

    // Set timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...config.headers
      };

      // Add authentication token
      if (config.token) {
        headers.Authorization = `Bearer ${config.token}`;
      }

      const fetchConfig: RequestInit = {
        method: config.method,
        headers,
        signal: controller.signal
      };

      // Add body for non-GET requests
      if (config.body && config.method !== 'GET') {
        fetchConfig.body = JSON.stringify(config.body);
      }

      const response = await fetch(config.url, fetchConfig);

      clearTimeout(timeoutId);

      // Parse response
      const responseData = await this.parseResponse<T>(response);

      return {
        data: responseData,
        success: response.ok,
        loading: false,
        status: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }

      throw new Error('Unknown request error');
    }
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('text/')) {
      return response.text() as unknown as T;
    }

    return response.blob() as unknown as T;
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });

      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    return url;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(method: string, url: string, body?: unknown): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${btoa(bodyStr)}`;
  }

  /**
   * Get response from cache
   */
  private getFromCache<T>(key: string): APIResponse<T> | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data,
      success: true,
      loading: false,
      error: undefined
    };
  }

  /**
   * Store response in cache
   */
  private setCache<T>(key: string, response: APIResponse<T>, ttl: number): void {
    this.cache.set(key, {
      data: response.data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Handle request failure for circuit breaker
   */
  private handleRequestFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.circuitBreakerState = 'OPEN';
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse<T>(message: string, status?: number): APIResponse<T> {
    return {
      data: null as unknown as T,
      success: false,
      loading: false,
      error: message,
      status
    };
  }

  /**
   * Clear all cached responses
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): { state: CircuitBreakerState; failureCount: number } {
    return {
      state: this.circuitBreakerState,
      failureCount: this.failureCount
    };
  }
}

/**
 * Create default API service instance
 */
export const createApiService = (baseURL?: string, timeout?: number): ApiService => {
  return new ApiService(baseURL, timeout);
};

/**
 * Default API service instance
 */
export const apiService = createApiService();