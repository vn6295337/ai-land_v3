import React, { useEffect } from 'react';
import { ComponentProps } from '../../types/ui';
import { SearchBar } from '../SearchBar/SearchBar';
import { ModelGrid } from '../ModelGrid/ModelGrid';
import { ModelsTable } from '../ModelsTable/ModelsTable';
import { FilterPanel } from '../FilterPanel/FilterPanel';
import { AdvancedFilters } from '../AdvancedFilters/AdvancedFilters';
import { ModelComparison } from '../ModelComparison/ModelComparison';
import { UserProfile } from '../UserProfile/UserProfile';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import { Analytics } from '../Analytics/Analytics';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { useModelsStore, modelsSelectors } from '../../stores/modelsStore';
import { useUIStore } from '../../stores/uiStore';
import { useUserProfileStore } from '../../stores/userProfileStore';

export interface DashboardProps extends ComponentProps {
  title?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  autoFetch?: boolean;
  view?: 'models' | 'analytics' | 'profile';
}

export const Dashboard: React.FC<DashboardProps> = ({
  title = 'AI Models Discovery',
  showSearch = true,
  showFilters = true,
  autoFetch = true,
  view = 'models',
  className = '',
  testId = 'dashboard'
}) => {
  // Store connections
  const {
    loading,
    error,
    fetchModels,
    filteredModels
  } = useModelsStore();

  const {
    viewMode,
    theme,
    showFilters: uiShowFilters,
    showSettings,
    showExportDialog,
    toggleFilters,
    toggleViewMode,
    openSettings,
    openExportDialog
  } = useUIStore();

  const {
    comparisonModels,
    removeFromComparison,
    clearComparison,
    isLoggedIn
  } = useUserProfileStore();

  const loadingInfo = modelsSelectors.getLoadingInfo(useModelsStore.getState());
  const searchInfo = modelsSelectors.getSearchInfo(useModelsStore.getState());

  // Fetch models on mount
  useEffect(() => {
    if (autoFetch && !loadingInfo.hasData && !loading) {
      fetchModels();
    }
  }, [autoFetch, loadingInfo.hasData, loading, fetchModels]);

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Discover and compare AI models from multiple providers
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
        {view === 'models' && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleViewMode}
                className="flex-1 sm:flex-none px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[40px] touch-manipulation"
                data-testid={`${testId}-view-toggle`}
              >
                <span className="hidden xs:inline">{viewMode === 'table' ? '🎯 Grid View' : '📊 Table View'}</span>
                <span className="xs:hidden">{viewMode === 'table' ? '🎯 Grid' : '📊 Table'}</span>
              </button>

              {showFilters && (
                <button
                  onClick={toggleFilters}
                  className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[40px] touch-manipulation ${
                    uiShowFilters
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid={`${testId}-filters-toggle`}
                >
                  Filters
                </button>
              )}

              <button
                onClick={openExportDialog}
                className="flex-1 sm:flex-none px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[40px] touch-manipulation"
                data-testid={`${testId}-export-button`}
              >
                Export
              </button>
            </div>
          </>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ThemeToggle
            size="md"
            className="min-h-[40px]"
            data-testid={`${testId}-theme-toggle`}
          />

          <button
            onClick={openSettings}
            className="flex-1 sm:flex-none px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[40px] touch-manipulation"
            data-testid={`${testId}-settings-button`}
          >
            {isLoggedIn ? 'Profile' : 'Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSearchSection = () => (
    <div className="mb-6">
      <SearchBar
        showSuggestions={true}
        debounceMs={300}
        clearable={true}
        testId={`${testId}-search`}
      />

      {searchInfo.hasQuery && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Found {searchInfo.resultsCount} model{searchInfo.resultsCount !== 1 ? 's' : ''}{' '}
          for "{searchInfo.query}"
        </div>
      )}
    </div>
  );

  const renderStats = () => {
    const totalModels = filteredModels.length;
    const isFiltered = searchInfo.hasQuery;

    return (
      <div className="mb-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div data-testid={`${testId}-stats`}>
          {isFiltered ? (
            <>Showing {totalModels} of {useModelsStore.getState().models.length} models</>
          ) : (
            <>{totalModels} models available</>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2" data-testid={`${testId}-loading-indicator`}>
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            Loading models...
          </div>
        )}
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <div
        className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
        data-testid={`${testId}-error`}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading models
            </h3>
            <div className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
            <div className="mt-2">
              <button
                onClick={() => fetchModels()}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModelsView = () => (
    <div>
      {showSearch && renderSearchSection()}
      {renderStats()}
      {renderError()}

      {/* Advanced Filters - Always visible for table view */}
      {viewMode === 'table' && (
        <AdvancedFilters
          className="mb-6"
          testId={`${testId}-advanced-filters`}
        />
      )}

      <div className={viewMode === 'table' ? '' : 'grid grid-cols-1 lg:grid-cols-4 gap-8'}>
        {/* Filter Panel - Only for grid view */}
        {viewMode !== 'table' && (
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <FilterPanel testId={`${testId}-filters`} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={viewMode === 'table' ? 'space-y-6' : 'lg:col-span-3 space-y-6'}>
          {/* Model Comparison */}
          {comparisonModels.length > 0 && (
            <ModelComparison
              models={comparisonModels}
              onRemoveModel={removeFromComparison}
              onClose={clearComparison}
              testId={`${testId}-comparison`}
            />
          )}

          {/* Model Display - Table or Grid based on view mode */}
          {viewMode === 'table' ? (
            <ModelsTable
              emptyStateMessage={
                searchInfo.hasQuery
                  ? `No models found for "${searchInfo.query}". Try adjusting your search terms.`
                  : 'No models available. This might be a loading issue - try refreshing the page.'
              }
              testId={`${testId}-table`}
            />
          ) : (
            <ModelGrid
              showPagination={true}
              emptyStateMessage={
                searchInfo.hasQuery
                  ? `No models found for "${searchInfo.query}". Try adjusting your search terms.`
                  : 'No models available. This might be a loading issue - try refreshing the page.'
              }
              testId={`${testId}-grid`}
            />
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalyticsView = () => (
    <Analytics
      showPersonalAnalytics={isLoggedIn}
      testId={`${testId}-analytics`}
    />
  );

  const renderProfileView = () => (
    <UserProfile testId={`${testId}-profile`} />
  );

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors ${className}`}
      data-testid={testId}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {renderHeader()}

        {view === 'models' && renderModelsView()}
        {view === 'analytics' && renderAnalyticsView()}
        {view === 'profile' && renderProfileView()}

        {/* Modals */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <UserProfile testId={`${testId}-settings-profile`} />
            </div>
          </div>
        )}

        {showExportDialog && <ExportDialog testId={`${testId}-export-dialog`} />}
      </div>
    </div>
  );
};

export default Dashboard;