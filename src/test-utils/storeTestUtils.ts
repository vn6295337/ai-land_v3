/**
 * Test utilities for store testing
 */

import { vi } from 'vitest';
import { AIModel } from '../types/models';

// Mock data
export const mockModels: AIModel[] = [
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

// Mock DOM APIs that are needed for UI store
export const setupDOMMocks = () => {
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock document.documentElement
  Object.defineProperty(document, 'documentElement', {
    writable: true,
    value: {
      classList: {
        toggle: vi.fn(),
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn().mockReturnValue(false)
      },
      style: {
        setProperty: vi.fn()
      }
    }
  });
};

// Mock store factory
export const createMockModelsStore = (overrides = {}) => ({
  // State
  models: [],
  filteredModels: [],
  favorites: new Set(),
  loading: false,
  error: null,
  lastUpdated: null,
  filters: {
    providers: [],
    categories: [],
    minCost: undefined,
    maxCost: undefined,
    capabilities: [],
    searchTerm: '',
    freeOnly: false
  },
  sortBy: 'name' as const,
  sortDirection: 'asc' as const,
  searchQuery: '',
  searchResults: [],
  currentPage: 1,
  itemsPerPage: 24,
  totalPages: 1,
  cacheExpiry: 5 * 60 * 1000,
  autoRefresh: true,

  // Actions
  fetchModels: vi.fn(),
  refreshModels: vi.fn(),
  setFilters: vi.fn(),
  clearFilters: vi.fn(),
  applyFilters: vi.fn(),
  setSorting: vi.fn(),
  toggleSortDirection: vi.fn(),
  applySorting: vi.fn(),
  setSearchQuery: vi.fn(),
  performSearch: vi.fn(),
  clearSearch: vi.fn(),
  toggleFavorite: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  clearFavorites: vi.fn(),
  getFavoriteModels: vi.fn(),
  setPage: vi.fn(),
  setItemsPerPage: vi.fn(),
  nextPage: vi.fn(),
  prevPage: vi.fn(),
  selectModel: vi.fn(),
  selectModels: vi.fn(),
  clearSelection: vi.fn(),
  invalidateCache: vi.fn(),
  setAutoRefresh: vi.fn(),
  resetStore: vi.fn(),
  ...overrides
});

export const createMockUIStore = (overrides = {}) => ({
  // State
  viewMode: 'grid' as const,
  theme: 'system' as const,
  sidebarState: 'expanded' as const,
  showFilters: false,
  showKPIs: true,
  showQuickViews: true,
  compactHeader: false,
  isMobile: false,
  showMobileFilters: false,
  showMobileMenu: false,
  selectedModelId: null,
  showModelDetails: false,
  showSettings: false,
  showExportDialog: false,
  showToast: false,
  toastMessage: '',
  toastType: 'info' as const,
  reducedMotion: false,
  highContrast: false,
  focusVisible: false,
  enableVirtualization: true,
  enableAnimations: true,
  autoSave: true,
  notifications: true,
  analytics: false,

  // Actions
  setViewMode: vi.fn(),
  toggleViewMode: vi.fn(),
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
  applySystemTheme: vi.fn(),
  setSidebarState: vi.fn(),
  toggleSidebar: vi.fn(),
  collapseSidebar: vi.fn(),
  expandSidebar: vi.fn(),
  toggleFilters: vi.fn(),
  toggleKPIs: vi.fn(),
  toggleQuickViews: vi.fn(),
  toggleCompactHeader: vi.fn(),
  setMobile: vi.fn(),
  toggleMobileFilters: vi.fn(),
  toggleMobileMenu: vi.fn(),
  closeMobileOverlays: vi.fn(),
  openModelDetails: vi.fn(),
  closeModelDetails: vi.fn(),
  selectModel: vi.fn(),
  openSettings: vi.fn(),
  closeSettings: vi.fn(),
  openExportDialog: vi.fn(),
  closeExportDialog: vi.fn(),
  closeAllModals: vi.fn(),
  showToastMessage: vi.fn(),
  hideToast: vi.fn(),
  setReducedMotion: vi.fn(),
  setHighContrast: vi.fn(),
  setFocusVisible: vi.fn(),
  detectAccessibilityPreferences: vi.fn(),
  setVirtualization: vi.fn(),
  setAnimations: vi.fn(),
  setAutoSave: vi.fn(),
  setNotifications: vi.fn(),
  setAnalytics: vi.fn(),
  resetUI: vi.fn(),
  resetLayout: vi.fn(),
  resetPreferences: vi.fn(),
  ...overrides
});

// Mock selectors
export const createMockSelectors = () => ({
  getCurrentPageModels: vi.fn().mockReturnValue([]),
  getPaginationInfo: vi.fn().mockReturnValue({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 24,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  }),
  getFilterSummary: vi.fn().mockReturnValue({
    activeCount: 0,
    filters: [],
    hasActiveFilters: false
  }),
  getLoadingInfo: vi.fn().mockReturnValue({
    loading: false,
    error: null,
    hasData: false,
    lastUpdated: null,
    cacheValid: false
  }),
  getSearchInfo: vi.fn().mockReturnValue({
    query: '',
    hasQuery: false,
    resultsCount: 0,
    filteredCount: 0
  })
});

export const createMockUISelectors = () => ({
  getModalState: vi.fn().mockReturnValue({
    hasOpenModal: false,
    modelDetailsOpen: false,
    settingsOpen: false,
    exportDialogOpen: false,
    selectedModelId: null
  }),
  getMobileState: vi.fn().mockReturnValue({
    isMobile: false,
    hasOpenOverlay: false,
    filtersOpen: false,
    menuOpen: false
  }),
  getThemeInfo: vi.fn().mockReturnValue({
    theme: 'system',
    isDarkMode: false,
    isSystemTheme: true,
    highContrast: false
  }),
  getAccessibilityState: vi.fn().mockReturnValue({
    reducedMotion: false,
    highContrast: false,
    focusVisible: false,
    animationsEnabled: true
  }),
  getLayoutState: vi.fn().mockReturnValue({
    viewMode: 'grid',
    sidebarState: 'expanded',
    showFilters: false,
    showKPIs: true,
    showQuickViews: true,
    compactHeader: false,
    sidebarExpanded: true,
    sidebarVisible: true
  })
});