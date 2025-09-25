/**
 * @file Tests for model filtering and search functionality (Test requirement 55)
 *
 * Tests checkpoint 113: FilterService with applyFilters method
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService } from '../filter';
import type { AIModel, FilterCriteria } from '../../types/models';

describe('FilterService - Model Filtering and Search Functionality', () => {
  let filterService: FilterService;
  let testModels: AIModel[];

  beforeEach(() => {
    filterService = new FilterService();

    // Create test models with varied properties
    testModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Advanced language model from OpenAI',
        provider: 'openai',
        category: 'language',
        parameters: 175,
        contextWindow: 128000,
        streaming: true,
        functionCalling: true,
        vision: true,
        available: true,
        releaseDate: '2023-03-14',
        pricing: { input: 0.03, output: 0.06, unit: 'per_1k_tokens' },
        metrics: { accuracy: 95, speed: 80, cost: 85, popularity: 98 }
      },
      {
        id: 'claude-3',
        name: 'Claude 3 Sonnet',
        description: 'Anthropic constitutional AI model',
        provider: 'anthropic',
        category: 'language',
        parameters: 130,
        contextWindow: 200000,
        streaming: true,
        functionCalling: true,
        vision: false,
        available: true,
        releaseDate: '2024-03-04',
        pricing: { input: 0.015, output: 0.075, unit: 'per_1k_tokens' },
        metrics: { accuracy: 93, speed: 85, cost: 78, popularity: 85 }
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Google multimodal AI model',
        provider: 'google',
        category: 'multimodal',
        parameters: 100,
        contextWindow: 30720,
        streaming: false,
        functionCalling: false,
        vision: true,
        available: true,
        releaseDate: '2023-12-06',
        pricing: { input: 0.0005, output: 0.0015, unit: 'per_1k_tokens' },
        metrics: { accuracy: 88, speed: 90, cost: 95, popularity: 75 }
      },
      {
        id: 'llama-2-70b',
        name: 'Llama 2 70B',
        description: 'Meta open source language model',
        provider: 'meta',
        category: 'language',
        parameters: 70,
        contextWindow: 4096,
        streaming: true,
        functionCalling: false,
        vision: false,
        available: false, // Not available
        releaseDate: '2023-07-18',
        pricing: { input: 0.0007, output: 0.0009, unit: 'per_1k_tokens' },
        metrics: { accuracy: 85, speed: 70, cost: 90, popularity: 80 }
      },
      {
        id: 'cohere-command',
        name: 'Command R+',
        description: 'Cohere enterprise language model',
        provider: 'cohere',
        category: 'language',
        parameters: 104,
        contextWindow: 128000,
        streaming: true,
        functionCalling: true,
        vision: false,
        available: true,
        releaseDate: '2024-04-04',
        pricing: { input: 0.003, output: 0.015, unit: 'per_1k_tokens' },
        metrics: { accuracy: 90, speed: 85, cost: 80, popularity: 70 }
      }
    ];
  });

  describe('Provider Filtering', () => {
    it('should filter by single provider', () => {
      const criteria: FilterCriteria = { provider: 'openai' };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('openai');
      expect(result[0].id).toBe('gpt-4');
    });

    it('should filter by multiple providers', () => {
      const criteria: FilterCriteria = { provider: ['openai', 'anthropic'] };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(2);
      expect(result.map(m => m.provider)).toEqual(expect.arrayContaining(['openai', 'anthropic']));
    });

    it('should return empty array for non-existent provider', () => {
      const criteria: FilterCriteria = { provider: 'nonexistent' as any };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(0);
    });
  });

  describe('Category Filtering', () => {
    it('should filter by category', () => {
      const criteria: FilterCriteria = { category: 'multimodal' };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('multimodal');
      expect(result[0].id).toBe('gemini-pro');
    });

    it('should filter by multiple categories', () => {
      const criteria: FilterCriteria = { category: ['language', 'multimodal'] };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(5); // All test models are language or multimodal
    });
  });

  describe('Search Term Filtering', () => {
    it('should filter by model name', () => {
      const criteria: FilterCriteria = { searchTerm: 'GPT' };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(1);
      expect(result[0].name.toLowerCase()).toContain('gpt');
    });

    it('should filter by description keywords', () => {
      const criteria: FilterCriteria = { searchTerm: 'OpenAI' };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(1);
      expect(result[0].description.toLowerCase()).toContain('openai');
    });

    it('should filter by provider name in search', () => {
      const criteria: FilterCriteria = { searchTerm: 'anthropic' };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('anthropic');
    });

    it('should handle multi-word search terms', () => {
      const criteria: FilterCriteria = { searchTerm: 'language model' };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(model => {
        const searchText = `${model.name} ${model.description} ${model.provider} ${model.category}`.toLowerCase();
        expect(searchText).toContain('language');
        expect(searchText).toContain('model');
      });
    });

    it('should be case insensitive', () => {
      const criteria1: FilterCriteria = { searchTerm: 'gpt' };
      const criteria2: FilterCriteria = { searchTerm: 'GPT' };

      const result1 = filterService.applyFilters(testModels, criteria1);
      const result2 = filterService.applyFilters(testModels, criteria2);

      expect(result1).toHaveLength(result2.length);
      expect(result1[0]?.id).toBe(result2[0]?.id);
    });
  });

  describe('Accuracy Filtering', () => {
    it('should filter by minimum accuracy', () => {
      const criteria: FilterCriteria = { minAccuracy: 90 };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(3); // GPT-4: 95, Claude-3: 93, Command R+: 90
      result.forEach(model => {
        expect(model.metrics?.accuracy).toBeGreaterThanOrEqual(90);
      });
    });

    it('should handle models without accuracy metrics', () => {
      const modelWithoutMetrics: AIModel = {
        id: 'test-model',
        name: 'Test Model',
        description: 'Test',
        provider: 'openai',
        category: 'language'
      };

      const modelsWithMixed = [...testModels, modelWithoutMetrics];
      const criteria: FilterCriteria = { minAccuracy: 90 };
      const result = filterService.applyFilters(modelsWithMixed, criteria);

      // Should only include models with accuracy >= 90
      expect(result).toHaveLength(3);
      result.forEach(model => {
        expect(model.metrics?.accuracy).toBeDefined();
        expect(model.metrics!.accuracy!).toBeGreaterThanOrEqual(90);
      });
    });
  });

  describe('Cost Filtering', () => {
    it('should filter by maximum cost', () => {
      const criteria: FilterCriteria = { maxCost: 0.02 };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(4); // Claude-3: 0.015, Gemini: 0.0005, Llama: 0.0007, Cohere: 0.003
      result.forEach(model => {
        expect(model.pricing?.input).toBeLessThanOrEqual(0.02);
      });
    });

    it('should include models without pricing info when filtering by cost', () => {
      const modelWithoutPricing: AIModel = {
        id: 'free-model',
        name: 'Free Model',
        description: 'Free to use',
        provider: 'openai',
        category: 'language'
      };

      const modelsWithMixed = [...testModels, modelWithoutPricing];
      const criteria: FilterCriteria = { maxCost: 0.001 };
      const result = filterService.applyFilters(modelsWithMixed, criteria);

      expect(result.length).toBeGreaterThanOrEqual(1);
      // Should include the free model and any models under the cost threshold
      expect(result.some(m => m.id === 'free-model')).toBe(true);
    });
  });

  describe('Parameter Count Filtering', () => {
    it('should filter by minimum parameters', () => {
      const criteria: FilterCriteria = { minParameters: 100 };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(4); // GPT-4: 175, Claude-3: 130, Gemini: 100, Command R+: 104
      result.forEach(model => {
        expect(model.parameters).toBeGreaterThanOrEqual(100);
      });
    });

    it('should filter by maximum parameters', () => {
      const criteria: FilterCriteria = { maxParameters: 100 };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(2); // Gemini: 100, Llama: 70
      result.forEach(model => {
        expect(model.parameters).toBeLessThanOrEqual(100);
      });
    });

    it('should filter by parameter range', () => {
      const criteria: FilterCriteria = {
        minParameters: 70,
        maxParameters: 130
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(4); // All except GPT-4 (175)
      result.forEach(model => {
        expect(model.parameters).toBeGreaterThanOrEqual(70);
        expect(model.parameters).toBeLessThanOrEqual(130);
      });
    });
  });

  describe('Context Window Filtering', () => {
    it('should filter by minimum context window', () => {
      const criteria: FilterCriteria = { minContextWindow: 100000 };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(3); // GPT-4: 128k, Claude-3: 200k, Command R+: 128k
      result.forEach(model => {
        expect(model.contextWindow).toBeGreaterThanOrEqual(100000);
      });
    });
  });

  describe('Capabilities Filtering', () => {
    it('should filter by streaming capability', () => {
      const criteria: FilterCriteria = {
        capabilities: { streaming: true }
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(4); // All except Gemini
      result.forEach(model => {
        expect(model.streaming).toBe(true);
      });
    });

    it('should filter by function calling capability', () => {
      const criteria: FilterCriteria = {
        capabilities: { functionCalling: true }
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(3); // GPT-4, Claude-3, Command R+
      result.forEach(model => {
        expect(model.functionCalling).toBe(true);
      });
    });

    it('should filter by vision capability', () => {
      const criteria: FilterCriteria = {
        capabilities: { vision: true }
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(2); // GPT-4, Gemini
      result.forEach(model => {
        expect(model.vision).toBe(true);
      });
    });

    it('should filter by multiple capabilities (AND logic)', () => {
      const criteria: FilterCriteria = {
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false
        }
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(2); // Claude-3, Command R+
      result.forEach(model => {
        expect(model.streaming).toBe(true);
        expect(model.functionCalling).toBe(true);
        expect(model.vision).toBe(false);
      });
    });
  });

  describe('Availability Filtering', () => {
    it('should filter available models only', () => {
      const criteria: FilterCriteria = { availableOnly: true };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(4); // All except Llama-2 (available: false)
      result.forEach(model => {
        expect(model.available).not.toBe(false);
      });
    });

    it('should include all models when availableOnly is false', () => {
      const criteria: FilterCriteria = { availableOnly: false };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(5); // All models
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter by date range', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        }
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(2); // Claude-3 and Command R+ (2024 releases)
      result.forEach(model => {
        const releaseYear = new Date(model.releaseDate!).getFullYear();
        expect(releaseYear).toBe(2024);
      });
    });

    it('should filter from date only', () => {
      const criteria: FilterCriteria = {
        dateRange: { from: '2024-01-01' }
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(2);
      result.forEach(model => {
        const releaseDate = new Date(model.releaseDate!);
        const fromDate = new Date('2024-01-01');
        expect(releaseDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
      });
    });
  });

  describe('Complex Multi-Criteria Filtering', () => {
    it('should apply multiple filters with AND logic', () => {
      const criteria: FilterCriteria = {
        provider: ['openai', 'anthropic'],
        category: 'language',
        minAccuracy: 90,
        capabilities: { streaming: true },
        availableOnly: true
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(2); // GPT-4 and Claude-3
      result.forEach(model => {
        expect(['openai', 'anthropic']).toContain(model.provider);
        expect(model.category).toBe('language');
        expect(model.metrics?.accuracy).toBeGreaterThanOrEqual(90);
        expect(model.streaming).toBe(true);
        expect(model.available).not.toBe(false);
      });
    });

    it('should handle filters that result in no matches', () => {
      const criteria: FilterCriteria = {
        provider: 'openai',
        minAccuracy: 99 // Too high, no model has 99% accuracy
      };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty models array', () => {
      const criteria: FilterCriteria = { provider: 'openai' };
      const result = filterService.applyFilters([], criteria);

      expect(result).toHaveLength(0);
    });

    it('should handle empty filter criteria', () => {
      const criteria: FilterCriteria = {};
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(testModels.length);
    });

    it('should handle null/undefined models', () => {
      const result = filterService.applyFilters(null as any, { provider: 'openai' });
      expect(result).toHaveLength(0);
    });

    it('should handle malformed search terms', () => {
      const criteria: FilterCriteria = { searchTerm: '   ' };
      const result = filterService.applyFilters(testModels, criteria);

      expect(result).toHaveLength(testModels.length); // Empty search should return all
    });
  });

  describe('Performance and Caching', () => {
    it('should return results within reasonable time', () => {
      const startTime = performance.now();
      const criteria: FilterCriteria = {
        searchTerm: 'model',
        minAccuracy: 80,
        capabilities: { streaming: true }
      };

      filterService.applyFilters(testModels, criteria);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should provide filter statistics', () => {
      const criteria: FilterCriteria = { provider: 'openai' };
      const startTime = performance.now();
      const result = filterService.applyFilters(testModels, criteria);
      const endTime = performance.now();

      const stats = filterService.getFilterStats(testModels, result, criteria, endTime - startTime);

      expect(stats.totalModels).toBe(testModels.length);
      expect(stats.filteredModels).toBe(result.length);
      expect(stats.filtersApplied).toContain('provider');
      expect(typeof stats.filterTime).toBe('number');
    });
  });

  describe('Filter Utility Methods', () => {
    it('should detect active filters', () => {
      const emptyCriteria: FilterCriteria = {};
      const activeCriteria: FilterCriteria = { provider: 'openai', minAccuracy: 90 };

      expect(filterService.hasActiveFilters(emptyCriteria)).toBe(false);
      expect(filterService.hasActiveFilters(activeCriteria)).toBe(true);
    });

    it('should get available filter values from models', () => {
      const availableValues = filterService.getAvailableFilterValues(testModels);

      expect(availableValues.providers).toContain('openai');
      expect(availableValues.providers).toContain('anthropic');
      expect(availableValues.categories).toContain('language');
      expect(availableValues.categories).toContain('multimodal');

      expect(availableValues.parameterRanges).not.toBeNull();
      expect(availableValues.parameterRanges?.min).toBe(70);
      expect(availableValues.parameterRanges?.max).toBe(175);

      expect(availableValues.capabilities.streaming).toBe(4);
      expect(availableValues.capabilities.functionCalling).toBe(3);
      expect(availableValues.capabilities.vision).toBe(2);
    });
  });
});