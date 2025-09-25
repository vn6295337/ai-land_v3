/**
 * Search Service
 *
 * This module provides advanced search functionality including fuzzy search,
 * keyword matching, relevance scoring, and search suggestions.
 */

import { AIModel } from '../types/models';

/**
 * Search result with relevance scoring
 */
interface SearchResult {
  model: AIModel;
  score: number;
  matches: SearchMatch[];
}

/**
 * Search match details
 */
interface SearchMatch {
  field: string;
  value: string;
  matchedText: string;
  score: number;
}

/**
 * Search options configuration
 */
interface SearchOptions {
  /** Enable fuzzy matching */
  fuzzy?: boolean;
  /** Fuzzy match threshold (0-1, higher = more strict) */
  threshold?: number;
  /** Maximum number of results */
  limit?: number;
  /** Fields to search in */
  fields?: SearchField[];
  /** Minimum relevance score */
  minScore?: number;
  /** Whether to include match details */
  includeMatches?: boolean;
}

/**
 * Searchable fields with weights
 */
type SearchField = 'name' | 'description' | 'provider' | 'category' | 'modelId';

/**
 * Search suggestion
 */
interface SearchSuggestion {
  text: string;
  type: 'model' | 'provider' | 'category' | 'capability';
  count: number;
}

/**
 * Search analytics
 */
interface SearchAnalytics {
  query: string;
  resultsCount: number;
  searchTime: number;
  fuzzyEnabled: boolean;
  fieldsSearched: SearchField[];
}

/**
 * SearchService class for advanced model search
 */
export class SearchService {
  private searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
  private suggestionCache = new Map<string, { suggestions: SearchSuggestion[]; timestamp: number }>();
  private readonly cacheTTL = 300000; // 5 minutes
  private readonly suggestionCacheTTL = 600000; // 10 minutes

  // Field weights for relevance scoring
  private readonly fieldWeights: Record<SearchField, number> = {
    name: 1.0,
    description: 0.7,
    provider: 0.8,
    category: 0.6,
    modelId: 0.9
  };

  // Default search options
  private readonly defaultOptions: SearchOptions = {
    fuzzy: true,
    threshold: 0.6, // More strict fuzzy matching
    limit: 100,
    fields: ['name', 'description', 'provider', 'category', 'modelId'],
    minScore: 0.2, // Higher minimum score
    includeMatches: false
  };

  /**
   * Perform advanced search on models
   */
  search(
    models: AIModel[],
    query: string,
    options: SearchOptions = {}
  ): SearchResult[] {
    if (!models || models.length === 0 || !query.trim()) {
      return [];
    }

    const startTime = performance.now();
    const searchOptions = { ...this.defaultOptions, ...options };
    const cacheKey = this.generateSearchCacheKey(models, query, searchOptions);

    // Check cache first
    const cached = this.getFromSearchCache(cacheKey);
    if (cached) {
      return cached;
    }

    const normalizedQuery = this.normalizeQuery(query);
    const results: SearchResult[] = [];

    for (const model of models) {
      const modelScore = this.calculateModelScore(model, normalizedQuery, searchOptions);

      if (modelScore.score >= searchOptions.minScore!) {
        results.push(modelScore);
      }
    }

    // Sort by relevance score (highest first)
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, searchOptions.limit);

    // Cache results
    this.setSearchCache(cacheKey, sortedResults);

    // Log analytics
    const endTime = performance.now();
    this.logSearchAnalytics({
      query,
      resultsCount: sortedResults.length,
      searchTime: endTime - startTime,
      fuzzyEnabled: searchOptions.fuzzy || false,
      fieldsSearched: searchOptions.fields || []
    });

    return sortedResults;
  }

  /**
   * Get search suggestions based on query
   */
  getSuggestions(
    models: AIModel[],
    query: string,
    limit = 10
  ): SearchSuggestion[] {
    if (!models || models.length === 0 || !query.trim()) {
      return [];
    }

    const cacheKey = `suggestions-${query.toLowerCase()}-${limit}`;
    const cached = this.getFromSuggestionCache(cacheKey);
    if (cached) {
      return cached;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];

    // Model name suggestions
    const modelNames = this.getMatchingSuggestions(
      models.map(m => m.name),
      normalizedQuery,
      'model'
    );
    suggestions.push(...modelNames);

    // Provider suggestions
    const providers = this.getMatchingSuggestions(
      [...new Set(models.map(m => m.provider))],
      normalizedQuery,
      'provider'
    );
    suggestions.push(...providers);

    // Category suggestions
    const categories = this.getMatchingSuggestions(
      [...new Set(models.map(m => m.category))],
      normalizedQuery,
      'category'
    );
    suggestions.push(...categories);

    // Capability suggestions
    const capabilities: string[] = [];
    models.forEach(m => {
      if (m.streaming) capabilities.push('streaming');
      if (m.functionCalling) capabilities.push('function calling');
      if (m.vision) capabilities.push('vision');
    });
    const capabilitySuggestions = this.getMatchingSuggestions(
      [...new Set(capabilities)],
      normalizedQuery,
      'capability'
    );
    suggestions.push(...capabilitySuggestions);

    // Sort by relevance and limit
    const sortedSuggestions = suggestions
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // Cache suggestions
    this.setSuggestionCache(cacheKey, sortedSuggestions);

    return sortedSuggestions;
  }

  /**
   * Highlight search matches in text
   */
  highlightMatches(text: string, query: string): string {
    if (!query.trim()) {
      return text;
    }

    const normalizedQuery = this.normalizeQuery(query);
    const terms = normalizedQuery.split(/\s+/);
    let highlightedText = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  }

  /**
   * Calculate relevance score for a model
   */
  private calculateModelScore(
    model: AIModel,
    query: string,
    options: SearchOptions
  ): SearchResult {
    let totalScore = 0;
    const matches: SearchMatch[] = [];
    const terms = query.split(/\s+/);

    for (const field of options.fields!) {
      const fieldValue = this.getFieldValue(model, field);
      if (!fieldValue) continue;

      const fieldScore = this.calculateFieldScore(
        fieldValue,
        terms,
        field,
        options
      );

      if (fieldScore.score > 0) {
        totalScore += fieldScore.score * this.fieldWeights[field];

        if (options.includeMatches) {
          matches.push({
            field,
            value: fieldValue,
            matchedText: fieldScore.matchedText,
            score: fieldScore.score
          });
        }
      }
    }

    // Normalize score (0-1 range)
    const normalizedScore = Math.min(totalScore, 1);

    return {
      model,
      score: normalizedScore,
      matches
    };
  }

  /**
   * Calculate score for a specific field
   */
  private calculateFieldScore(
    fieldValue: string,
    terms: string[],
    field: SearchField,
    options: SearchOptions
  ): { score: number; matchedText: string } {
    const normalizedValue = fieldValue.toLowerCase();
    let score = 0;
    let matchedText = '';

    for (const term of terms) {
      if (options.fuzzy) {
        const fuzzyScore = this.calculateFuzzyScore(normalizedValue, term, options.threshold!);
        if (fuzzyScore > 0) {
          score += fuzzyScore;
          matchedText = term;
        }
      } else {
        // Exact match scoring
        if (normalizedValue.includes(term)) {
          const exactScore = this.calculateExactScore(normalizedValue, term);
          score += exactScore;
          matchedText = term;
        }
      }
    }

    return { score: Math.min(score, 1), matchedText };
  }

  /**
   * Calculate fuzzy match score using Levenshtein distance
   */
  private calculateFuzzyScore(text: string, term: string, threshold: number): number {
    // Check for exact substring match first
    if (text.includes(term)) {
      return 1.0;
    }

    // Calculate fuzzy match score
    const words = text.split(/\s+/);
    let bestScore = 0;

    for (const word of words) {
      // Skip very short words for fuzzy matching to avoid false positives
      if (word.length < 3 && term.length >= 4) {
        continue;
      }

      // Skip if the length difference is too large
      const lengthDiff = Math.abs(word.length - term.length);
      if (lengthDiff > Math.max(word.length, term.length) * 0.5) {
        continue;
      }

      const distance = this.levenshteinDistance(word, term);
      const maxLength = Math.max(word.length, term.length);
      const similarity = 1 - (distance / maxLength);

      if (similarity >= threshold) {
        bestScore = Math.max(bestScore, similarity);
      }
    }

    return bestScore;
  }

  /**
   * Calculate exact match score
   */
  private calculateExactScore(text: string, term: string): number {
    const termLength = term.length;
    const textLength = text.length;

    // Full match
    if (text === term) return 1.0;

    // Word boundary match
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'i');
    if (wordBoundaryRegex.test(text)) return 0.9;

    // Start of word match
    const startRegex = new RegExp(`\\b${this.escapeRegExp(term)}`, 'i');
    if (startRegex.test(text)) return 0.8;

    // Substring match
    if (text.includes(term)) {
      return 0.7 * (termLength / textLength);
    }

    return 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get field value from model
   */
  private getFieldValue(model: AIModel, field: SearchField): string {
    switch (field) {
      case 'name':
        return model.name || '';
      case 'description':
        return model.description || '';
      case 'provider':
        return model.provider || '';
      case 'category':
        return model.category || '';
      case 'modelId':
        return model.modelId || '';
      default:
        return '';
    }
  }

  /**
   * Get matching suggestions for a list of items
   */
  private getMatchingSuggestions(
    items: string[],
    query: string,
    type: SearchSuggestion['type']
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const lowerItem = item.toLowerCase();

      if (lowerItem.includes(query) && !seen.has(lowerItem)) {
        seen.add(lowerItem);
        suggestions.push({
          text: item,
          type,
          count: items.filter(i => i.toLowerCase() === lowerItem).length
        });
      }
    }

    return suggestions;
  }

  /**
   * Normalize search query
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate cache key for search
   */
  private generateSearchCacheKey(
    models: AIModel[],
    query: string,
    options: SearchOptions
  ): string {
    const modelHash = models.length.toString(); // Simple hash
    const optionsStr = JSON.stringify(options);
    return btoa(`${query}-${modelHash}-${optionsStr}`);
  }

  /**
   * Get from search cache
   */
  private getFromSearchCache(key: string): SearchResult[] | null {
    const cached = this.searchCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.results;
  }

  /**
   * Set search cache
   */
  private setSearchCache(key: string, results: SearchResult[]): void {
    this.searchCache.set(key, {
      results,
      timestamp: Date.now()
    });
  }

  /**
   * Get from suggestion cache
   */
  private getFromSuggestionCache(key: string): SearchSuggestion[] | null {
    const cached = this.suggestionCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.suggestionCacheTTL) {
      this.suggestionCache.delete(key);
      return null;
    }

    return cached.suggestions;
  }

  /**
   * Set suggestion cache
   */
  private setSuggestionCache(key: string, suggestions: SearchSuggestion[]): void {
    this.suggestionCache.set(key, {
      suggestions,
      timestamp: Date.now()
    });
  }

  /**
   * Log search analytics
   */
  private logSearchAnalytics(analytics: SearchAnalytics): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Search Analytics:', analytics);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.searchCache.clear();
    this.suggestionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    searchCache: { size: number; keys: number };
    suggestionCache: { size: number; keys: number };
  } {
    return {
      searchCache: {
        size: this.searchCache.size,
        keys: this.searchCache.size
      },
      suggestionCache: {
        size: this.suggestionCache.size,
        keys: this.suggestionCache.size
      }
    };
  }
}

/**
 * Create SearchService instance
 */
export const createSearchService = (): SearchService => {
  return new SearchService();
};

/**
 * Default SearchService instance
 */
export const searchService = createSearchService();