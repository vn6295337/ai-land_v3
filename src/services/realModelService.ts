/**
 * Real Model Service Implementation
 *
 * This service provides actual API integration for fetching AI model data
 * from external sources and APIs.
 */

import { AIModel, APIResponse } from '../types/models';

interface ModelProvider {
  name: string;
  apiUrl: string;
  apiKey?: string;
  transform: (data: any) => AIModel[];
}

interface ModelServiceConfig {
  providers: ModelProvider[];
  cacheExpiry: number;
  maxRetries: number;
  timeout: number;
}

/**
 * Real implementation of ModelService with actual API calls
 */
export class RealModelService {
  private config: ModelServiceConfig;
  private cache: Map<string, { data: AIModel[]; timestamp: number }> = new Map();

  constructor(config?: Partial<ModelServiceConfig>) {
    this.config = {
      providers: [
        {
          name: 'huggingface',
          apiUrl: 'https://huggingface.co/api/models',
          transform: this.transformHuggingFaceModels
        },
        {
          name: 'openrouter',
          apiUrl: 'https://openrouter.ai/api/v1/models',
          transform: this.transformOpenRouterModels
        }
      ],
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      timeout: 10000,
      ...config
    };
  }

  /**
   * Fetch models from all configured providers
   */
  async fetchModels(): Promise<APIResponse<{ models: AIModel[] }>> {
    try {
      const cacheKey = 'all_models';
      const cached = this.cache.get(cacheKey);

      // Check cache validity
      if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
        return {
          success: true,
          data: { models: cached.data }
        };
      }

      // Fetch from all providers
      const results = await Promise.allSettled(
        this.config.providers.map(provider => this.fetchFromProvider(provider))
      );

      // Combine results
      const allModels: AIModel[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allModels.push(...result.value);
        } else {
          errors.push(`${this.config.providers[index].name}: ${result.reason.message}`);
        }
      });

      if (allModels.length === 0) {
        throw new Error(`Failed to fetch models from all providers: ${errors.join(', ')}`);
      }

      // Deduplicate and sort
      const uniqueModels = this.deduplicateModels(allModels);
      const sortedModels = uniqueModels.sort((a, b) => a.name.localeCompare(b.name));

      // Cache results
      this.cache.set(cacheKey, {
        data: sortedModels,
        timestamp: Date.now()
      });

      return {
        success: true,
        data: { models: sortedModels }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch models from a specific provider
   */
  private async fetchFromProvider(provider: ModelProvider): Promise<AIModel[]> {
    const response = await this.fetchWithRetry(provider.apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Models-Discovery/1.0',
        ...(provider.apiKey && { 'Authorization': `Bearer ${provider.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return provider.transform(data);
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      if (attempt < this.config.maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Transform HuggingFace API response to AIModel format
   */
  private transformHuggingFaceModels(data: any[]): AIModel[] {
    return data
      .filter(model => model.pipeline_tag && model.downloads > 100)
      .slice(0, 50) // Limit to top 50
      .map((model, index) => ({
        id: `hf-${model.id}`,
        name: model.id.split('/').pop() || model.id,
        description: model.description || `${model.pipeline_tag} model`,
        provider: 'huggingface',
        modelId: model.id,
        category: this.mapHuggingFacePipeline(model.pipeline_tag),
        cost: 0, // Most HuggingFace models are free
        contextLength: this.estimateContextLength(model.config),
        streaming: false,
        functionCalling: false,
        vision: model.pipeline_tag === 'image-classification' ||
                model.pipeline_tag === 'image-to-text' ||
                model.pipeline_tag === 'object-detection',
        lastUpdated: model.lastModified || new Date().toISOString(),
        availability: 'public',
        license: model.cardData?.license || 'unknown'
      }));
  }

  /**
   * Transform OpenRouter API response to AIModel format
   */
  private transformOpenRouterModels(data: { data: any[] }): AIModel[] {
    return data.data.map((model, index) => ({
      id: `or-${model.id}`,
      name: model.name || model.id,
      description: model.description || `Model from ${model.id.split('/')[0]}`,
      provider: model.id.split('/')[0] || 'openrouter',
      modelId: model.id,
      category: this.mapOpenRouterCategory(model.id),
      cost: model.pricing?.prompt || 0,
      contextLength: model.context_length || 4096,
      streaming: true,
      functionCalling: model.function_calling || false,
      vision: model.modality?.includes('image') || false,
      lastUpdated: new Date().toISOString(),
      availability: 'public',
      license: 'proprietary'
    }));
  }

  /**
   * Map HuggingFace pipeline tags to our categories
   */
  private mapHuggingFacePipeline(pipeline: string): string {
    const mapping: Record<string, string> = {
      'text-generation': 'conversational',
      'text2text-generation': 'conversational',
      'conversational': 'conversational',
      'question-answering': 'conversational',
      'summarization': 'text_processing',
      'translation': 'text_processing',
      'text-classification': 'text_processing',
      'token-classification': 'text_processing',
      'fill-mask': 'text_processing',
      'image-classification': 'vision',
      'image-to-text': 'vision',
      'object-detection': 'vision',
      'image-segmentation': 'vision',
      'text-to-image': 'image_generation',
      'text-to-speech': 'audio',
      'automatic-speech-recognition': 'audio',
      'audio-classification': 'audio'
    };

    return mapping[pipeline] || 'other';
  }

  /**
   * Map OpenRouter model IDs to categories
   */
  private mapOpenRouterCategory(modelId: string): string {
    if (modelId.includes('gpt') || modelId.includes('claude')) {
      return 'conversational';
    }
    if (modelId.includes('code') || modelId.includes('copilot')) {
      return 'code_generation';
    }
    if (modelId.includes('dall-e') || modelId.includes('midjourney')) {
      return 'image_generation';
    }
    if (modelId.includes('whisper')) {
      return 'audio';
    }
    return 'conversational';
  }

  /**
   * Estimate context length from model config
   */
  private estimateContextLength(config: any): number {
    if (!config) return 2048;

    return config.max_position_embeddings ||
           config.n_positions ||
           config.max_sequence_length ||
           2048;
  }

  /**
   * Remove duplicate models based on name and provider
   */
  private deduplicateModels(models: AIModel[]): AIModel[] {
    const seen = new Set<string>();
    return models.filter(model => {
      const key = `${model.provider}-${model.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get specific model by ID
   */
  async getModel(id: string): Promise<APIResponse<AIModel>> {
    try {
      const modelsResponse = await this.fetchModels();
      if (!modelsResponse.success) {
        return modelsResponse as APIResponse<AIModel>;
      }

      const model = modelsResponse.data.models.find(m => m.id === id);
      if (!model) {
        return {
          success: false,
          error: `Model with ID ${id} not found`
        };
      }

      return {
        success: true,
        data: model
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Search models by query
   */
  async searchModels(query: string): Promise<APIResponse<{ models: AIModel[] }>> {
    try {
      const modelsResponse = await this.fetchModels();
      if (!modelsResponse.success) {
        return modelsResponse;
      }

      const normalizedQuery = query.toLowerCase();
      const filteredModels = modelsResponse.data.models.filter(model =>
        model.name.toLowerCase().includes(normalizedQuery) ||
        model.description.toLowerCase().includes(normalizedQuery) ||
        model.provider.toLowerCase().includes(normalizedQuery) ||
        model.category.toLowerCase().includes(normalizedQuery)
      );

      return {
        success: true,
        data: { models: filteredModels }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      oldestEntry: Math.min(...Array.from(this.cache.values()).map(v => v.timestamp)),
      newestEntry: Math.max(...Array.from(this.cache.values()).map(v => v.timestamp))
    };
  }
}

// Export singleton instance
export const realModelService = new RealModelService();
export default realModelService;