/**
 * @file Tests for model sorting and ordering functionality (Test requirement 56)
 *
 * Tests checkpoint 114: SortService with sortModels method
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SortService } from '../sort';
import type { AIModel, SortOptions, SortDirection } from '../../types/models';

describe('SortService - Model Sorting and Ordering Functionality', () => {
  let sortService: SortService;
  let testModels: AIModel[];

  beforeEach(() => {
    sortService = new SortService();

    // Create test models with varied properties for sorting
    testModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Advanced language model',
        provider: 'openai',
        category: 'language',
        parameters: 175,
        releaseDate: '2023-03-14',
        updatedAt: '2024-01-15T00:00:00Z',
        pricing: { input: 0.03, output: 0.06 },
        metrics: { accuracy: 95, speed: 80, cost: 85, popularity: 98 }
      },
      {
        id: 'claude-3',
        name: 'Claude 3 Sonnet',
        description: 'Constitutional AI model',
        provider: 'anthropic',
        category: 'language',
        parameters: 130,
        releaseDate: '2024-03-04',
        updatedAt: '2024-09-01T00:00:00Z',
        pricing: { input: 0.015, output: 0.075 },
        metrics: { accuracy: 93, speed: 85, cost: 78, popularity: 85 }
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Multimodal AI model',
        provider: 'google',
        category: 'multimodal',
        parameters: 100,
        releaseDate: '2023-12-06',
        updatedAt: '2024-06-10T00:00:00Z',
        pricing: { input: 0.0005, output: 0.0015 },
        metrics: { accuracy: 88, speed: 90, cost: 95, popularity: 75 }
      },
      {
        id: 'llama-2-70b',
        name: 'Llama 2 70B',
        description: 'Open source model',
        provider: 'meta',
        category: 'language',
        parameters: 70,
        releaseDate: '2023-07-18',
        updatedAt: '2023-12-20T00:00:00Z',
        pricing: { input: 0.0007, output: 0.0009 },
        metrics: { accuracy: 85, speed: 70, cost: 90, popularity: 80 }
      },
      {
        id: 'cohere-command',
        name: 'Command R+',
        description: 'Enterprise language model',
        provider: 'cohere',
        category: 'language',
        parameters: 104,
        releaseDate: '2024-04-04',
        updatedAt: '2024-08-15T00:00:00Z',
        pricing: { input: 0.003, output: 0.015 },
        metrics: { accuracy: 90, speed: 85, cost: 80, popularity: 70 }
      }
    ];
  });

  describe('Name Sorting', () => {
    it('should sort by name ascending', () => {
      const result = sortService.sortModels(testModels, 'name', 'asc');

      expect(result.map(m => m.name)).toEqual([
        'Claude 3 Sonnet',
        'Command R+',
        'Gemini Pro',
        'GPT-4',
        'Llama 2 70B'
      ]);
    });

    it('should sort by name descending', () => {
      const result = sortService.sortModels(testModels, 'name', 'desc');

      expect(result.map(m => m.name)).toEqual([
        'Llama 2 70B',
        'GPT-4',
        'Gemini Pro',
        'Command R+',
        'Claude 3 Sonnet'
      ]);
    });

    it('should handle case-insensitive name sorting', () => {
      const modelsWithCaseVariation: AIModel[] = [
        { ...testModels[0], name: 'gpt-4' },
        { ...testModels[1], name: 'CLAUDE-3' },
        { ...testModels[2], name: 'Gemini-Pro' }
      ];

      const result = sortService.sortModels(modelsWithCaseVariation, 'name', 'asc');

      expect(result.map(m => m.name)).toEqual([
        'CLAUDE-3',
        'Gemini-Pro',
        'gpt-4'
      ]);
    });
  });

  describe('Provider Sorting', () => {
    it('should sort by provider ascending', () => {
      const result = sortService.sortModels(testModels, 'provider', 'asc');

      expect(result.map(m => m.provider)).toEqual([
        'anthropic',
        'cohere',
        'google',
        'meta',
        'openai'
      ]);
    });

    it('should sort by provider descending', () => {
      const result = sortService.sortModels(testModels, 'provider', 'desc');

      expect(result.map(m => m.provider)).toEqual([
        'openai',
        'meta',
        'google',
        'cohere',
        'anthropic'
      ]);
    });
  });

  describe('Category Sorting', () => {
    it('should sort by category', () => {
      const result = sortService.sortModels(testModels, 'category', 'asc');

      const categories = result.map(m => m.category);
      expect(categories.filter(c => c === 'language')).toHaveLength(4);
      expect(categories.filter(c => c === 'multimodal')).toHaveLength(1);

      // Check that 'language' comes before 'multimodal' alphabetically
      const firstMultimodal = categories.findIndex(c => c === 'multimodal');
      const lastLanguage = categories.lastIndexOf('language');
      expect(firstMultimodal).toBeGreaterThan(lastLanguage);
    });
  });

  describe('Accuracy Sorting', () => {
    it('should sort by accuracy ascending', () => {
      const result = sortService.sortModels(testModels, 'accuracy', 'asc');

      expect(result.map(m => m.metrics?.accuracy)).toEqual([
        85, // Llama-2
        88, // Gemini
        90, // Cohere
        93, // Claude-3
        95  // GPT-4
      ]);
    });

    it('should sort by accuracy descending', () => {
      const result = sortService.sortModels(testModels, 'accuracy', 'desc');

      expect(result.map(m => m.metrics?.accuracy)).toEqual([
        95, // GPT-4
        93, // Claude-3
        90, // Cohere
        88, // Gemini
        85  // Llama-2
      ]);
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
      const result = sortService.sortModels(modelsWithMixed, 'accuracy', 'asc');

      // Models without accuracy should be sorted to the end (undefined values)
      expect(result[result.length - 1].id).toBe('test-model');
    });
  });

  describe('Speed Sorting', () => {
    it('should sort by speed descending', () => {
      const result = sortService.sortModels(testModels, 'speed', 'desc');

      expect(result.map(m => m.metrics?.speed)).toEqual([
        90, // Gemini
        85, // Claude-3
        85, // Cohere (same as Claude-3)
        80, // GPT-4
        70  // Llama-2
      ]);
    });
  });

  describe('Cost Sorting', () => {
    it('should sort by cost (input pricing)', () => {
      const result = sortService.sortModels(testModels, 'cost', 'asc');

      expect(result.map(m => m.pricing?.input)).toEqual([
        0.0005, // Gemini
        0.0007, // Llama-2
        0.003,  // Cohere
        0.015,  // Claude-3
        0.03    // GPT-4
      ]);
    });
  });

  describe('Popularity Sorting', () => {
    it('should sort by popularity descending', () => {
      const result = sortService.sortModels(testModels, 'popularity', 'desc');

      expect(result.map(m => m.metrics?.popularity)).toEqual([
        98, // GPT-4
        85, // Claude-3
        80, // Llama-2
        75, // Gemini
        70  // Cohere
      ]);
    });
  });

  describe('Parameters Sorting', () => {
    it('should sort by parameter count', () => {
      const result = sortService.sortModels(testModels, 'parameters', 'desc');

      expect(result.map(m => m.parameters)).toEqual([
        175, // GPT-4
        130, // Claude-3
        104, // Cohere
        100, // Gemini
        70   // Llama-2
      ]);
    });
  });

  describe('Release Date Sorting', () => {
    it('should sort by release date chronologically', () => {
      const result = sortService.sortModels(testModels, 'releaseDate', 'asc');

      expect(result.map(m => m.releaseDate)).toEqual([
        '2023-03-14', // GPT-4
        '2023-07-18', // Llama-2
        '2023-12-06', // Gemini
        '2024-03-04', // Claude-3
        '2024-04-04'  // Cohere
      ]);
    });

    it('should sort by release date reverse chronologically', () => {
      const result = sortService.sortModels(testModels, 'releaseDate', 'desc');

      expect(result.map(m => m.releaseDate)).toEqual([
        '2024-04-04', // Cohere
        '2024-03-04', // Claude-3
        '2023-12-06', // Gemini
        '2023-07-18', // Llama-2
        '2023-03-14'  // GPT-4
      ]);
    });

    it('should handle invalid date strings', () => {
      const modelsWithInvalidDate = [
        { ...testModels[0], releaseDate: 'invalid-date' },
        { ...testModels[1], releaseDate: '2024-03-04' }
      ];

      const result = sortService.sortModels(modelsWithInvalidDate, 'releaseDate', 'asc');

      // Invalid dates should be sorted to the end
      expect(result[1].releaseDate).toBe('invalid-date');
    });
  });

  describe('Updated At Sorting', () => {
    it('should sort by updatedAt timestamp', () => {
      const result = sortService.sortModels(testModels, 'updatedAt', 'desc');

      expect(result.map(m => m.updatedAt)).toEqual([
        '2024-09-01T00:00:00Z', // Claude-3
        '2024-08-15T00:00:00Z', // Cohere
        '2024-06-10T00:00:00Z', // Gemini
        '2024-01-15T00:00:00Z', // GPT-4
        '2023-12-20T00:00:00Z'  // Llama-2
      ]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty array', () => {
      const result = sortService.sortModels([], 'name', 'asc');

      expect(result).toHaveLength(0);
    });

    it('should handle single model', () => {
      const result = sortService.sortModels([testModels[0]], 'name', 'asc');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('gpt-4');
    });

    it('should handle null/undefined input', () => {
      const result = sortService.sortModels(null as any, 'name', 'asc');

      expect(result).toHaveLength(0);
    });

    it('should default to ascending direction when not specified', () => {
      const resultDefault = sortService.sortModels(testModels, 'name');
      const resultAsc = sortService.sortModels(testModels, 'name', 'asc');

      expect(resultDefault.map(m => m.name)).toEqual(resultAsc.map(m => m.name));
    });

    it('should handle unknown sort field gracefully', () => {
      const result = sortService.sortModels(testModels, 'unknown' as SortOptions, 'asc');

      // Should return original order when sort field is unknown
      expect(result).toHaveLength(testModels.length);
      expect(result.map(m => m.id)).toEqual(testModels.map(m => m.id));
    });
  });

  describe('Multi-Sort Functionality', () => {
    it('should sort by multiple criteria', () => {
      const criteria = [
        { field: 'category' as SortOptions, direction: 'asc' as SortDirection, priority: 2 },
        { field: 'accuracy' as SortOptions, direction: 'desc' as SortDirection, priority: 1 }
      ];

      const result = sortService.sortModelsByMultipleCriteria(testModels, criteria);

      // First, sort by category (language comes before multimodal)
      // Then within same category, sort by accuracy descending
      const languageModels = result.filter(m => m.category === 'language');
      const multimodalModels = result.filter(m => m.category === 'multimodal');

      expect(languageModels.length).toBeGreaterThan(0);
      expect(multimodalModels.length).toBeGreaterThan(0);

      // Language models should come first
      const firstMultimodalIndex = result.findIndex(m => m.category === 'multimodal');
      const lastLanguageIndex = result.map(m => m.category).lastIndexOf('language');
      expect(firstMultimodalIndex).toBeGreaterThan(lastLanguageIndex);

      // Within language category, accuracy should be descending
      for (let i = 0; i < languageModels.length - 1; i++) {
        const current = languageModels[i].metrics?.accuracy || 0;
        const next = languageModels[i + 1].metrics?.accuracy || 0;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should handle empty criteria array', () => {
      const result = sortService.sortModelsByMultipleCriteria(testModels, []);

      expect(result.map(m => m.id)).toEqual(testModels.map(m => m.id));
    });
  });

  describe('Stable Sort Functionality', () => {
    it('should maintain relative order for equal elements', () => {
      // Create models with same accuracy to test stable sort
      const modelsWithSameAccuracy = [
        { ...testModels[0], name: 'Model A', metrics: { accuracy: 90 } },
        { ...testModels[1], name: 'Model B', metrics: { accuracy: 90 } },
        { ...testModels[2], name: 'Model C', metrics: { accuracy: 85 } }
      ];

      const result = sortService.stableSort(modelsWithSameAccuracy, 'accuracy', 'asc');

      // Model C (85) should come first
      expect(result[0].name).toBe('Model C');

      // Models A and B should maintain their original relative order
      expect(result[1].name).toBe('Model A');
      expect(result[2].name).toBe('Model B');
    });
  });

  describe('Sort Options and Utility Methods', () => {
    it('should provide available sort options with descriptions', () => {
      const options = sortService.getAvailableSortOptions();

      expect(options).toHaveLength(10);
      expect(options.map(opt => opt.value)).toEqual([
        'name', 'provider', 'category', 'accuracy', 'speed',
        'cost', 'popularity', 'parameters', 'releaseDate', 'updatedAt'
      ]);

      options.forEach(option => {
        expect(option.label).toBeDefined();
        expect(option.description).toBeDefined();
        expect(typeof option.label).toBe('string');
        expect(typeof option.description).toBe('string');
      });
    });

    it('should check if sort field is available for models', () => {
      expect(sortService.isSortFieldAvailable(testModels, 'name')).toBe(true);
      expect(sortService.isSortFieldAvailable(testModels, 'provider')).toBe(true);
      expect(sortService.isSortFieldAvailable(testModels, 'accuracy')).toBe(true);
      expect(sortService.isSortFieldAvailable(testModels, 'parameters')).toBe(true);

      // Test with models that don't have certain fields
      const modelsWithoutMetrics = [
        {
          id: 'basic-model',
          name: 'Basic Model',
          description: 'Test',
          provider: 'openai',
          category: 'language'
        }
      ] as AIModel[];

      expect(sortService.isSortFieldAvailable(modelsWithoutMetrics, 'name')).toBe(true);
      expect(sortService.isSortFieldAvailable(modelsWithoutMetrics, 'accuracy')).toBe(false);
      expect(sortService.isSortFieldAvailable(modelsWithoutMetrics, 'parameters')).toBe(false);
    });

    it('should provide sort statistics', () => {
      const stats = sortService.getSortStats(testModels, 'accuracy');

      expect(stats.totalModels).toBe(5);
      expect(stats.modelsWithData).toBe(5); // All models have accuracy
      expect(stats.modelsWithoutData).toBe(0);
      expect(stats.dataAvailabilityPercentage).toBe(100);

      const statsParameters = sortService.getSortStats(testModels, 'parameters');
      expect(statsParameters.modelsWithData).toBe(5); // All models have parameters
      expect(statsParameters.dataAvailabilityPercentage).toBe(100);
    });
  });

  describe('Performance', () => {
    it('should sort large arrays efficiently', () => {
      // Create a larger dataset
      const largeDataset: AIModel[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          ...testModels[i % testModels.length],
          id: `model-${i}`,
          name: `Model ${i}`,
          metrics: { accuracy: Math.random() * 100 }
        });
      }

      const startTime = performance.now();
      sortService.sortModels(largeDataset, 'accuracy', 'desc');
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should have working cache functionality', () => {
      // First sort to populate cache
      const result1 = sortService.sortModels(testModels, 'name', 'asc');

      // Second sort with same parameters should use cache
      const startTime = performance.now();
      const result2 = sortService.sortModels(testModels, 'name', 'asc');
      const endTime = performance.now();

      expect(result1.map(m => m.id)).toEqual(result2.map(m => m.id));
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast due to caching
    });

    it('should provide cache statistics', () => {
      sortService.clearCache(); // Start fresh

      let stats = sortService.getCacheStats();
      expect(stats.size).toBe(0);

      // Perform some sorts to populate cache
      sortService.sortModels(testModels, 'name', 'asc');
      sortService.sortModels(testModels, 'accuracy', 'desc');

      stats = sortService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
    });
  });
});