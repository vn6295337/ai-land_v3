import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AIModel, FilterCriteria, SortOptions, SortDirection } from '../types/models';
import { ModelService } from '../services/models';
import { RealModelService } from '../services/realModelService';
import { FilterService } from '../services/filter';
import { SortService } from '../services/sort';
import { SearchService } from '../services/search';

export interface ModelsState {
  // Core data
  models: AIModel[];
  filteredModels: AIModel[];
  favorites: Set<string>;

  // Loading states
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Filtering & Sorting
  filters: FilterCriteria;
  sortBy: SortOptions;
  sortDirection: SortDirection;

  // Search
  searchQuery: string;
  searchResults: AIModel[];

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;

  // Cache control
  cacheExpiry: number;
  autoRefresh: boolean;
}

export interface ModelsActions {
  // Data fetching
  fetchModels: () => Promise<void>;
  refreshModels: () => Promise<void>;

  // Filtering
  setFilters: (filters: Partial<FilterCriteria>) => void;
  clearFilters: () => void;
  applyFilters: () => void;

  // Sorting
  setSorting: (sortBy: SortOptions, direction?: SortDirection) => void;
  toggleSortDirection: () => void;
  applySorting: () => void;

  // Search
  setSearchQuery: (query: string) => void;
  performSearch: () => void;
  clearSearch: () => void;

  // Favorites
  toggleFavorite: (modelId: string) => void;
  addFavorite: (modelId: string) => void;
  removeFavorite: (modelId: string) => void;
  clearFavorites: () => void;
  getFavoriteModels: () => AIModel[];

  // Pagination
  setPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Bulk operations
  selectModel: (model: AIModel) => void;
  selectModels: (modelIds: string[]) => void;
  clearSelection: () => void;

  // Cache & Refresh
  invalidateCache: () => void;
  setAutoRefresh: (enabled: boolean) => void;

  // Reset
  resetStore: () => void;
}

export type ModelsStore = ModelsState & ModelsActions;

const DEFAULT_FILTERS: FilterCriteria = {
  providers: [],
  categories: [],
  minCost: undefined,
  maxCost: undefined,
  capabilities: [],
  searchTerm: '',
  freeOnly: false,
  // Extended column-specific filters
  inferenceProviders: [],
  modelProviders: [],
  countries: [],
  inputModalities: [],
  outputModalities: [],
  licenses: [],
  rateLimits: []
};

const initialState: ModelsState = {
  models: [],
  filteredModels: [],
  favorites: new Set(),
  loading: false,
  error: null,
  lastUpdated: null,
  filters: DEFAULT_FILTERS,
  sortBy: 'name',
  sortDirection: 'asc',
  searchQuery: '',
  searchResults: [],
  currentPage: 1,
  itemsPerPage: 24,
  totalPages: 1,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
  autoRefresh: true
};

// Service instances - use real API service in production
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
const modelService = USE_REAL_API ? new RealModelService() : new ModelService();
const filterService = new FilterService();
const sortService = new SortService();
const searchService = new SearchService();

export const useModelsStore = create<ModelsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Data fetching
        fetchModels: async () => {
          const state = get();

          // Check cache validity
          if (
            state.models.length > 0 &&
            state.lastUpdated &&
            Date.now() - state.lastUpdated.getTime() < state.cacheExpiry
          ) {
            return;
          }

          set((draft) => {
            draft.loading = true;
            draft.error = null;
          });

          try {
            const response = await modelService.fetchModels();

            if (response.success && response.data) {
              set((draft) => {
                draft.models = response.data.models;
                draft.filteredModels = response.data.models;
                draft.lastUpdated = new Date();
                draft.loading = false;
                draft.totalPages = Math.ceil(response.data.models.length / draft.itemsPerPage);
              });

              // Apply current filters and sorting
              get().applyFilters();
              get().applySorting();
            } else {
              throw new Error(response.error || 'Failed to fetch models');
            }
          } catch (error) {
            set((draft) => {
              draft.error = error instanceof Error ? error.message : 'Unknown error occurred';
              draft.loading = false;
            });
          }
        },

        refreshModels: async () => {
          set((draft) => {
            draft.lastUpdated = null; // Force cache invalidation
          });
          await get().fetchModels();
        },

        // Filtering
        setFilters: (newFilters) => {
          set((draft) => {
            draft.filters = { ...draft.filters, ...newFilters };
            draft.currentPage = 1; // Reset to first page
          });
          get().applyFilters();
        },

        clearFilters: () => {
          set((draft) => {
            draft.filters = DEFAULT_FILTERS;
            draft.currentPage = 1;
          });
          get().applyFilters();
        },

        applyFilters: () => {
          const state = get();
          let filtered = filterService.applyFilters(state.models, state.filters);

          // Apply search filter if query exists
          if (state.searchQuery.trim()) {
            const searchResults = searchService.search(filtered, state.searchQuery);
            filtered = searchResults.map(result => result.model);
          }

          set((draft) => {
            draft.filteredModels = filtered;
            draft.totalPages = Math.ceil(filtered.length / draft.itemsPerPage);

            // Adjust current page if necessary
            if (draft.currentPage > draft.totalPages && draft.totalPages > 0) {
              draft.currentPage = draft.totalPages;
            }
          });

          get().applySorting();
        },

        // Sorting
        setSorting: (sortBy, direction = 'asc') => {
          set((draft) => {
            draft.sortBy = sortBy;
            draft.sortDirection = direction;
          });
          get().applySorting();
        },

        toggleSortDirection: () => {
          const state = get();
          const newDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
          get().setSorting(state.sortBy, newDirection);
        },

        applySorting: () => {
          const state = get();
          const sorted = sortService.sortModels(
            state.filteredModels,
            state.sortBy,
            state.sortDirection
          );

          set((draft) => {
            draft.filteredModels = sorted;
          });
        },

        // Search
        setSearchQuery: (query) => {
          set((draft) => {
            draft.searchQuery = query;
            draft.currentPage = 1;
          });
          get().performSearch();
        },

        performSearch: () => {
          const state = get();

          if (!state.searchQuery.trim()) {
            set((draft) => {
              draft.searchResults = [];
            });
            get().applyFilters();
            return;
          }

          const results = searchService.search(state.models, state.searchQuery);

          set((draft) => {
            draft.searchResults = results.map(result => result.model);
          });

          // Reapply filters with search results
          get().applyFilters();
        },

        clearSearch: () => {
          set((draft) => {
            draft.searchQuery = '';
            draft.searchResults = [];
            draft.currentPage = 1;
          });
          get().applyFilters();
        },

        // Favorites
        toggleFavorite: (modelId) => {
          set((draft) => {
            if (draft.favorites.has(modelId)) {
              draft.favorites.delete(modelId);
            } else {
              draft.favorites.add(modelId);
            }
          });
        },

        addFavorite: (modelId) => {
          set((draft) => {
            draft.favorites.add(modelId);
          });
        },

        removeFavorite: (modelId) => {
          set((draft) => {
            draft.favorites.delete(modelId);
          });
        },

        clearFavorites: () => {
          set((draft) => {
            draft.favorites.clear();
          });
        },

        getFavoriteModels: () => {
          const state = get();
          return state.models.filter(model => state.favorites.has(model.id));
        },

        // Pagination
        setPage: (page) => {
          const state = get();
          if (page >= 1 && page <= state.totalPages) {
            set((draft) => {
              draft.currentPage = page;
            });
          }
        },

        setItemsPerPage: (count) => {
          set((draft) => {
            draft.itemsPerPage = count;
            draft.totalPages = Math.ceil(draft.filteredModels.length / count);
            draft.currentPage = 1; // Reset to first page
          });
        },

        nextPage: () => {
          const state = get();
          if (state.currentPage < state.totalPages) {
            get().setPage(state.currentPage + 1);
          }
        },

        prevPage: () => {
          const state = get();
          if (state.currentPage > 1) {
            get().setPage(state.currentPage - 1);
          }
        },

        // Bulk operations
        selectModel: (model) => {
          // Implementation for model selection (if needed for bulk operations)
          console.log('Model selected:', model);
        },

        selectModels: (modelIds) => {
          // Implementation for bulk selection
          console.log('Models selected:', modelIds);
        },

        clearSelection: () => {
          // Implementation for clearing selection
          console.log('Selection cleared');
        },

        // Cache & Refresh
        invalidateCache: () => {
          set((draft) => {
            draft.lastUpdated = null;
          });
        },

        setAutoRefresh: (enabled) => {
          set((draft) => {
            draft.autoRefresh = enabled;
          });
        },

        // Reset
        resetStore: () => {
          set(initialState);
        }
      })),
      {
        name: 'models-store',
        partialize: (state) => ({
          favorites: Array.from(state.favorites), // Convert Set to Array for serialization
          filters: state.filters,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
          itemsPerPage: state.itemsPerPage,
          autoRefresh: state.autoRefresh
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert Array back to Set after rehydration
            state.favorites = new Set(state.favorites as unknown as string[]);
          }
        }
      }
    ),
    {
      name: 'models-store'
    }
  )
);

// Selectors for commonly used derived state
export const modelsSelectors = {
  // Get paginated models for current page
  getCurrentPageModels: (state: ModelsStore) => {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    return state.filteredModels.slice(startIndex, endIndex);
  },

  // Get pagination info
  getPaginationInfo: (state: ModelsStore) => ({
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    itemsPerPage: state.itemsPerPage,
    totalItems: state.filteredModels.length,
    hasNextPage: state.currentPage < state.totalPages,
    hasPrevPage: state.currentPage > 1
  }),

  // Get filter summary
  getFilterSummary: (state: ModelsStore) => {
    const activeFilters = Object.entries(state.filters).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== undefined && value !== null;
    });

    return {
      activeCount: activeFilters.length,
      filters: activeFilters,
      hasActiveFilters: activeFilters.length > 0
    };
  },

  // Get loading state info
  getLoadingInfo: (state: ModelsStore) => ({
    loading: state.loading,
    error: state.error,
    hasData: state.models.length > 0,
    lastUpdated: state.lastUpdated,
    cacheValid: state.lastUpdated &&
      Date.now() - state.lastUpdated.getTime() < state.cacheExpiry
  }),

  // Get search info
  getSearchInfo: (state: ModelsStore) => ({
    query: state.searchQuery,
    hasQuery: state.searchQuery.trim() !== '',
    resultsCount: state.searchResults.length,
    filteredCount: state.filteredModels.length
  })
};

export default useModelsStore;