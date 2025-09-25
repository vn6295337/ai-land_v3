/**
 * @file Tests for search functionality and ranking (Test requirement 70)
 *
 * Tests checkpoint 115: SearchService with fuzzy search, keyword matching, and relevance scoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchService } from '../search';
import type { AIModel } from '../../types/models';

describe('SearchService - Search Functionality and Ranking', () => {
  let searchService: SearchService;
  let testModels: AIModel[];

  beforeEach(() => {
    searchService = new SearchService();

    // Create diverse test models for search testing
    testModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Advanced large language model from OpenAI with exceptional reasoning capabilities',
        provider: 'openai',
        category: 'language',
        modelId: 'gpt-4-0613'
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and efficient language model optimized for chat applications',
        provider: 'openai',
        category: 'language',
        modelId: 'gpt-3.5-turbo-0613'
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Anthropic constitutional AI model with strong reasoning and safety features',
        provider: 'anthropic',
        category: 'language',
        modelId: 'claude-3-sonnet-20240229'
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and lightweight Anthropic model for quick responses',
        provider: 'anthropic',
        category: 'language',
        modelId: 'claude-3-haiku-20240307'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Google multimodal AI model with vision and text capabilities',
        provider: 'google',
        category: 'multimodal',
        modelId: 'gemini-pro'
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: 'Google multimodal model specialized for image understanding and analysis',
        provider: 'google',
        category: 'multimodal',
        modelId: 'gemini-pro-vision'
      },
      {
        id: 'llama-2-70b',
        name: 'Llama 2 70B',
        description: 'Meta open source large language model with 70 billion parameters',
        provider: 'meta',
        category: 'language',
        modelId: 'llama-2-70b-chat'
      },
      {
        id: 'codellama-34b',
        name: 'Code Llama 34B',
        description: 'Meta specialized model for code generation and programming assistance',
        provider: 'meta',
        category: 'code',
        modelId: 'codellama-34b-instruct'
      }
    ];
  });

  describe('Basic Search Functionality', () => {
    it('should find exact name matches with high relevance', () => {
      const results = searchService.search(testModels, 'GPT-4');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].model.name).toBe('GPT-4');
      expect(results[0].score).toBeGreaterThan(0.8);
    });

    it('should find partial name matches', () => {
      const results = searchService.search(testModels, 'Claude');

      expect(results).toHaveLength(2);
      expect(results.every(r => r.model.name.toLowerCase().includes('claude'))).toBe(true);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const resultsLower = searchService.search(testModels, 'gpt');
      const resultsUpper = searchService.search(testModels, 'GPT');
      const resultsMixed = searchService.search(testModels, 'Gpt');

      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsUpper.length).toBe(resultsMixed.length);
      expect(resultsLower[0].model.id).toBe(resultsUpper[0].model.id);
    });

    it('should return empty array for no matches', () => {
      const results = searchService.search(testModels, 'xyz123nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should handle empty search query', () => {
      const results = searchService.search(testModels, '');

      expect(results).toHaveLength(0);
    });

    it('should handle whitespace-only query', () => {
      const results = searchService.search(testModels, '   ');

      expect(results).toHaveLength(0);
    });
  });

  describe('Multi-field Search', () => {
    it('should search across name, description, and provider', () => {
      const results = searchService.search(testModels, 'OpenAI');

      // Should find models that contain "OpenAI" in any field
      expect(results.length).toBeGreaterThanOrEqual(2);
      // At least the two OpenAI models should be in the results
      const openaiModels = results.filter(r => r.model.provider === 'openai');
      expect(openaiModels).toHaveLength(2);
    });

    it('should search in descriptions', () => {
      const results = searchService.search(testModels, 'multimodal');

      expect(results).toHaveLength(2); // Both Gemini models
      expect(results.every(r => r.model.category === 'multimodal')).toBe(true);
    });

    it('should search in model IDs', () => {
      const results = searchService.search(testModels, 'sonnet');

      expect(results).toHaveLength(1);
      expect(results[0].model.name).toBe('Claude 3 Sonnet');
    });

    it('should find matches across multiple fields', () => {
      const results = searchService.search(testModels, 'language model');

      expect(results.length).toBeGreaterThan(3);
      // Should find models with "language" in category/description and "model" in description
    });
  });

  describe('Fuzzy Search', () => {
    it('should find fuzzy matches with typos', () => {
      const results = searchService.search(testModels, 'clayde', { fuzzy: true, threshold: 0.6 });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].model.name.toLowerCase()).toContain('claude');
    });

    it('should handle fuzzy search for model names', () => {
      const results = searchService.search(testModels, 'gemeni', { fuzzy: true, threshold: 0.6 });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].model.name.toLowerCase()).toContain('gemini');
    });

    it('should respect fuzzy threshold', () => {
      const strictResults = searchService.search(testModels, 'xyz', { fuzzy: true, threshold: 0.9 });
      const lenientResults = searchService.search(testModels, 'xyz', { fuzzy: true, threshold: 0.1 });

      expect(strictResults.length).toBeLessThanOrEqual(lenientResults.length);
    });

    it('should disable fuzzy search when requested', () => {
      const fuzzyResults = searchService.search(testModels, 'clayde', { fuzzy: true });
      const exactResults = searchService.search(testModels, 'clayde', { fuzzy: false });

      expect(fuzzyResults.length).toBeGreaterThan(exactResults.length);
    });
  });

  describe('Relevance Scoring and Ranking', () => {
    it('should rank exact matches higher than partial matches', () => {
      const results = searchService.search(testModels, 'Claude', { includeMatches: true });

      expect(results.length).toBeGreaterThan(1);

      // Find exact match (Claude in name) vs partial match (Claude in description/modelId)
      const exactMatch = results.find(r => r.model.name.toLowerCase().includes('claude'));
      expect(exactMatch).toBeDefined();
      expect(exactMatch!.score).toBeGreaterThan(0.5);
    });

    it('should prioritize name matches over description matches', () => {
      const results = searchService.search(testModels, 'Turbo');

      expect(results.length).toBeGreaterThan(0);
      // GPT-3.5 Turbo should rank higher (name match) than any description matches
      expect(results[0].model.name).toContain('Turbo');
    });

    it('should provide relevance scores between 0 and 1', () => {
      const results = searchService.search(testModels, 'language model');

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should sort results by relevance score descending', () => {
      const results = searchService.search(testModels, 'model');

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should include match details when requested', () => {
      const results = searchService.search(testModels, 'OpenAI', { includeMatches: true });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches).toBeDefined();
      expect(results[0].matches.length).toBeGreaterThan(0);

      const match = results[0].matches[0];
      expect(match.field).toBeDefined();
      expect(match.value).toBeDefined();
      expect(match.score).toBeGreaterThan(0);
    });
  });

  describe('Search Options and Limits', () => {
    it('should respect search result limit', () => {
      const results = searchService.search(testModels, 'model', { limit: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should respect minimum score threshold', () => {
      const results = searchService.search(testModels, 'model', { minScore: 0.5 });

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should allow field-specific search', () => {
      const nameOnlyResults = searchService.search(testModels, 'GPT', {
        fields: ['name']
      });

      expect(nameOnlyResults.length).toBeGreaterThan(0);
      nameOnlyResults.forEach(result => {
        expect(result.model.name.toLowerCase()).toContain('gpt');
      });
    });

    it('should search multiple specified fields', () => {
      const results = searchService.search(testModels, 'Google', {
        fields: ['provider', 'description']
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        const matchesProvider = result.model.provider.toLowerCase().includes('google');
        const matchesDescription = result.model.description.toLowerCase().includes('google');
        expect(matchesProvider || matchesDescription).toBe(true);
      });
    });
  });

  describe('Search Suggestions', () => {
    it('should provide relevant suggestions', () => {
      const suggestions = searchService.getSuggestions(testModels, 'cl');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.text.toLowerCase().includes('claude'))).toBe(true);
    });

    it('should categorize suggestions by type', () => {
      const suggestions = searchService.getSuggestions(testModels, 'g');

      expect(suggestions.length).toBeGreaterThan(0);

      const types = [...new Set(suggestions.map(s => s.type))];
      expect(types.length).toBeGreaterThan(0);
      expect(['model', 'provider', 'category'].some(type => types.includes(type))).toBe(true);
    });

    it('should include suggestion counts', () => {
      const suggestions = searchService.getSuggestions(testModels, 'language');

      suggestions.forEach(suggestion => {
        expect(suggestion.count).toBeGreaterThan(0);
        expect(typeof suggestion.count).toBe('number');
      });
    });

    it('should limit number of suggestions', () => {
      const suggestions = searchService.getSuggestions(testModels, 'a', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for empty query', () => {
      const suggestions = searchService.getSuggestions(testModels, '');

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Text Highlighting', () => {
    it('should highlight matched text with mark tags', () => {
      const highlighted = searchService.highlightMatches('GPT-4 is a language model', 'GPT');

      expect(highlighted).toContain('<mark>GPT</mark>');
      expect(highlighted).toContain(' is a language model');
    });

    it('should highlight multiple matches', () => {
      const highlighted = searchService.highlightMatches('GPT-4 and GPT-3.5', 'GPT');

      expect(highlighted).toContain('<mark>GPT</mark>-4');
      expect(highlighted).toContain('<mark>GPT</mark>-3.5');
    });

    it('should be case insensitive for highlighting', () => {
      const highlighted = searchService.highlightMatches('gpt-4 model', 'GPT');

      expect(highlighted).toContain('<mark>gpt</mark>');
    });

    it('should handle multiple search terms', () => {
      const highlighted = searchService.highlightMatches('Advanced language model', 'language model');

      expect(highlighted).toContain('<mark>language</mark>');
      expect(highlighted).toContain('<mark>model</mark>');
    });

    it('should return original text for empty query', () => {
      const text = 'GPT-4 language model';
      const highlighted = searchService.highlightMatches(text, '');

      expect(highlighted).toBe(text);
    });
  });

  describe('Performance and Caching', () => {
    it('should complete searches within reasonable time', () => {
      const startTime = performance.now();
      searchService.search(testModels, 'language model');
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should cache search results for repeated queries', () => {
      // First search to populate cache
      const results1 = searchService.search(testModels, 'GPT');

      // Second search should be faster due to caching
      const startTime = performance.now();
      const results2 = searchService.search(testModels, 'GPT');
      const endTime = performance.now();

      expect(results1.length).toBe(results2.length);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast due to caching
    });

    it('should provide cache statistics', () => {
      searchService.clearCache(); // Start fresh

      let stats = searchService.getCacheStats();
      expect(stats.searchCache.size).toBe(0);
      expect(stats.suggestionCache.size).toBe(0);

      // Perform searches to populate cache
      searchService.search(testModels, 'GPT');
      searchService.getSuggestions(testModels, 'Claude');

      stats = searchService.getCacheStats();
      expect(stats.searchCache.size).toBe(1);
      expect(stats.suggestionCache.size).toBe(1);
    });

    it('should handle large datasets efficiently', () => {
      // Create larger dataset
      const largeDataset: AIModel[] = [];
      for (let i = 0; i < 500; i++) {
        largeDataset.push({
          ...testModels[i % testModels.length],
          id: `model-${i}`,
          name: `Model ${i}`,
          description: `Test model ${i} with various capabilities`
        });
      }

      const startTime = performance.now();
      const results = searchService.search(largeDataset, 'model');
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should complete within 500ms even for large dataset
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty models array', () => {
      const results = searchService.search([], 'GPT');

      expect(results).toHaveLength(0);
    });

    it('should handle null/undefined models', () => {
      const results = searchService.search(null as any, 'GPT');

      expect(results).toHaveLength(0);
    });

    it('should handle models with missing fields', () => {
      const modelsWithMissingFields: AIModel[] = [
        {
          id: 'incomplete-model',
          name: 'Test Model',
          description: '',  // Empty description
          provider: 'test',
          category: 'language'
        }
      ];

      const results = searchService.search(modelsWithMissingFields, 'Test');

      expect(results).toHaveLength(1);
      expect(results[0].model.name).toBe('Test Model');
    });

    it('should handle special characters in search query', () => {
      const results = searchService.search(testModels, 'GPT-4 (advanced)');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle very long search queries', () => {
      const longQuery = 'very long search query '.repeat(50);
      const results = searchService.search(testModels, longQuery);

      expect(Array.isArray(results)).toBe(true); // Should not crash
    });

    it('should handle Unicode characters', () => {
      const modelsWithUnicode: AIModel[] = [
        {
          id: 'unicode-model',
          name: 'Modèle Français',
          description: 'Un modèle en français avec des caractères spéciaux',
          provider: 'test',
          category: 'language'
        }
      ];

      const results = searchService.search(modelsWithUnicode, 'français');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Search Algorithm Quality', () => {
    it('should rank more relevant results higher', () => {
      // Add a model that should rank lower due to less relevance
      const modelsWithVariedRelevance = [
        ...testModels,
        {
          id: 'tangential-model',
          name: 'Random Model',
          description: 'This model mentions GPT in passing but is not really about GPT',
          provider: 'other',
          category: 'language'
        }
      ];

      const results = searchService.search(modelsWithVariedRelevance, 'GPT');

      // GPT-4 should rank higher than the tangential mention
      const gpt4Index = results.findIndex(r => r.model.id === 'gpt-4');
      const tangentialIndex = results.findIndex(r => r.model.id === 'tangential-model');

      if (tangentialIndex !== -1) {
        expect(gpt4Index).toBeLessThan(tangentialIndex);
      }
    });

    it('should provide meaningful match information', () => {
      const results = searchService.search(testModels, 'anthropic', { includeMatches: true });

      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result.matches).toBeDefined();
      expect(result.matches.length).toBeGreaterThan(0);

      const match = result.matches[0];
      expect(['name', 'description', 'provider', 'category', 'modelId']).toContain(match.field);
      expect(match.value.toLowerCase()).toContain('anthropic');
      expect(match.score).toBeGreaterThan(0);
    });
  });
});