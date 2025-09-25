/**
 * Sort Service
 *
 * This module provides comprehensive sorting functionality for AI models,
 * supporting multiple sort criteria and efficient sorting algorithms.
 */

import { AIModel, SortOptions, SortDirection } from '../types/models';

/**
 * Sort performance metrics
 */
interface SortPerformance {
  executionTime: number;
  modelsProcessed: number;
  sortField: string;
  direction: SortDirection;
}

/**
 * Multi-sort criteria
 */
interface MultiSortCriteria {
  field: SortOptions;
  direction: SortDirection;
  priority: number; // Higher number = higher priority
}

/**
 * Custom sort function type
 */
type CustomSortFunction = (a: AIModel, b: AIModel) => number;

/**
 * SortService class for model sorting operations
 */
export class SortService {
  private sortCache = new Map<string, { result: AIModel[]; timestamp: number }>();
  private readonly cacheTTL = 30000; // 30 seconds cache

  /**
   * Sort models by specified criteria
   */
  sortModels(
    models: AIModel[],
    sortBy: SortOptions,
    direction: SortDirection = 'asc'
  ): AIModel[] {
    if (!models || models.length === 0) {
      return [];
    }

    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(models, sortBy, direction);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sorted = [...models].sort((a, b) => {
      const comparison = this.compareModels(a, b, sortBy);
      return direction === 'asc' ? comparison : -comparison;
    });

    // Cache the result
    this.setCache(cacheKey, sorted);

    const endTime = performance.now();
    this.logSortPerformance({
      executionTime: endTime - startTime,
      modelsProcessed: models.length,
      sortField: sortBy,
      direction
    });

    return sorted;
  }

  /**
   * Sort models by multiple criteria
   */
  sortModelsByMultipleCriteria(
    models: AIModel[],
    criteria: MultiSortCriteria[]
  ): AIModel[] {
    if (!models || models.length === 0 || !criteria || criteria.length === 0) {
      return models;
    }

    // Sort criteria by priority (highest first)
    const sortedCriteria = [...criteria].sort((a, b) => b.priority - a.priority);

    return [...models].sort((a, b) => {
      for (const criterion of sortedCriteria) {
        const comparison = this.compareModels(a, b, criterion.field);
        const result = criterion.direction === 'asc' ? comparison : -comparison;

        if (result !== 0) {
          return result;
        }
      }
      return 0;
    });
  }

  /**
   * Sort models with custom sort function
   */
  sortModelsCustom(models: AIModel[], sortFunction: CustomSortFunction): AIModel[] {
    if (!models || models.length === 0) {
      return [];
    }

    return [...models].sort(sortFunction);
  }

  /**
   * Compare two models based on sort field
   */
  private compareModels(a: AIModel, b: AIModel, sortBy: SortOptions): number {
    switch (sortBy) {
      case 'name':
        return this.compareStrings(a.name, b.name);

      case 'provider':
        return this.compareStrings(a.provider, b.provider);

      case 'category':
        return this.compareStrings(a.category, b.category);

      case 'accuracy':
        return this.compareNumbers(
          a.metrics?.accuracy,
          b.metrics?.accuracy
        );

      case 'speed':
        return this.compareNumbers(
          a.metrics?.speed,
          b.metrics?.speed
        );

      case 'cost':
        return this.compareNumbers(
          a.pricing?.input,
          b.pricing?.input
        );

      case 'popularity':
        return this.compareNumbers(
          a.metrics?.popularity,
          b.metrics?.popularity
        );

      case 'parameters':
        return this.compareNumbers(a.parameters, b.parameters);

      case 'releaseDate':
        return this.compareDates(a.releaseDate, b.releaseDate);

      case 'updatedAt':
        return this.compareDates(a.updatedAt, b.updatedAt);

      default:
        return 0;
    }
  }

  /**
   * Compare two strings
   */
  private compareStrings(a?: string, b?: string): number {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;

    return a.toLowerCase().localeCompare(b.toLowerCase());
  }

  /**
   * Compare two numbers
   */
  private compareNumbers(a?: number, b?: number): number {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;

    return a - b;
  }

  /**
   * Compare two dates
   */
  private compareDates(a?: string, b?: string): number {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;

    const dateA = new Date(a);
    const dateB = new Date(b);

    // Handle invalid dates
    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;

    return dateA.getTime() - dateB.getTime();
  }

  /**
   * Get available sort options with their display names
   */
  getAvailableSortOptions(): Array<{
    value: SortOptions;
    label: string;
    description: string;
  }> {
    return [
      {
        value: 'name',
        label: 'Name',
        description: 'Sort alphabetically by model name'
      },
      {
        value: 'provider',
        label: 'Provider',
        description: 'Sort by AI provider/company'
      },
      {
        value: 'category',
        label: 'Category',
        description: 'Sort by model category (language, multimodal, etc.)'
      },
      {
        value: 'accuracy',
        label: 'Accuracy',
        description: 'Sort by accuracy rating'
      },
      {
        value: 'speed',
        label: 'Speed',
        description: 'Sort by response speed rating'
      },
      {
        value: 'cost',
        label: 'Cost',
        description: 'Sort by cost per token'
      },
      {
        value: 'popularity',
        label: 'Popularity',
        description: 'Sort by community popularity'
      },
      {
        value: 'parameters',
        label: 'Parameters',
        description: 'Sort by model parameter count'
      },
      {
        value: 'releaseDate',
        label: 'Release Date',
        description: 'Sort by model release date'
      },
      {
        value: 'updatedAt',
        label: 'Last Updated',
        description: 'Sort by last update time'
      }
    ];
  }

  /**
   * Check if a sort field is available for the given models
   */
  isSortFieldAvailable(models: AIModel[], sortBy: SortOptions): boolean {
    if (!models || models.length === 0) {
      return false;
    }

    switch (sortBy) {
      case 'name':
      case 'provider':
      case 'category':
        return true; // These are always available

      case 'accuracy':
        return models.some(m => m.metrics?.accuracy !== undefined);

      case 'speed':
        return models.some(m => m.metrics?.speed !== undefined);

      case 'cost':
        return models.some(m => m.pricing?.input !== undefined);

      case 'popularity':
        return models.some(m => m.metrics?.popularity !== undefined);

      case 'parameters':
        return models.some(m => m.parameters !== undefined);

      case 'releaseDate':
        return models.some(m => m.releaseDate !== undefined);

      case 'updatedAt':
        return models.some(m => m.updatedAt !== undefined);

      default:
        return false;
    }
  }

  /**
   * Get sort statistics for given models
   */
  getSortStats(models: AIModel[], sortBy: SortOptions): {
    totalModels: number;
    modelsWithData: number;
    modelsWithoutData: number;
    dataAvailabilityPercentage: number;
  } {
    if (!models || models.length === 0) {
      return {
        totalModels: 0,
        modelsWithData: 0,
        modelsWithoutData: 0,
        dataAvailabilityPercentage: 0
      };
    }

    let modelsWithData = 0;

    switch (sortBy) {
      case 'name':
      case 'provider':
      case 'category':
        modelsWithData = models.length; // These are always available
        break;

      case 'accuracy':
        modelsWithData = models.filter(m => m.metrics?.accuracy !== undefined).length;
        break;

      case 'speed':
        modelsWithData = models.filter(m => m.metrics?.speed !== undefined).length;
        break;

      case 'cost':
        modelsWithData = models.filter(m => m.pricing?.input !== undefined).length;
        break;

      case 'popularity':
        modelsWithData = models.filter(m => m.metrics?.popularity !== undefined).length;
        break;

      case 'parameters':
        modelsWithData = models.filter(m => m.parameters !== undefined).length;
        break;

      case 'releaseDate':
        modelsWithData = models.filter(m => m.releaseDate !== undefined).length;
        break;

      case 'updatedAt':
        modelsWithData = models.filter(m => m.updatedAt !== undefined).length;
        break;
    }

    const modelsWithoutData = models.length - modelsWithData;
    const dataAvailabilityPercentage = (modelsWithData / models.length) * 100;

    return {
      totalModels: models.length,
      modelsWithData,
      modelsWithoutData,
      dataAvailabilityPercentage
    };
  }

  /**
   * Create a stable sort (maintains relative order for equal elements)
   */
  stableSort(
    models: AIModel[],
    sortBy: SortOptions,
    direction: SortDirection = 'asc'
  ): AIModel[] {
    return models
      .map((model, index) => ({ model, index }))
      .sort((a, b) => {
        const comparison = this.compareModels(a.model, b.model, sortBy);
        if (comparison === 0) {
          return a.index - b.index; // Maintain original order for equal elements
        }
        return direction === 'asc' ? comparison : -comparison;
      })
      .map(item => item.model);
  }

  /**
   * Generate cache key for sort results
   */
  private generateCacheKey(
    models: AIModel[],
    sortBy: SortOptions,
    direction: SortDirection
  ): string {
    const modelIds = models.map(m => m.id).join(',');
    return btoa(`${sortBy}-${direction}-${modelIds}`);
  }

  /**
   * Get cached sort result
   */
  private getFromCache(key: string): AIModel[] | null {
    const cached = this.sortCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.sortCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache sort result
   */
  private setCache(key: string, result: AIModel[]): void {
    this.sortCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Log sort performance metrics
   */
  private logSortPerformance(metrics: SortPerformance): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sort Performance:', metrics);
    }
  }

  /**
   * Clear sort cache
   */
  clearCache(): void {
    this.sortCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.sortCache.size,
      keys: Array.from(this.sortCache.keys()).slice(0, 10) // First 10 keys only
    };
  }
}

/**
 * Create SortService instance
 */
export const createSortService = (): SortService => {
  return new SortService();
};

/**
 * Default SortService instance
 */
export const sortService = createSortService();