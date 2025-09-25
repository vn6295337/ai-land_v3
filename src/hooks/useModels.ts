/**
 * useModels Hook
 *
 * Custom React hook for fetching and managing AI model data
 * with caching, error handling, and automatic refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AIModel, FilterCriteria, SortOptions, SortDirection, APIResponse } from '../types/models';
import { ModelService, createModelService } from '../services/models';

/**
 * Hook options
 */
interface UseModelsOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Auto-refresh interval in minutes */
  refreshInterval?: number;
  /** Initial filter criteria */
  initialFilters?: FilterCriteria;
  /** Initial sort options */
  initialSort?: {
    field: SortOptions;
    direction: SortDirection;
  };
  /** Items per page */
  pageSize?: number;
  /** Enable real-time updates */
  realtime?: boolean;
}

/**
 * Hook return type
 */
interface UseModelsReturn {
  /** Model data */
  models: AIModel[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Total count of models */
  total: number;
  /** Current page */
  page: number;
  /** Whether there are more pages */
  hasMore: boolean;
  /** Refetch data */
  refetch: () => Promise<void>;
  /** Load more models (pagination) */
  loadMore: () => Promise<void>;
  /** Search models */
  search: (query: string) => Promise<void>;
  /** Apply filters */
  applyFilters: (filters: FilterCriteria) => Promise<void>;
  /** Sort models */
  sort: (field: SortOptions, direction?: SortDirection) => Promise<void>;
  /** Clear all filters and search */
  reset: () => Promise<void>;
  /** Refresh data */
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing AI models data
 */
export function useModels(options: UseModelsOptions = {}): UseModelsReturn {
  const {
    autoFetch = true,
    refreshInterval = 0,
    initialFilters = {},
    initialSort = { field: 'name', direction: 'asc' },
    pageSize = 50,
    realtime = false
  } = options;

  // State
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Refs
  const modelService = useRef<ModelService>();
  const refreshTimer = useRef<NodeJS.Timeout>();
  const abortController = useRef<AbortController>();

  // Current filters and sort
  const [currentFilters, setCurrentFilters] = useState<FilterCriteria>(initialFilters);
  const [currentSort, setCurrentSort] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initialize service
  useEffect(() => {
    modelService.current = createModelService();

    return () => {
      // Cleanup
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Fetch models function
  const fetchModels = useCallback(async (
    pageNum = 1,
    append = false,
    query = searchQuery,
    filters = currentFilters,
    sort = currentSort
  ): Promise<void> => {
    if (!modelService.current || loading) return;

    try {
      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setLoading(true);
      setError(null);

      let response: APIResponse<any>;

      if (query.trim()) {
        // Search mode
        response = await modelService.current.searchModels(query, filters);
      } else {
        // Regular fetch with pagination
        response = await modelService.current.fetchModels({
          page: pageNum,
          limit: pageSize,
          sortBy: sort.field,
          sortDirection: sort.direction,
          filters,
          includeMetrics: true
        });
      }

      if (response.success && response.data) {
        const newModels = response.data.models || [];

        setModels(prevModels =>
          append ? [...prevModels, ...newModels] : newModels
        );

        setTotal(response.data.total || newModels.length);
        setPage(response.data.page || pageNum);
        setHasMore(response.data.hasMore || false);
      } else {
        setError(response.error || 'Failed to fetch models');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, searchQuery, currentFilters, currentSort, pageSize]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchModels(1, false);
    }
  }, [autoFetch, fetchModels]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      refreshTimer.current = setInterval(() => {
        fetchModels(1, false);
      }, refreshInterval * 60 * 1000);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [refreshInterval, fetchModels]);

  // Real-time updates (using visibility API)
  useEffect(() => {
    if (!realtime) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchModels(1, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [realtime, fetchModels]);

  // Public methods
  const refetch = useCallback(async () => {
    await fetchModels(1, false);
  }, [fetchModels]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchModels(page + 1, true);
    }
  }, [hasMore, loading, page, fetchModels]);

  const search = useCallback(async (query: string) => {
    setSearchQuery(query);
    setPage(1);
    await fetchModels(1, false, query, currentFilters, currentSort);
  }, [currentFilters, currentSort, fetchModels]);

  const applyFilters = useCallback(async (filters: FilterCriteria) => {
    setCurrentFilters(filters);
    setPage(1);
    await fetchModels(1, false, searchQuery, filters, currentSort);
  }, [searchQuery, currentSort, fetchModels]);

  const sort = useCallback(async (field: SortOptions, direction: SortDirection = 'asc') => {
    const newSort = { field, direction };
    setCurrentSort(newSort);
    setPage(1);
    await fetchModels(1, false, searchQuery, currentFilters, newSort);
  }, [searchQuery, currentFilters, fetchModels]);

  const reset = useCallback(async () => {
    setSearchQuery('');
    setCurrentFilters(initialFilters);
    setCurrentSort(initialSort);
    setPage(1);
    await fetchModels(1, false, '', initialFilters, initialSort);
  }, [initialFilters, initialSort, fetchModels]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    models,
    loading,
    error,
    total,
    page,
    hasMore,
    refetch,
    loadMore,
    search,
    applyFilters,
    sort,
    reset,
    refresh
  };
}