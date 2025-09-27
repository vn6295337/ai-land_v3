/**
 * Model Service Layer
 *
 * This module provides specialized data methods for AI model operations,
 * fetching from Supabase ai_models_main table while maintaining security abstraction.
 */

import { supabase } from '../integrations/supabase/client';
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
 * Fetches data from Supabase ai_models_main table with security abstraction
 */
export class ModelService {
  private modelCache = new Map<string, { data: AIModel; timestamp: number }>();
  private readonly cacheTTL = 300000; // 5 minutes
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Set up auto-refresh every 5 minutes to match ai-land behavior
    this.refreshInterval = setInterval(() => {
      this.clearModelCache();
    }, this.cacheTTL);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.clearModelCache();
  }

  /**
   * Fetch all available models from Supabase ai_models_main table
   */
  async fetchModels(params: ModelSearchParams = {}): Promise<APIResponse<ModelListResponse>> {
    try {
      console.log('Fetching model data from ai_models_main...');

      // Build Supabase query
      let query = supabase
        .from('ai_models_main')
        .select('*');

      // Apply text search if provided
      if (params.query) {
        query = query.or(`human_readable_name.ilike.%${params.query}%,inference_provider.ilike.%${params.query}%,model_provider.ilike.%${params.query}%`);
      }

      // Apply filters if provided
      if (params.filters) {
        if (params.filters.provider) {
          const providers = Array.isArray(params.filters.provider)
            ? params.filters.provider
            : [params.filters.provider];
          query = query.in('inference_provider', providers);
        }
      }

      // Apply sorting
      const sortField = this.mapSortField(params.sortBy || 'name');
      query = query.order(sortField, { ascending: params.sortDirection === 'asc' });

      // Execute query
      const response = await query;

      if (response.error) {
        console.error('Supabase error:', response.error);
        return {
          data: { models: [], total: 0, page: 1, limit: 50, hasMore: false },
          success: false,
          loading: false,
          error: `Supabase error: ${response.error.message}`
        };
      }

      if (!response.data || response.data.length === 0) {
        console.warn('No data returned from Supabase');
        return {
          data: { models: [], total: 0, page: 1, limit: 50, hasMore: false },
          success: false,
          loading: false,
          error: 'No data available from ai_models_main table'
        };
      }

      console.log(`Successfully fetched ${response.data.length} records`);

      // Transform Supabase data to AIModel format
      const models = response.data.map(this.transformSupabaseToAIModel);

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedModels = models.slice(startIndex, endIndex);

      return {
        data: {
          models: paginatedModels,
          total: models.length,
          page,
          limit,
          hasMore: endIndex < models.length,
          filters: params.filters,
          sort: {
            field: params.sortBy || 'name',
            direction: params.sortDirection || 'asc'
          }
        },
        success: true,
        loading: false
      };

    } catch (error: any) {
      console.error('Error fetching models:', error);
      return {
        data: { models: [], total: 0, page: 1, limit: 50, hasMore: false },
        success: false,
        loading: false,
        error: error.message || 'Failed to fetch models'
      };
    }
  }

  /**
   * Search models with advanced query capabilities
   */
  async searchModels(
    query: string,
    filters?: FilterCriteria,
    options: { fuzzy?: boolean; threshold?: number } = {}
  ): Promise<APIResponse<ModelListResponse>> {
    return this.fetchModels({
      query,
      filters,
      page: 1,
      limit: 100
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

    try {
      const response = await supabase
        .from('ai_models_main')
        .select('*')
        .eq('id', parseInt(modelId))
        .single();

      if (response.error) {
        return {
          data: null as any,
          success: false,
          loading: false,
          error: `Model not found: ${response.error.message}`
        };
      }

      const model = this.transformSupabaseToAIModel(response.data);

      // Cache successful response
      this.setCachedModel(modelId, model);

      return {
        data: model,
        success: true,
        loading: false
      };

    } catch (error: any) {
      return {
        data: null as any,
        success: false,
        loading: false,
        error: error.message || 'Failed to fetch model details'
      };
    }
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
   * Transform Supabase ai_models_main data to AIModel format
   */
  private transformSupabaseToAIModel = (model: any): AIModel => {
    return {
      id: model.id?.toString() || '',
      name: model.human_readable_name || 'Unknown',
      description: '', // Not available in ai_models_main
      provider: model.inference_provider || 'Unknown',
      category: 'language', // Default category

      // Map ai_models_main fields to AIModel structure
      inferenceProvider: model.inference_provider || 'Unknown',
      modelProvider: model.model_provider || 'Unknown',
      modelName: model.human_readable_name || 'Unknown',
      country: model.model_provider_country || 'Unknown',
      officialUrl: model.official_url || '',
      inputModalities: model.input_modalities || 'Unknown',
      outputModalities: model.output_modalities || 'Unknown',
      license: model.license_name || 'N/A',
      licenseUrl: model.license_url || '',
      licenseInfo: model.license_info_text || '',
      licenseInfoUrl: model.license_info_url || '',
      rateLimits: model.rate_limits || 'N/A',
      apiAccess: model.provider_api_access || 'N/A',
      createdAt: model.created_at || '',
      updatedAt: model.updated_at || '',

      // Default values for AIModel interface
      streaming: false,
      functionCalling: false,
      vision: model.input_modalities?.toLowerCase().includes('vision') || false,
      available: true,

      // Pricing information (not available in ai_models_main)
      pricing: {
        input: undefined,
        output: undefined,
        unit: 'per_1k_tokens'
      },

      // Metrics (not available in ai_models_main)
      metrics: {
        accuracy: undefined,
        speed: undefined,
        cost: undefined,
        popularity: undefined,
        quality: undefined,
        safety: undefined,
        lastUpdated: model.updated_at
      }
    };
  };

  /**
   * Map sort field names to Supabase column names
   */
  private mapSortField(sortBy: SortOptions): string {
    const fieldMap: Record<string, string> = {
      'name': 'human_readable_name',
      'provider': 'inference_provider',
      'modelProvider': 'model_provider',
      'country': 'model_provider_country',
      'license': 'license_name',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    };

    return fieldMap[sortBy] || 'human_readable_name';
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
export const createModelService = (): ModelService => {
  return new ModelService();
};

/**
 * Default ModelService instance
 */
export const modelService = createModelService();