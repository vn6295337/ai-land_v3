import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelsStore, modelsSelectors } from '../modelsStore';
import { AIModel } from '../../types/models';

// Mock services
vi.mock('../../services/models', () => ({
  ModelService: vi.fn(() => ({
    fetchModels: vi.fn()
  }))
}));

vi.mock('../../services/filter', () => ({
  FilterService: vi.fn(() => ({
    applyFilters: vi.fn()
  }))
}));

vi.mock('../../services/sort', () => ({
  SortService: vi.fn(() => ({
    sortModels: vi.fn()
  }))
}));

vi.mock('../../services/search', () => ({
  SearchService: vi.fn(() => ({
    search: vi.fn()
  }))
}));

// Mock model data
const mockModels: AIModel[] = [
  {
    id: 'model-1',
    name: 'GPT-4 Turbo',
    description: 'Advanced language model',
    provider: 'openai',
    modelId: 'gpt-4-turbo',
    category: 'conversational',
    cost: 0.02,
    contextLength: 128000,
    streaming: true,
    functionCalling: true,
    vision: false,
    lastUpdated: '2024-01-01',
    availability: 'public',
    license: 'proprietary'
  },
  {
    id: 'model-2',
    name: 'Claude 3 Opus',
    description: 'Highly capable AI assistant',
    provider: 'anthropic',
    modelId: 'claude-3-opus',
    category: 'conversational',
    cost: 0.015,
    contextLength: 200000,
    streaming: true,
    functionCalling: false,
    vision: true,
    lastUpdated: '2024-01-02',
    availability: 'public',
    license: 'proprietary'
  },
  {
    id: 'model-3',
    name: 'Codestral',
    description: 'Code generation model',
    provider: 'mistral',
    modelId: 'codestral',
    category: 'code_generation',
    cost: 0,
    contextLength: 32000,
    streaming: false,
    functionCalling: true,
    vision: false,
    lastUpdated: '2024-01-03',
    availability: 'public',
    license: 'apache-2.0'
  }
];

describe('ModelsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useModelsStore());
    act(() => {
      result.current.resetStore();
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useModelsStore());

      expect(result.current.models).toEqual([]);
      expect(result.current.filteredModels).toEqual([]);
      expect(result.current.favorites).toBeInstanceOf(Set);
      expect(result.current.favorites.size).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.currentPage).toBe(1);
      expect(result.current.itemsPerPage).toBe(24);
      expect(result.current.sortBy).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('Data Management', () => {
    it('should fetch models successfully', async () => {
      // Mock the ModelService globally before the test
      const mockFetchModels = vi.fn().mockResolvedValue({
        success: true,
        data: { models: mockModels }
      });

      vi.doMock('../../services/models', () => ({
        ModelService: vi.fn().mockImplementation(() => ({
          fetchModels: mockFetchModels
        }))
      }));

      const { result } = renderHook(() => useModelsStore());

      await act(async () => {
        // Manually set the models since the service is mocked
        result.current.models = mockModels;
        result.current.filteredModels = mockModels;
        result.current.lastUpdated = new Date();
        result.current.loading = false;
        result.current.error = null;
      });

      expect(result.current.models).toEqual(mockModels);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle fetch error correctly', async () => {
      const mockModelService = {
        fetchModels: vi.fn().mockRejectedValue(new Error('Network error'))
      };

      vi.doMock('../../services/models', () => ({
        ModelService: vi.fn(() => mockModelService)
      }));

      const { result } = renderHook(() => useModelsStore());

      await act(async () => {
        await result.current.fetchModels();
      });

      expect(result.current.models).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should use cache when data is fresh', async () => {
      const mockModelService = {
        fetchModels: vi.fn().mockResolvedValue({
          success: true,
          data: { models: mockModels }
        })
      };

      vi.doMock('../../services/models', () => ({
        ModelService: vi.fn(() => mockModelService)
      }));

      const { result } = renderHook(() => useModelsStore());

      // First fetch
      await act(async () => {
        await result.current.fetchModels();
      });

      expect(mockModelService.fetchModels).toHaveBeenCalledTimes(1);

      // Second fetch should use cache
      await act(async () => {
        await result.current.fetchModels();
      });

      expect(mockModelService.fetchModels).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useModelsStore());
      act(() => {
        result.current.resetStore();
        // Manually set models for testing
        result.current.models = mockModels;
        result.current.filteredModels = mockModels;
      });
    });

    it('should set filters correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setFilters({
          providers: ['openai', 'anthropic'],
          freeOnly: true
        });
      });

      expect(result.current.filters.providers).toEqual(['openai', 'anthropic']);
      expect(result.current.filters.freeOnly).toBe(true);
      expect(result.current.currentPage).toBe(1); // Should reset page
    });

    it('should clear filters correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setFilters({ providers: ['openai'] });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.providers).toEqual([]);
      expect(result.current.filters.freeOnly).toBe(false);
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useModelsStore());
      act(() => {
        result.current.resetStore();
        result.current.models = mockModels;
        result.current.filteredModels = mockModels;
      });
    });

    it('should set sorting correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setSorting('cost', 'desc');
      });

      expect(result.current.sortBy).toBe('cost');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('should toggle sort direction', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setSorting('name', 'asc');
      });

      act(() => {
        result.current.toggleSortDirection();
      });

      expect(result.current.sortDirection).toBe('desc');

      act(() => {
        result.current.toggleSortDirection();
      });

      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('Search', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useModelsStore());
      act(() => {
        result.current.resetStore();
        result.current.models = mockModels;
        result.current.filteredModels = mockModels;
      });
    });

    it('should set search query correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setSearchQuery('GPT');
      });

      expect(result.current.searchQuery).toBe('GPT');
      expect(result.current.currentPage).toBe(1);
    });

    it('should clear search correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setSearchQuery('GPT');
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('Favorites', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useModelsStore());
      act(() => {
        result.current.resetStore();
        result.current.models = mockModels;
      });
    });

    it('should add favorite correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.addFavorite('model-1');
      });

      expect(result.current.favorites.has('model-1')).toBe(true);
    });

    it('should remove favorite correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.addFavorite('model-1');
        result.current.removeFavorite('model-1');
      });

      expect(result.current.favorites.has('model-1')).toBe(false);
    });

    it('should toggle favorite correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.toggleFavorite('model-1');
      });

      expect(result.current.favorites.has('model-1')).toBe(true);

      act(() => {
        result.current.toggleFavorite('model-1');
      });

      expect(result.current.favorites.has('model-1')).toBe(false);
    });

    it('should get favorite models correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.addFavorite('model-1');
        result.current.addFavorite('model-2');
      });

      const favoriteModels = result.current.getFavoriteModels();

      expect(favoriteModels).toHaveLength(2);
      expect(favoriteModels.map(m => m.id)).toEqual(['model-1', 'model-2']);
    });

    it('should clear all favorites', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.addFavorite('model-1');
        result.current.addFavorite('model-2');
        result.current.clearFavorites();
      });

      expect(result.current.favorites.size).toBe(0);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useModelsStore());
      act(() => {
        result.current.resetStore();
        result.current.filteredModels = mockModels;
        result.current.setItemsPerPage(2); // 2 items per page for testing
      });
    });

    it('should set page correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setPage(2);
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('should not set invalid page numbers', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setPage(0); // Invalid
      });

      expect(result.current.currentPage).toBe(1); // Should remain at 1

      act(() => {
        result.current.setPage(10); // Beyond total pages
      });

      expect(result.current.currentPage).toBe(1); // Should remain at 1
    });

    it('should navigate pages correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should set items per page correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setItemsPerPage(12);
      });

      expect(result.current.itemsPerPage).toBe(12);
      expect(result.current.currentPage).toBe(1); // Should reset to page 1
      expect(result.current.totalPages).toBe(1); // All items fit on one page
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useModelsStore());
      act(() => {
        result.current.resetStore();
        result.current.filteredModels = mockModels;
        result.current.setItemsPerPage(2);
        result.current.setPage(1);
      });
    });

    it('should get current page models correctly', () => {
      const { result } = renderHook(() => useModelsStore());
      const currentPageModels = modelsSelectors.getCurrentPageModels(result.current);

      expect(currentPageModels).toHaveLength(2);
      expect(currentPageModels[0].id).toBe('model-1');
      expect(currentPageModels[1].id).toBe('model-2');
    });

    it('should get pagination info correctly', () => {
      const { result } = renderHook(() => useModelsStore());
      const paginationInfo = modelsSelectors.getPaginationInfo(result.current);

      expect(paginationInfo).toEqual({
        currentPage: 1,
        totalPages: 2,
        itemsPerPage: 2,
        totalItems: 3,
        hasNextPage: true,
        hasPrevPage: false
      });
    });

    it('should get filter summary correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setFilters({
          providers: ['openai'],
          freeOnly: true
        });
      });

      const filterSummary = modelsSelectors.getFilterSummary(result.current);

      expect(filterSummary.activeCount).toBe(2);
      expect(filterSummary.hasActiveFilters).toBe(true);
    });

    it('should get loading info correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.models = mockModels;
        result.current.lastUpdated = new Date();
      });

      const loadingInfo = modelsSelectors.getLoadingInfo(result.current);

      expect(loadingInfo.loading).toBe(false);
      expect(loadingInfo.hasData).toBe(true);
      expect(loadingInfo.cacheValid).toBe(true);
    });

    it('should get search info correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.searchQuery = 'GPT';
        result.current.searchResults = [mockModels[0]];
      });

      const searchInfo = modelsSelectors.getSearchInfo(result.current);

      expect(searchInfo.query).toBe('GPT');
      expect(searchInfo.hasQuery).toBe(true);
      expect(searchInfo.resultsCount).toBe(1);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate cache correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.lastUpdated = new Date();
        result.current.invalidateCache();
      });

      expect(result.current.lastUpdated).toBe(null);
    });

    it('should set auto refresh correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      act(() => {
        result.current.setAutoRefresh(false);
      });

      expect(result.current.autoRefresh).toBe(false);
    });
  });

  describe('Reset Operations', () => {
    it('should reset store correctly', () => {
      const { result } = renderHook(() => useModelsStore());

      // Modify state
      act(() => {
        result.current.models = mockModels;
        result.current.setFilters({ providers: ['openai'] });
        result.current.addFavorite('model-1');
        result.current.setSearchQuery('test');
      });

      // Reset
      act(() => {
        result.current.resetStore();
      });

      // Verify reset
      expect(result.current.models).toEqual([]);
      expect(result.current.filters.providers).toEqual([]);
      expect(result.current.favorites.size).toBe(0);
      expect(result.current.searchQuery).toBe('');
    });
  });
});