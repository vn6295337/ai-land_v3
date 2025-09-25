/**
 * useSearch Hook
 *
 * Custom React hook for managing search functionality with
 * debounced queries, suggestions, and search history.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AIModel, FilterCriteria } from '../types/models';
import { SearchService, createSearchService } from '../services/search';

/**
 * Search result with relevance scoring
 */
interface SearchResult {
  model: AIModel;
  score: number;
  matches: Array<{
    field: string;
    value: string;
    matchedText: string;
    score: number;
  }>;
}

/**
 * Search suggestion
 */
interface SearchSuggestion {
  text: string;
  type: 'model' | 'provider' | 'category' | 'capability';
  count: number;
}

/**
 * Search history entry
 */
interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  resultsCount: number;
}

/**
 * Hook options
 */
interface UseSearchOptions {
  /** Debounce delay in milliseconds */
  debounceDelay?: number;
  /** Enable fuzzy matching */
  fuzzy?: boolean;
  /** Fuzzy match threshold (0-1) */
  threshold?: number;
  /** Maximum number of results */
  maxResults?: number;
  /** Maximum suggestions */
  maxSuggestions?: number;
  /** Maximum history entries */
  maxHistory?: number;
  /** Minimum query length for search */
  minQueryLength?: number;
  /** Enable search suggestions */
  enableSuggestions?: boolean;
  /** Enable search history */
  enableHistory?: boolean;
}

/**
 * Hook return type
 */
interface UseSearchReturn {
  /** Current search query */
  query: string;
  /** Update search query */
  setQuery: (query: string) => void;
  /** Search results */
  results: SearchResult[];
  /** Search suggestions */
  suggestions: SearchSuggestion[];
  /** Search history */
  history: SearchHistoryEntry[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Whether search is active */
  isSearching: boolean;
  /** Perform search */
  search: (models: AIModel[], filters?: FilterCriteria) => void;
  /** Clear search */
  clearSearch: () => void;
  /** Get suggestions */
  getSuggestions: (models: AIModel[], query?: string) => void;
  /** Apply suggestion */
  applySuggestion: (suggestion: SearchSuggestion) => void;
  /** Clear search history */
  clearHistory: () => void;
  /** Highlight matches in text */
  highlightMatches: (text: string) => string;
  /** Search statistics */
  stats: {
    totalResults: number;
    avgScore: number;
    searchTime: number;
  };
}

/**
 * Custom hook for search functionality
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    debounceDelay = 300,
    fuzzy = true,
    threshold = 0.3,
    maxResults = 100,
    maxSuggestions = 10,
    maxHistory = 20,
    minQueryLength = 2,
    enableSuggestions = true,
    enableHistory = true
  } = options;

  // Services
  const searchService = useRef<SearchService>();

  // State
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalResults: 0,
    avgScore: 0,
    searchTime: 0
  });

  // Refs
  const searchTimer = useRef<NodeJS.Timeout>();
  const suggestionsTimer = useRef<NodeJS.Timeout>();
  const lastSearchTime = useRef<number>(0);

  // Initialize search service
  useEffect(() => {
    searchService.current = createSearchService();
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    if (enableHistory) {
      try {
        const savedHistory = localStorage.getItem('search_history');
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          setHistory(Array.isArray(parsed) ? parsed.slice(0, maxHistory) : []);
        }
      } catch (error) {
        console.warn('Failed to load search history:', error);
      }
    }
  }, [enableHistory, maxHistory]);

  // Save search history to localStorage
  const saveHistory = useCallback((newHistory: SearchHistoryEntry[]) => {
    if (enableHistory) {
      try {
        localStorage.setItem('search_history', JSON.stringify(newHistory));
      } catch (error) {
        console.warn('Failed to save search history:', error);
      }
    }
  }, [enableHistory]);

  // Add to search history
  const addToHistory = useCallback((query: string, resultsCount: number) => {
    if (!enableHistory || !query.trim()) return;

    const newEntry: SearchHistoryEntry = {
      query: query.trim(),
      timestamp: Date.now(),
      resultsCount
    };

    setHistory(prevHistory => {
      // Remove duplicate queries
      const filteredHistory = prevHistory.filter(entry =>
        entry.query.toLowerCase() !== newEntry.query.toLowerCase()
      );

      // Add new entry and limit size
      const newHistory = [newEntry, ...filteredHistory].slice(0, maxHistory);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [enableHistory, maxHistory, saveHistory]);

  // Debounced search function
  const debouncedSearch = useCallback((
    models: AIModel[],
    searchQuery: string,
    filters?: FilterCriteria
  ) => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    if (!searchQuery.trim() || searchQuery.length < minQueryLength) {
      setResults([]);
      setStats({ totalResults: 0, avgScore: 0, searchTime: 0 });
      return;
    }

    searchTimer.current = setTimeout(async () => {
      if (!searchService.current) return;

      try {
        setLoading(true);
        setError(null);

        const startTime = performance.now();
        lastSearchTime.current = startTime;

        const searchResults = searchService.current.search(models, searchQuery, {
          fuzzy,
          threshold,
          limit: maxResults,
          includeMatches: true,
          filters
        });

        const endTime = performance.now();
        const searchTime = endTime - startTime;

        // Only update if this is the most recent search
        if (startTime === lastSearchTime.current) {
          setResults(searchResults);

          // Calculate statistics
          const totalResults = searchResults.length;
          const avgScore = totalResults > 0
            ? searchResults.reduce((sum, result) => sum + result.score, 0) / totalResults
            : 0;

          setStats({
            totalResults,
            avgScore,
            searchTime
          });

          // Add to history
          addToHistory(searchQuery, totalResults);
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Search failed');
        }
      } finally {
        setLoading(false);
      }
    }, debounceDelay);
  }, [debounceDelay, fuzzy, threshold, maxResults, minQueryLength, addToHistory]);

  // Debounced suggestions function
  const debouncedSuggestions = useCallback((models: AIModel[], searchQuery: string) => {
    if (!enableSuggestions || !searchService.current) return;

    if (suggestionsTimer.current) {
      clearTimeout(suggestionsTimer.current);
    }

    if (!searchQuery.trim() || searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    suggestionsTimer.current = setTimeout(() => {
      if (searchService.current) {
        const searchSuggestions = searchService.current.getSuggestions(
          models,
          searchQuery,
          maxSuggestions
        );
        setSuggestions(searchSuggestions);
      }
    }, debounceDelay / 2); // Suggestions load faster than search
  }, [enableSuggestions, maxSuggestions, debounceDelay]);

  // Update query with debounced search and suggestions
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  // Perform search
  const search = useCallback((models: AIModel[], filters?: FilterCriteria) => {
    debouncedSearch(models, query, filters);
  }, [query, debouncedSearch]);

  // Get suggestions
  const getSuggestions = useCallback((models: AIModel[], searchQuery?: string) => {
    debouncedSuggestions(models, searchQuery || query);
  }, [query, debouncedSuggestions]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setResults([]);
    setSuggestions([]);
    setError(null);
    setStats({ totalResults: 0, avgScore: 0, searchTime: 0 });

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    if (suggestionsTimer.current) {
      clearTimeout(suggestionsTimer.current);
    }
  }, []);

  // Apply suggestion
  const applySuggestion = useCallback((suggestion: SearchSuggestion) => {
    setQueryState(suggestion.text);
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    setHistory([]);
    if (enableHistory) {
      try {
        localStorage.removeItem('search_history');
      } catch (error) {
        console.warn('Failed to clear search history:', error);
      }
    }
  }, [enableHistory]);

  // Highlight matches
  const highlightMatches = useCallback((text: string): string => {
    if (!query.trim() || !searchService.current) {
      return text;
    }
    return searchService.current.highlightMatches(text, query);
  }, [query]);

  // Check if currently searching
  const isSearching = query.trim().length >= minQueryLength;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
      if (suggestionsTimer.current) {
        clearTimeout(suggestionsTimer.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    suggestions,
    history,
    loading,
    error,
    isSearching,
    search,
    clearSearch,
    getSuggestions,
    applySuggestion,
    clearHistory,
    highlightMatches,
    stats
  };
}