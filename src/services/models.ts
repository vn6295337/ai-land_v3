/**
 * Model Service Layer
 *
 * This module provides specialized API methods for AI model data operations,
 * extending the base ApiService with model-specific functionality.
 */

import { ApiService, createApiService } from './api';
import { AIModel, FilterCriteria, SortOptions, SortDirection, APIResponse } from '../types/models';

/**
 * Model search parameters
 */
interface ModelSearchParams {
  /** Search query */
  query?: string;
  /** Pagination page number */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sortBy?: SortOptions;
  /** Sort direction */
  sortDirection?: SortDirection;
  /** Filter criteria */
  filters?: FilterCriteria;
  /** Include detailed metrics */
  includeMetrics?: boolean;
}

/**
 * Model list response
 */
interface ModelListResponse {
  models: AIModel[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters?: FilterCriteria;
  sort?: {
    field: SortOptions;
    direction: SortDirection;
  };
}

/**
 * Model comparison response
 */
interface ModelComparisonResponse {
  models: AIModel[];
  comparison: {
    metrics: string[];
    data: Record<string, Record<string, unknown>>;
  };
}

/**
 * Popular models response
 */
interface PopularModelsResponse {
  trending: AIModel[];
  featured: AIModel[];
  recentlyAdded: AIModel[];
}

/**
 * ModelService class for AI model operations
 */
export class ModelService extends ApiService {
  private modelCache = new Map<string, { data: AIModel; timestamp: number }>();
  private readonly cacheTTL = 300000; // 5 minutes

  constructor(baseURL?: string, timeout?: number) {
    super(baseURL, timeout);

    // Add model-specific request interceptor
    this.addRequestInterceptor((config) => {
      // Add API version header for model endpoints
      if (config.url.includes('/models')) {
        config.headers = {
          ...config.headers,
          'X-API-Version': '2024-09-01'
        };
      }
      return config;
    });

    // Add response interceptor for model data normalization
    this.addResponseInterceptor(async (response) => {
      // Normalize model data structure
      if (response.success && response.data && typeof response.data === 'object') {
        const data = response.data as any;

        if (data.models && Array.isArray(data.models)) {
          data.models = data.models.map(this.normalizeModelData);
        } else if (data.id) {
          // Single model response
          response.data = this.normalizeModelData(data);
        }
      }

      return response;
    });
  }

  /**
   * Fetch all available models with pagination and filtering
   */
  async fetchModels(params: ModelSearchParams = {}): Promise<APIResponse<ModelListResponse>> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortDirection = 'asc',
      includeMetrics = true,
      filters,
      query
    } = params;

    const requestParams: Record<string, string | number | boolean> = {
      page,
      limit,
      sort: sortBy,
      direction: sortDirection,
      includeMetrics
    };

    // Add search query
    if (query) {
      requestParams.q = query;
    }

    // Add filter parameters
    if (filters) {
      if (filters.provider) {
        requestParams.provider = Array.isArray(filters.provider)
          ? filters.provider.join(',')
          : filters.provider;
      }

      if (filters.category) {
        requestParams.category = Array.isArray(filters.category)
          ? filters.category.join(',')
          : filters.category;
      }

      if (filters.minAccuracy !== undefined) {
        requestParams.minAccuracy = filters.minAccuracy;
      }

      if (filters.maxCost !== undefined) {
        requestParams.maxCost = filters.maxCost;
      }

      if (filters.availableOnly) {
        requestParams.availableOnly = filters.availableOnly;
      }

      if (filters.capabilities) {
        if (filters.capabilities.streaming) {
          requestParams.streaming = true;
        }
        if (filters.capabilities.functionCalling) {
          requestParams.functionCalling = true;
        }
        if (filters.capabilities.vision) {
          requestParams.vision = true;
        }
      }
    }

    return this.get<ModelListResponse>('/api/models', {
      params: requestParams,
      cache: true,
      cacheTTL: this.cacheTTL
    });
  }

  /**
   * Search models with advanced query capabilities
   */
  async searchModels(
    query: string,
    filters?: FilterCriteria,
    options: { fuzzy?: boolean; threshold?: number } = {}
  ): Promise<APIResponse<ModelListResponse>> {
    const params: ModelSearchParams = {
      query,
      filters,
      page: 1,
      limit: 100
    };

    const searchParams: Record<string, string | number | boolean> = {
      q: query,
      fuzzy: options.fuzzy || false
    };

    if (options.threshold) {
      searchParams.threshold = options.threshold;
    }

    return this.get<ModelListResponse>('/api/models/search', {
      params: searchParams,
      cache: true,
      cacheTTL: 60000 // 1 minute cache for search results
    });
  }

  /**
   * Get detailed information for a specific model
   */
  async getModelDetails(modelId: string, forceRefresh = false): Promise<APIResponse<AIModel>> {
    // Check local cache first
    if (!forceRefresh) {
      const cached = this.getCachedModel(modelId);
      if (cached) {
        return {
          data: cached,
          success: true,
          loading: false
        };
      }
    }

    const response = await this.get<AIModel>(`/api/models/${encodeURIComponent(modelId)}`, {
      cache: !forceRefresh,
      cacheTTL: this.cacheTTL
    });

    // Cache successful response
    if (response.success && response.data) {
      this.setCachedModel(modelId, response.data);
    }

    return response;
  }

  /**
   * Get popular and trending models
   */
  async getPopularModels(): Promise<APIResponse<PopularModelsResponse>> {
    return this.get<PopularModelsResponse>('/api/models/popular', {
      cache: true,
      cacheTTL: 600000 // 10 minute cache
    });
  }

  /**
   * Compare multiple models
   */
  async compareModels(modelIds: string[]): Promise<APIResponse<ModelComparisonResponse>> {
    if (modelIds.length === 0) {
      return {
        data: { models: [], comparison: { metrics: [], data: {} } },
        success: false,
        loading: false,
        error: 'No models provided for comparison'
      };
    }

    if (modelIds.length > 10) {
      return {
        data: { models: [], comparison: { metrics: [], data: {} } },
        success: false,
        loading: false,
        error: 'Too many models for comparison (max 10)'
      };
    }

    return this.post<ModelComparisonResponse>('/api/models/compare', {
      modelIds,
      includeMetrics: true
    });
  }

  /**
   * Get models by provider
   */
  async getModelsByProvider(provider: string): Promise<APIResponse<ModelListResponse>> {
    return this.fetchModels({
      filters: { provider: provider as any },
      sortBy: 'name',
      sortDirection: 'asc'
    });
  }

  /**
   * Get model recommendations based on criteria
   */
  async getRecommendedModels(
    criteria: {
      useCase?: string;
      budget?: number;
      performance?: 'speed' | 'accuracy' | 'balanced';
      capabilities?: string[];
    }
  ): Promise<APIResponse<AIModel[]>> {
    return this.post<AIModel[]>('/api/models/recommend', criteria);
  }

  /**
   * Get model pricing information
   */
  async getModelPricing(modelId: string): Promise<APIResponse<{
    model: string;
    pricing: {
      input: number;
      output: number;
      unit: string;
    };
    estimatedCosts: {
      light: number;    // 1K requests
      medium: number;   // 10K requests
      heavy: number;    // 100K requests
    };
  }>> {
    return this.get(`/api/models/${encodeURIComponent(modelId)}/pricing`);
  }

  /**
   * Submit model feedback/rating
   */
  async submitModelFeedback(
    modelId: string,
    feedback: {
      rating: number; // 1-5
      comment?: string;
      categories?: string[];
    }
  ): Promise<APIResponse<{ success: boolean }>> {
    return this.post(`/api/models/${encodeURIComponent(modelId)}/feedback`, feedback);
  }

  /**
   * Get model usage statistics (if available)
   */
  async getModelStats(modelId: string): Promise<APIResponse<{
    usage: {
      daily: number[];
      weekly: number[];
      monthly: number[];
    };
    popularity: {
      rank: number;
      percentile: number;
    };
    performance: {
      avgResponseTime: number;
      successRate: number;
    };
  }>> {
    return this.get(`/api/models/${encodeURIComponent(modelId)}/stats`, {
      cache: true,
      cacheTTL: 3600000 // 1 hour cache
    });
  }

  /**
   * Normalize model data structure
   */
  private normalizeModelData(model: any): AIModel {
    // Ensure required fields exist
    const normalized: AIModel = {
      id: model.id || model.model_id || '',
      name: model.name || model.display_name || model.id || '',
      description: model.description || '',
      provider: model.provider || 'unknown',
      category: model.category || 'language',
      ...model
    };

    // Normalize pricing structure
    if (model.pricing) {
      normalized.pricing = {
        input: typeof model.pricing.input === 'number' ? model.pricing.input : undefined,
        output: typeof model.pricing.output === 'number' ? model.pricing.output : undefined,
        unit: model.pricing.unit || 'per_1k_tokens'
      };
    }

    // Ensure metrics are properly formatted
    if (model.metrics) {
      normalized.metrics = {
        accuracy: typeof model.metrics.accuracy === 'number' ? model.metrics.accuracy : undefined,
        speed: typeof model.metrics.speed === 'number' ? model.metrics.speed : undefined,
        cost: typeof model.metrics.cost === 'number' ? model.metrics.cost : undefined,
        popularity: typeof model.metrics.popularity === 'number' ? model.metrics.popularity : undefined,
        quality: typeof model.metrics.quality === 'number' ? model.metrics.quality : undefined,
        safety: typeof model.metrics.safety === 'number' ? model.metrics.safety : undefined,
        lastUpdated: model.metrics.lastUpdated || model.metrics.last_updated
      };
    }

    // Ensure boolean flags are properly typed
    normalized.streaming = Boolean(model.streaming);
    normalized.functionCalling = Boolean(model.functionCalling || model.function_calling);
    normalized.vision = Boolean(model.vision);
    normalized.available = model.available !== false; // Default to true

    return normalized;
  }

  /**
   * Get model from local cache
   */
  private getCachedModel(modelId: string): AIModel | null {
    const cached = this.modelCache.get(modelId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.modelCache.delete(modelId);
      return null;
    }

    return cached.data;
  }

  /**
   * Store model in local cache
   */
  private setCachedModel(modelId: string, model: AIModel): void {
    this.modelCache.set(modelId, {
      data: model,
      timestamp: Date.now()
    });
  }

  /**
   * Clear model cache
   */
  clearModelCache(): void {
    this.modelCache.clear();
  }

  /**
   * Get cache statistics
   */
  getModelCacheStats(): { size: number; models: string[] } {
    return {
      size: this.modelCache.size,
      models: Array.from(this.modelCache.keys())
    };
  }
}

/**
 * Create ModelService instance
 */
export const createModelService = (baseURL?: string, timeout?: number): ModelService => {
  return new ModelService(baseURL, timeout);
};

/**
 * Default ModelService instance
 */
export const modelService = createModelService();