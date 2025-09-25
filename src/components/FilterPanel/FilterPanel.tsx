import React from 'react';
import { ChevronDown, X, Filter } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { useModelsStore, modelsSelectors } from '../../stores/modelsStore';
import { useUIStore } from '../../stores/uiStore';

export interface FilterPanelProps extends ComponentProps {
  showClearButton?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = React.memo(({
  showClearButton = true,
  className = '',
  testId = 'filter-panel'
}) => {
  const {
    models,
    filters,
    setFilters,
    clearFilters
  } = useModelsStore();

  const { showFilters } = useUIStore();
  const filterSummary = modelsSelectors.getFilterSummary(useModelsStore.getState());

  // Extract unique values for filter options
  const providers = React.useMemo(() => {
    return [...new Set(models.map(m => m.provider))].sort();
  }, [models]);

  const categories = React.useMemo(() => {
    return [...new Set(models.map(m => m.category))].sort();
  }, [models]);

  const capabilities = React.useMemo(() => {
    const caps = new Set<string>();
    models.forEach(model => {
      if (model.streaming) caps.add('streaming');
      if (model.functionCalling) caps.add('function-calling');
      if (model.vision) caps.add('vision');
    });
    return Array.from(caps).sort();
  }, [models]);

  const costRanges = [
    { label: 'Free', min: 0, max: 0 },
    { label: 'Low ($0.001 - $0.01)', min: 0.001, max: 0.01 },
    { label: 'Medium ($0.01 - $0.05)', min: 0.01, max: 0.05 },
    { label: 'High ($0.05+)', min: 0.05, max: Infinity }
  ];

  if (!showFilters) {
    return null;
  }

  const handleProviderChange = (provider: string, checked: boolean) => {
    const newProviders = checked
      ? [...filters.providers, provider]
      : filters.providers.filter(p => p !== provider);
    setFilters({ providers: newProviders });
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);
    setFilters({ categories: newCategories });
  };

  const handleCapabilityChange = (capability: string, checked: boolean) => {
    const newCapabilities = checked
      ? [...filters.capabilities, capability]
      : filters.capabilities.filter(c => c !== capability);
    setFilters({ capabilities: newCapabilities });
  };

  const handleCostRangeChange = (min: number, max: number, checked: boolean) => {
    if (checked) {
      setFilters({ minCost: min, maxCost: max === Infinity ? undefined : max });
    } else {
      setFilters({ minCost: undefined, maxCost: undefined });
    }
  };

  const handleFreeOnlyChange = (checked: boolean) => {
    setFilters({ freeOnly: checked });
  };

  const renderCheckboxGroup = (
    title: string,
    items: string[],
    selectedItems: string[],
    onChange: (item: string, checked: boolean) => void,
    testIdPrefix: string
  ) => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Filter className="w-4 h-4" />
        {title}
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map(item => (
          <label
            key={item}
            className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            data-testid={`${testIdPrefix}-${item}`}
          >
            <input
              type="checkbox"
              checked={selectedItems.includes(item)}
              onChange={(e) => onChange(item, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="capitalize">{item.replace('-', ' ')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              ({models.filter(m => {
                if (title === 'Providers') return m.provider === item;
                if (title === 'Categories') return m.category === item;
                if (title === 'Capabilities') {
                  if (item === 'streaming') return m.streaming;
                  if (item === 'function-calling') return m.functionCalling;
                  if (item === 'vision') return m.vision;
                }
                return false;
              }).length})
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Filters
        </h2>
        {showClearButton && filterSummary.hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
            data-testid={`${testId}-clear-all`}
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {filterSummary.hasActiveFilters && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filterSummary.activeCount} filter{filterSummary.activeCount !== 1 ? 's' : ''} active
        </div>
      )}

      {/* Free Only Toggle */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.freeOnly}
            onChange={(e) => handleFreeOnlyChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            data-testid={`${testId}-free-only`}
          />
          <span className="font-medium text-green-600 dark:text-green-400">
            Free models only
          </span>
        </label>
      </div>

      {/* Providers */}
      {renderCheckboxGroup(
        'Providers',
        providers,
        filters.providers,
        handleProviderChange,
        `${testId}-provider`
      )}

      {/* Categories */}
      {renderCheckboxGroup(
        'Categories',
        categories,
        filters.categories,
        handleCategoryChange,
        `${testId}-category`
      )}

      {/* Capabilities */}
      {renderCheckboxGroup(
        'Capabilities',
        capabilities,
        filters.capabilities,
        handleCapabilityChange,
        `${testId}-capability`
      )}

      {/* Cost Ranges */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Cost Range
        </h3>
        <div className="space-y-2">
          {costRanges.map(range => (
            <label
              key={range.label}
              className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              data-testid={`${testId}-cost-${range.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              <input
                type="radio"
                name="costRange"
                checked={filters.minCost === range.min &&
                         (range.max === Infinity ? !filters.maxCost : filters.maxCost === range.max)}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleCostRangeChange(range.min, range.max, true);
                  }
                }}
                className="border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{range.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                ({models.filter(m => {
                  if (range.max === Infinity) return m.cost >= range.min;
                  return m.cost >= range.min && m.cost <= range.max;
                }).length})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Cost Range */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Custom Cost Range
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Min Cost ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={filters.minCost || ''}
              onChange={(e) => setFilters({
                minCost: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              placeholder="0.000"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              data-testid={`${testId}-min-cost`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Max Cost ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={filters.maxCost || ''}
              onChange={(e) => setFilters({
                maxCost: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              placeholder="1.000"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              data-testid={`${testId}-max-cost`}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default FilterPanel;