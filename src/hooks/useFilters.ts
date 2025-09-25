/**
 * useFilters Hook
 *
 * Custom React hook for managing filter state with persistence,
 * validation, and change tracking.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { FilterCriteria, ModelProvider, ModelCategory } from '../types/models';
import { FilterService, createFilterService } from '../services/filter';
import { PreferencesService, createPreferencesService } from '../services/preferences';

/**
 * Filter history entry
 */
interface FilterHistoryEntry {
  filters: FilterCriteria;
  timestamp: number;
  label?: string;
}

/**
 * Hook options
 */
interface UseFiltersOptions {
  /** Initial filter values */
  initialFilters?: FilterCriteria;
  /** Persist filters to storage */
  persist?: boolean;
  /** Maximum history entries */
  maxHistory?: number;
  /** Debounce delay in milliseconds */
  debounceDelay?: number;
}

/**
 * Hook return type
 */
interface UseFiltersReturn {
  /** Current filter criteria */
  filters: FilterCriteria;
  /** Update filters */
  setFilters: (filters: FilterCriteria) => void;
  /** Update a specific filter */
  updateFilter: <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Clear a specific filter */
  clearFilter: (key: keyof FilterCriteria) => void;
  /** Reset to initial filters */
  resetFilters: () => void;
  /** Check if any filters are active */
  hasActiveFilters: boolean;
  /** Count of active filters */
  activeFilterCount: number;
  /** Filter history */
  history: FilterHistoryEntry[];
  /** Apply filters from history */
  applyFromHistory: (index: number) => void;
  /** Save current filters to history */
  saveToHistory: (label?: string) => void;
  /** Clear filter history */
  clearHistory: () => void;
  /** Get filter summary */
  getFilterSummary: () => string[];
}

/**
 * Custom hook for managing filters
 */
export function useFilters(options: UseFiltersOptions = {}): UseFiltersReturn {
  const {
    initialFilters = {},
    persist = true,
    maxHistory = 10,
    debounceDelay = 300
  } = options;

  // Services
  const filterService = useRef<FilterService>();
  const preferencesService = useRef<PreferencesService>();

  // State
  const [filters, setFiltersState] = useState<FilterCriteria>(initialFilters);
  const [history, setHistory] = useState<FilterHistoryEntry[]>([]);

  // Refs for debouncing
  const debounceTimer = useRef<NodeJS.Timeout>();
  const lastSavedFilters = useRef<FilterCriteria>(initialFilters);

  // Initialize services
  useEffect(() => {
    filterService.current = createFilterService();
    preferencesService.current = createPreferencesService();

    // Load persisted filters
    if (persist && preferencesService.current) {
      const savedFilters = preferencesService.current.getDefaultFilters();
      if (savedFilters && Object.keys(savedFilters).length > 0) {
        setFiltersState(savedFilters as FilterCriteria);
        lastSavedFilters.current = savedFilters as FilterCriteria;
      }
    }
  }, [persist]);

  // Debounced persistence
  const saveFilters = useCallback((filtersToSave: FilterCriteria) => {
    if (!persist || !preferencesService.current) return;

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      if (JSON.stringify(filtersToSave) !== JSON.stringify(lastSavedFilters.current)) {
        preferencesService.current!.setDefaultFilters(filtersToSave);
        lastSavedFilters.current = filtersToSave;
      }
    }, debounceDelay);
  }, [persist, debounceDelay]);

  // Update filters
  const setFilters = useCallback((newFilters: FilterCriteria) => {
    setFiltersState(newFilters);
    saveFilters(newFilters);
  }, [saveFilters]);

  // Update a specific filter
  const updateFilter = useCallback(<K extends keyof FilterCriteria>(
    key: K,
    value: FilterCriteria[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  }, [filters, setFilters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  // Clear a specific filter
  const clearFilter = useCallback((key: keyof FilterCriteria) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
  }, [filters, setFilters]);

  // Reset to initial filters
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters, setFilters]);

  // Check if any filters are active
  const hasActiveFilters = filterService.current?.hasActiveFilters(filters) ?? false;

  // Count active filters
  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof FilterCriteria];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && value !== '';
  }).length;

  // History management
  const applyFromHistory = useCallback((index: number) => {
    if (index >= 0 && index < history.length) {
      setFilters(history[index].filters);
    }
  }, [history, setFilters]);

  const saveToHistory = useCallback((label?: string) => {
    const newEntry: FilterHistoryEntry = {
      filters: { ...filters },
      timestamp: Date.now(),
      label
    };

    setHistory(prevHistory => {
      // Remove duplicate entries
      const filteredHistory = prevHistory.filter(entry =>
        JSON.stringify(entry.filters) !== JSON.stringify(newEntry.filters)
      );

      // Add new entry and limit size
      const newHistory = [newEntry, ...filteredHistory];
      return newHistory.slice(0, maxHistory);
    });
  }, [filters, maxHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Get filter summary for display
  const getFilterSummary = useCallback((): string[] => {
    const summary: string[] = [];

    if (filters.provider) {
      const providers = Array.isArray(filters.provider) ? filters.provider : [filters.provider];
      summary.push(`Provider: ${providers.join(', ')}`);
    }

    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      summary.push(`Category: ${categories.join(', ')}`);
    }

    if (filters.searchTerm) {
      summary.push(`Search: "${filters.searchTerm}"`);
    }

    if (filters.minAccuracy !== undefined) {
      summary.push(`Min Accuracy: ${filters.minAccuracy}%`);
    }

    if (filters.maxCost !== undefined) {
      summary.push(`Max Cost: $${filters.maxCost}`);
    }

    if (filters.minParameters !== undefined) {
      summary.push(`Min Parameters: ${filters.minParameters}B`);
    }

    if (filters.maxParameters !== undefined) {
      summary.push(`Max Parameters: ${filters.maxParameters}B`);
    }

    if (filters.minContextWindow !== undefined) {
      summary.push(`Min Context: ${filters.minContextWindow.toLocaleString()} tokens`);
    }

    if (filters.capabilities) {
      const capabilities: string[] = [];
      if (filters.capabilities.streaming) capabilities.push('Streaming');
      if (filters.capabilities.functionCalling) capabilities.push('Function Calling');
      if (filters.capabilities.vision) capabilities.push('Vision');

      if (capabilities.length > 0) {
        summary.push(`Capabilities: ${capabilities.join(', ')}`);
      }
    }

    if (filters.availableOnly) {
      summary.push('Available Only');
    }

    if (filters.dateRange) {
      let dateStr = 'Release Date: ';
      if (filters.dateRange.from) {
        dateStr += `from ${new Date(filters.dateRange.from).toLocaleDateString()}`;
      }
      if (filters.dateRange.to) {
        dateStr += ` to ${new Date(filters.dateRange.to).toLocaleDateString()}`;
      }
      summary.push(dateStr);
    }

    return summary;
  }, [filters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    clearFilter,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
    history,
    applyFromHistory,
    saveToHistory,
    clearHistory,
    getFilterSummary
  };
}