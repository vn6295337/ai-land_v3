/**
 * Filter Service
 *
 * This module provides comprehensive filtering functionality for AI models,
 * supporting complex criteria and efficient filtering algorithms.
 */

import { AIModel, FilterCriteria, ModelProvider, ModelCategory } from '../types/models';

/**
 * Filter statistics interface
 */
interface FilterStats {
  totalModels: number;
  filteredModels: number;
  filtersApplied: string[];
  filterTime: number;
}

/**
 * Filter performance metrics
 */
interface FilterPerformance {
  executionTime: number;
  modelsProcessed: number;
  filtersApplied: number;
  cacheHits: number;
}

/**
 * FilterService class for model filtering operations
 */
export class FilterService {
  private filterCache = new Map<string, { result: AIModel[]; timestamp: number }>();
  private readonly cacheTTL = 60000; // 1 minute cache

  /**
   * Apply filter criteria to a list of models
   */
  applyFilters(models: AIModel[], criteria: FilterCriteria): AIModel[] {
    if (!models || models.length === 0) {
      return [];
    }

    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(models, criteria);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let filteredModels = [...models];

    // Apply each filter criterion
    if (criteria.provider) {
      filteredModels = this.filterByProvider(filteredModels, criteria.provider);
    }

    if (criteria.category) {
      filteredModels = this.filterByCategory(filteredModels, criteria.category);
    }

    if (criteria.searchTerm) {
      filteredModels = this.filterBySearchTerm(filteredModels, criteria.searchTerm);
    }

    if (criteria.minAccuracy !== undefined) {
      filteredModels = this.filterByMinAccuracy(filteredModels, criteria.minAccuracy);
    }

    if (criteria.maxCost !== undefined) {
      filteredModels = this.filterByMaxCost(filteredModels, criteria.maxCost);
    }

    if (criteria.minParameters !== undefined) {
      filteredModels = this.filterByMinParameters(filteredModels, criteria.minParameters);
    }

    if (criteria.maxParameters !== undefined) {
      filteredModels = this.filterByMaxParameters(filteredModels, criteria.maxParameters);
    }

    if (criteria.minContextWindow !== undefined) {
      filteredModels = this.filterByMinContextWindow(filteredModels, criteria.minContextWindow);
    }

    if (criteria.capabilities) {
      filteredModels = this.filterByCapabilities(filteredModels, criteria.capabilities);
    }

    if (criteria.availableOnly) {
      filteredModels = this.filterByAvailability(filteredModels, criteria.availableOnly);
    }

    if (criteria.dateRange) {
      filteredModels = this.filterByDateRange(filteredModels, criteria.dateRange);
    }

    // Apply new column-specific filters for ai_models_main
    if (criteria.inferenceProviders && criteria.inferenceProviders.length > 0) {
      filteredModels = this.filterByInferenceProviders(filteredModels, criteria.inferenceProviders);
    }

    if (criteria.modelProviders && criteria.modelProviders.length > 0) {
      filteredModels = this.filterByModelProviders(filteredModels, criteria.modelProviders);
    }

    if (criteria.countries && criteria.countries.length > 0) {
      filteredModels = this.filterByCountries(filteredModels, criteria.countries);
    }

    if (criteria.inputModalities && criteria.inputModalities.length > 0) {
      filteredModels = this.filterByInputModalities(filteredModels, criteria.inputModalities);
    }

    if (criteria.outputModalities && criteria.outputModalities.length > 0) {
      filteredModels = this.filterByOutputModalities(filteredModels, criteria.outputModalities);
    }

    if (criteria.licenses && criteria.licenses.length > 0) {
      filteredModels = this.filterByLicenses(filteredModels, criteria.licenses);
    }

    if (criteria.rateLimits && criteria.rateLimits.length > 0) {
      filteredModels = this.filterByRateLimits(filteredModels, criteria.rateLimits);
    }

    if (criteria.freeOnly) {
      filteredModels = this.filterByFreeOnly(filteredModels);
    }

    // Cache the result
    this.setCache(cacheKey, filteredModels);

    const endTime = performance.now();
    this.logFilterPerformance({
      executionTime: endTime - startTime,
      modelsProcessed: models.length,
      filtersApplied: this.countActiveFilters(criteria),
      cacheHits: cached ? 1 : 0
    });

    return filteredModels;
  }

  /**
   * Filter by provider(s)
   */
  private filterByProvider(models: AIModel[], provider: ModelProvider | ModelProvider[]): AIModel[] {
    const providers = Array.isArray(provider) ? provider : [provider];
    return models.filter(model => providers.includes(model.provider));
  }

  /**
   * Filter by category/categories
   */
  private filterByCategory(models: AIModel[], category: ModelCategory | ModelCategory[]): AIModel[] {
    const categories = Array.isArray(category) ? category : [category];
    return models.filter(model => categories.includes(model.category));
  }

  /**
   * Filter by search term (name, description, provider)
   */
  private filterBySearchTerm(models: AIModel[], searchTerm: string): AIModel[] {
    if (!searchTerm.trim()) {
      return models;
    }

    const term = searchTerm.toLowerCase().trim();
    const terms = term.split(/\s+/); // Split by whitespace for multi-word search

    return models.filter(model => {
      const searchableText = [
        model.name,
        model.description,
        model.provider,
        model.modelId,
        model.category
      ].join(' ').toLowerCase();

      // All terms must be found (AND logic)
      return terms.every(searchTerm => searchableText.includes(searchTerm));
    });
  }

  /**
   * Filter by minimum accuracy threshold
   */
  private filterByMinAccuracy(models: AIModel[], minAccuracy: number): AIModel[] {
    return models.filter(model => {
      const accuracy = model.metrics?.accuracy;
      return accuracy !== undefined && accuracy >= minAccuracy;
    });
  }

  /**
   * Filter by maximum cost threshold
   */
  private filterByMaxCost(models: AIModel[], maxCost: number): AIModel[] {
    return models.filter(model => {
      const cost = model.pricing?.input;
      if (cost === undefined) return true; // Include models without pricing info
      return cost <= maxCost;
    });
  }

  /**
   * Filter by minimum parameter count
   */
  private filterByMinParameters(models: AIModel[], minParameters: number): AIModel[] {
    return models.filter(model => {
      const parameters = model.parameters;
      return parameters !== undefined && parameters >= minParameters;
    });
  }

  /**
   * Filter by maximum parameter count
   */
  private filterByMaxParameters(models: AIModel[], maxParameters: number): AIModel[] {
    return models.filter(model => {
      const parameters = model.parameters;
      if (parameters === undefined) return true; // Include models without parameter info
      return parameters <= maxParameters;
    });
  }

  /**
   * Filter by minimum context window size
   */
  private filterByMinContextWindow(models: AIModel[], minContextWindow: number): AIModel[] {
    return models.filter(model => {
      const contextWindow = model.contextWindow;
      return contextWindow !== undefined && contextWindow >= minContextWindow;
    });
  }

  /**
   * Filter by required capabilities
   */
  private filterByCapabilities(
    models: AIModel[],
    capabilities: { streaming?: boolean; functionCalling?: boolean; vision?: boolean }
  ): AIModel[] {
    return models.filter(model => {
      let matches = true;

      if (capabilities.streaming !== undefined) {
        matches = matches && (model.streaming === capabilities.streaming);
      }

      if (capabilities.functionCalling !== undefined) {
        matches = matches && (model.functionCalling === capabilities.functionCalling);
      }

      if (capabilities.vision !== undefined) {
        matches = matches && (model.vision === capabilities.vision);
      }

      return matches;
    });
  }

  /**
   * Filter by availability status
   */
  private filterByAvailability(models: AIModel[], availableOnly: boolean): AIModel[] {
    if (!availableOnly) {
      return models;
    }

    return models.filter(model => model.available !== false);
  }

  /**
   * Filter by date range
   */
  private filterByDateRange(
    models: AIModel[],
    dateRange: { from?: string; to?: string }
  ): AIModel[] {
    return models.filter(model => {
      const releaseDate = model.releaseDate;
      if (!releaseDate) return true; // Include models without release date

      const modelDate = new Date(releaseDate);

      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        if (modelDate < fromDate) return false;
      }

      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        if (modelDate > toDate) return false;
      }

      return true;
    });
  }

  /**
   * Get available filter values from models array
   */
  getAvailableFilterValues(models: AIModel[]): {
    providers: ModelProvider[];
    categories: ModelCategory[];
    parameterRanges: { min: number; max: number } | null;
    contextWindowRanges: { min: number; max: number } | null;
    accuracyRange: { min: number; max: number } | null;
    costRange: { min: number; max: number } | null;
    capabilities: {
      streaming: number;
      functionCalling: number;
      vision: number;
    };
  } {
    if (!models || models.length === 0) {
      return {
        providers: [],
        categories: [],
        parameterRanges: null,
        contextWindowRanges: null,
        accuracyRange: null,
        costRange: null,
        capabilities: { streaming: 0, functionCalling: 0, vision: 0 }
      };
    }

    // Extract unique providers and categories
    const providers = [...new Set(models.map(m => m.provider))];
    const categories = [...new Set(models.map(m => m.category))];

    // Calculate parameter ranges
    const parameters = models
      .map(m => m.parameters)
      .filter((p): p is number => p !== undefined);
    const parameterRanges = parameters.length > 0
      ? { min: Math.min(...parameters), max: Math.max(...parameters) }
      : null;

    // Calculate context window ranges
    const contextWindows = models
      .map(m => m.contextWindow)
      .filter((c): c is number => c !== undefined);
    const contextWindowRanges = contextWindows.length > 0
      ? { min: Math.min(...contextWindows), max: Math.max(...contextWindows) }
      : null;

    // Calculate accuracy range
    const accuracies = models
      .map(m => m.metrics?.accuracy)
      .filter((a): a is number => a !== undefined);
    const accuracyRange = accuracies.length > 0
      ? { min: Math.min(...accuracies), max: Math.max(...accuracies) }
      : null;

    // Calculate cost range
    const costs = models
      .map(m => m.pricing?.input)
      .filter((c): c is number => c !== undefined);
    const costRange = costs.length > 0
      ? { min: Math.min(...costs), max: Math.max(...costs) }
      : null;

    // Count capabilities
    const capabilities = {
      streaming: models.filter(m => m.streaming).length,
      functionCalling: models.filter(m => m.functionCalling).length,
      vision: models.filter(m => m.vision).length
    };

    return {
      providers,
      categories,
      parameterRanges,
      contextWindowRanges,
      accuracyRange,
      costRange,
      capabilities
    };
  }

  /**
   * Get filter statistics
   */
  getFilterStats(
    originalModels: AIModel[],
    filteredModels: AIModel[],
    criteria: FilterCriteria,
    filterTime: number
  ): FilterStats {
    return {
      totalModels: originalModels.length,
      filteredModels: filteredModels.length,
      filtersApplied: this.getActiveFilterNames(criteria),
      filterTime
    };
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(criteria: FilterCriteria): boolean {
    return this.countActiveFilters(criteria) > 0;
  }

  /**
   * Count active filters
   */
  private countActiveFilters(criteria: FilterCriteria): number {
    let count = 0;

    if (criteria.provider) count++;
    if (criteria.category) count++;
    if (criteria.searchTerm) count++;
    if (criteria.minAccuracy !== undefined) count++;
    if (criteria.maxCost !== undefined) count++;
    if (criteria.minParameters !== undefined) count++;
    if (criteria.maxParameters !== undefined) count++;
    if (criteria.minContextWindow !== undefined) count++;
    if (criteria.capabilities) count++;
    if (criteria.availableOnly) count++;
    if (criteria.dateRange) count++;
    if (criteria.inferenceProviders && criteria.inferenceProviders.length > 0) count++;
    if (criteria.modelProviders && criteria.modelProviders.length > 0) count++;
    if (criteria.countries && criteria.countries.length > 0) count++;
    if (criteria.inputModalities && criteria.inputModalities.length > 0) count++;
    if (criteria.outputModalities && criteria.outputModalities.length > 0) count++;
    if (criteria.licenses && criteria.licenses.length > 0) count++;
    if (criteria.rateLimits && criteria.rateLimits.length > 0) count++;
    if (criteria.freeOnly) count++;

    return count;
  }

  /**
   * Get names of active filters
   */
  private getActiveFilterNames(criteria: FilterCriteria): string[] {
    const activeFilters: string[] = [];

    if (criteria.provider) activeFilters.push('provider');
    if (criteria.category) activeFilters.push('category');
    if (criteria.searchTerm) activeFilters.push('search');
    if (criteria.minAccuracy !== undefined) activeFilters.push('minAccuracy');
    if (criteria.maxCost !== undefined) activeFilters.push('maxCost');
    if (criteria.minParameters !== undefined) activeFilters.push('minParameters');
    if (criteria.maxParameters !== undefined) activeFilters.push('maxParameters');
    if (criteria.minContextWindow !== undefined) activeFilters.push('minContextWindow');
    if (criteria.capabilities) activeFilters.push('capabilities');
    if (criteria.availableOnly) activeFilters.push('availableOnly');
    if (criteria.dateRange) activeFilters.push('dateRange');
    if (criteria.inferenceProviders && criteria.inferenceProviders.length > 0) activeFilters.push('inferenceProviders');
    if (criteria.modelProviders && criteria.modelProviders.length > 0) activeFilters.push('modelProviders');
    if (criteria.countries && criteria.countries.length > 0) activeFilters.push('countries');
    if (criteria.inputModalities && criteria.inputModalities.length > 0) activeFilters.push('inputModalities');
    if (criteria.outputModalities && criteria.outputModalities.length > 0) activeFilters.push('outputModalities');
    if (criteria.licenses && criteria.licenses.length > 0) activeFilters.push('licenses');
    if (criteria.rateLimits && criteria.rateLimits.length > 0) activeFilters.push('rateLimits');
    if (criteria.freeOnly) activeFilters.push('freeOnly');

    return activeFilters;
  }

  /**
   * Generate cache key for filter results
   */
  private generateCacheKey(models: AIModel[], criteria: FilterCriteria): string {
    const modelIds = models.map(m => m.id).sort().join(',');
    const criteriaStr = JSON.stringify(criteria);
    return btoa(modelIds + criteriaStr);
  }

  /**
   * Get cached filter result
   */
  private getFromCache(key: string): AIModel[] | null {
    const cached = this.filterCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.filterCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache filter result
   */
  private setCache(key: string, result: AIModel[]): void {
    this.filterCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Log filter performance metrics
   */
  private logFilterPerformance(metrics: FilterPerformance): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Filter Performance:', metrics);
    }
  }

  /**
   * Clear filter cache
   */
  clearCache(): void {
    this.filterCache.clear();
  }

  /**
   * Filter by inference providers
   */
  private filterByInferenceProviders(models: AIModel[], providers: string[]): AIModel[] {
    return models.filter(model => {
      const modelProvider = model.inferenceProvider || model.provider || 'Unknown';
      return providers.includes(modelProvider);
    });
  }

  /**
   * Filter by model providers
   */
  private filterByModelProviders(models: AIModel[], providers: string[]): AIModel[] {
    return models.filter(model => {
      const modelProvider = model.modelProvider || 'Unknown';
      return providers.includes(modelProvider);
    });
  }

  /**
   * Filter by countries
   */
  private filterByCountries(models: AIModel[], countries: string[]): AIModel[] {
    return models.filter(model => {
      const country = model.country || 'Unknown';
      return countries.includes(country);
    });
  }

  /**
   * Filter by input modalities
   */
  private filterByInputModalities(models: AIModel[], modalities: string[]): AIModel[] {
    return models.filter(model => {
      const inputModalities = model.inputModalities || 'Unknown';
      return modalities.includes(inputModalities);
    });
  }

  /**
   * Filter by output modalities
   */
  private filterByOutputModalities(models: AIModel[], modalities: string[]): AIModel[] {
    return models.filter(model => {
      const outputModalities = model.outputModalities || 'Unknown';
      return modalities.includes(outputModalities);
    });
  }

  /**
   * Filter by licenses
   */
  private filterByLicenses(models: AIModel[], licenses: string[]): AIModel[] {
    return models.filter(model => {
      const license = model.license || 'N/A';
      return licenses.includes(license);
    });
  }

  /**
   * Filter by rate limits
   */
  private filterByRateLimits(models: AIModel[], rateLimits: string[]): AIModel[] {
    return models.filter(model => {
      const rateLimit = model.rateLimits || 'N/A';
      return rateLimits.includes(rateLimit);
    });
  }

  /**
   * Filter by free only models
   */
  private filterByFreeOnly(models: AIModel[]): AIModel[] {
    return models.filter(model => {
      // Check various fields that might indicate "free" status
      const apiAccess = (model.apiAccess || '').toLowerCase();
      const license = (model.license || '').toLowerCase();
      const rateLimits = (model.rateLimits || '').toLowerCase();

      // Consider a model "free" if it doesn't require API key or has free tier indicators
      return (
        !apiAccess.includes('api key') ||
        apiAccess.includes('free') ||
        license.includes('free') ||
        license.includes('open') ||
        rateLimits.includes('free')
      );
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.filterCache.size,
      keys: Array.from(this.filterCache.keys()).slice(0, 10) // First 10 keys only
    };
  }
}

/**
 * Create FilterService instance
 */
export const createFilterService = (): FilterService => {
  return new FilterService();
};

/**
 * Default FilterService instance
 */
export const filterService = createFilterService();