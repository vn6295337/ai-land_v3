import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Filter, Search } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { useModelsStore } from '../../stores/modelsStore';
import { AIModel } from '../../types/models';

export interface AdvancedFiltersProps extends ComponentProps {
  showClearButton?: boolean;
}

interface ColumnFilter {
  field: keyof AIModel;
  label: string;
  isActive: boolean;
  selectedValues: string[];
  availableValues: string[];
  searchQuery: string;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  showClearButton = true,
  className = '',
  testId = 'advanced-filters'
}) => {
  const {
    models,
    filteredModels,
    filters,
    setFilters,
    clearFilters
  } = useModelsStore();

  // State for dropdown visibility and search queries
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement>>({});

  // Column filter configuration matching ai-land dashboard
  const columnFilters: ColumnFilter[] = [
    {
      field: 'inferenceProvider',
      label: 'Inference Provider',
      isActive: false,
      selectedValues: [],
      availableValues: [],
      searchQuery: ''
    },
    {
      field: 'modelProvider',
      label: 'Model Provider',
      isActive: false,
      selectedValues: [],
      availableValues: [],
      searchQuery: ''
    },
    {
      field: 'country',
      label: 'Country',
      isActive: false,
      selectedValues: [],
      availableValues: [],
      searchQuery: ''
    },
    {
      field: 'inputModalities',
      label: 'Input Types',
      isActive: false,
      selectedValues: [],
      availableValues: [],
      searchQuery: ''
    },
    {
      field: 'outputModalities',
      label: 'Output Types',
      isActive: false,
      selectedValues: [],
      availableValues: [],
      searchQuery: ''
    },
    {
      field: 'license',
      label: 'License',
      isActive: false,
      selectedValues: [],
      availableValues: [],
      searchQuery: ''
    },
    {
      field: 'rateLimits',
      label: 'Rate Limits',
      isActive: false,
      selectedValues: [],
      availableValues: [],
      searchQuery: ''
    }
  ];

  // Get unique values for each filter column
  const getUniqueValues = (field: keyof AIModel): string[] => {
    const values = models
      .map(model => {
        const value = model[field];
        return value ? String(value).trim() : 'N/A';
      })
      .filter(value => value && value !== '' && value !== 'undefined' && value !== 'null');

    return [...new Set(values)].sort();
  };

  // Update available values for all columns
  const updateColumnFilters = (): ColumnFilter[] => {
    return columnFilters.map(filter => ({
      ...filter,
      availableValues: getUniqueValues(filter.field),
      isActive: hasActiveFilter(filter.field),
      selectedValues: getSelectedValues(filter.field)
    }));
  };

  const [currentFilters, setCurrentFilters] = useState(updateColumnFilters());

  // Update filters when models data changes
  useEffect(() => {
    setCurrentFilters(updateColumnFilters());
  }, [models]);

  // Check if a filter has active selections
  const hasActiveFilter = (field: keyof AIModel): boolean => {
    switch (field) {
      case 'inferenceProvider':
        return (filters.inferenceProviders?.length || 0) > 0;
      case 'modelProvider':
        return (filters.modelProviders?.length || 0) > 0;
      case 'country':
        return (filters.countries?.length || 0) > 0;
      case 'inputModalities':
        return (filters.inputModalities?.length || 0) > 0;
      case 'outputModalities':
        return (filters.outputModalities?.length || 0) > 0;
      case 'license':
        return (filters.licenses?.length || 0) > 0;
      case 'rateLimits':
        return (filters.rateLimits?.length || 0) > 0;
      default:
        return false;
    }
  };

  // Get currently selected values for a filter
  const getSelectedValues = (field: keyof AIModel): string[] => {
    switch (field) {
      case 'inferenceProvider':
        return filters.inferenceProviders || [];
      case 'modelProvider':
        return filters.modelProviders || [];
      case 'country':
        return filters.countries || [];
      case 'inputModalities':
        return filters.inputModalities || [];
      case 'outputModalities':
        return filters.outputModalities || [];
      case 'license':
        return filters.licenses || [];
      case 'rateLimits':
        return filters.rateLimits || [];
      default:
        return [];
    }
  };

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (openDropdown && dropdownRefs.current[openDropdown]) {
        if (!dropdownRefs.current[openDropdown].contains(target)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Toggle dropdown visibility
  const toggleDropdown = (columnField: string) => {
    setOpenDropdown(openDropdown === columnField ? null : columnField);
  };

  // Handle search within filter dropdown
  const handleFilterSearch = (columnField: string, query: string) => {
    setSearchQueries(prev => ({
      ...prev,
      [columnField]: query
    }));
  };

  // Filter available values based on search query
  const getFilteredValues = (filter: ColumnFilter): string[] => {
    const query = searchQueries[filter.field] || '';
    if (!query.trim()) return filter.availableValues;

    return filter.availableValues.filter(value =>
      value.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Handle value selection in filter dropdown
  const handleValueToggle = (columnField: keyof AIModel, value: string, isSelected: boolean) => {
    // Map column field to filter property
    const getFilterUpdate = (field: keyof AIModel, value: string, isSelected: boolean) => {
      const currentValues = getSelectedValues(field);
      const newValues = isSelected
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);

      switch (field) {
        case 'inferenceProvider':
          return { inferenceProviders: newValues };
        case 'modelProvider':
          return { modelProviders: newValues };
        case 'country':
          return { countries: newValues };
        case 'inputModalities':
          return { inputModalities: newValues };
        case 'outputModalities':
          return { outputModalities: newValues };
        case 'license':
          return { licenses: newValues };
        case 'rateLimits':
          return { rateLimits: newValues };
        default:
          return {};
      }
    };

    // Update the store filters
    const filterUpdate = getFilterUpdate(columnField, value, isSelected);
    setFilters(filterUpdate);

    // Update local state for UI
    setCurrentFilters(prev => prev.map(filter => {
      if (filter.field === columnField) {
        const newSelectedValues = isSelected
          ? [...filter.selectedValues, value]
          : filter.selectedValues.filter(v => v !== value);

        return {
          ...filter,
          selectedValues: newSelectedValues,
          isActive: newSelectedValues.length > 0
        };
      }
      return filter;
    }));
  };

  // Clear all filters for a specific column
  const clearColumnFilter = (columnField: keyof AIModel) => {
    // Update store first
    const getFilterClear = (field: keyof AIModel) => {
      switch (field) {
        case 'inferenceProvider':
          return { inferenceProviders: [] };
        case 'modelProvider':
          return { modelProviders: [] };
        case 'country':
          return { countries: [] };
        case 'inputModalities':
          return { inputModalities: [] };
        case 'outputModalities':
          return { outputModalities: [] };
        case 'license':
          return { licenses: [] };
        case 'rateLimits':
          return { rateLimits: [] };
        default:
          return {};
      }
    };

    const filterClear = getFilterClear(columnField);
    setFilters(filterClear);

    // Update local state
    setCurrentFilters(prev => prev.map(filter => {
      if (filter.field === columnField) {
        return {
          ...filter,
          selectedValues: [],
          isActive: false
        };
      }
      return filter;
    }));
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    // Clear store filters
    clearFilters();

    // Clear local state
    setCurrentFilters(prev => prev.map(filter => ({
      ...filter,
      selectedValues: [],
      isActive: false
    })));
    setSearchQueries({});
  };

  // Count active filters
  const activeFilterCount = currentFilters.filter(filter => filter.isActive).length;

  // Render individual filter dropdown
  const renderFilterDropdown = (filter: ColumnFilter) => {
    const isOpen = openDropdown === filter.field;
    const filteredValues = getFilteredValues(filter);
    const searchQuery = searchQueries[filter.field] || '';

    return (
      <div
        key={filter.field}
        className="relative"
        ref={el => {
          if (el) dropdownRefs.current[filter.field] = el;
        }}
      >
        {/* Filter Button */}
        <button
          onClick={() => toggleDropdown(filter.field)}
          className={`
            inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border transition-colors
            ${filter.isActive
              ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }
          `}
          data-testid={`${testId}-${filter.field}-button`}
        >
          <Filter className={`w-4 h-4 mr-2 ${filter.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
          {filter.label}
          {filter.isActive && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
              {filter.selectedValues.length}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg right-0 sm:right-auto">
            <div className="p-4">
              {/* Filter Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Filter by {filter.label}
                </h3>
                {filter.isActive && (
                  <button
                    onClick={() => clearColumnFilter(filter.field)}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${filter.label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => handleFilterSearch(filter.field, e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Options List */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredValues.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No options found
                  </div>
                ) : (
                  filteredValues.map((value) => {
                    const isSelected = filter.selectedValues.includes(value);
                    const count = models.filter(model => {
                      const modelValue = model[filter.field];
                      return modelValue ? String(modelValue).trim() === value : value === 'N/A';
                    }).length;

                    return (
                      <label
                        key={value}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer group"
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleValueToggle(filter.field, value, e.target.checked)}
                            className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-48" title={value}>
                            {value}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ({count})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{filter.selectedValues.length} selected</span>
                <span>{filteredValues.length} options</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}
      data-testid={testId}
    >
      <div className="px-6 py-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Advanced Filters
            </h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>

          {showClearButton && activeFilterCount > 0 && (
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
              data-testid={`${testId}-clear-all`}
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {currentFilters.map(filter => renderFilterDropdown(filter))}
        </div>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Active Filters:
            </div>
            <div className="flex flex-wrap gap-2">
              {currentFilters
                .filter(filter => filter.isActive)
                .map(filter => (
                  <div
                    key={filter.field}
                    className="inline-flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    <span className="font-medium mr-2">{filter.label}:</span>
                    <span>{filter.selectedValues.length} selected</span>
                    <button
                      onClick={() => clearColumnFilter(filter.field)}
                      className="ml-2 hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedFilters;