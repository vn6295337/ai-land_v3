import React from 'react';
import { AIModel, ViewMode } from '../../types/models';
import { ComponentProps } from '../../types/ui';
import { ModelCard } from '../ModelCard/ModelCard';
import { Pagination } from '../Pagination/Pagination';
import { useModelsStore, modelsSelectors } from '../../stores/modelsStore';
import { useUIStore, uiSelectors } from '../../stores/uiStore';
import './ModelGrid.module.css';

export interface ModelGridProps extends ComponentProps {
  emptyStateMessage?: string;
  loadingCount?: number;
  showPagination?: boolean;
}

export const ModelGrid: React.FC<ModelGridProps> = React.memo(({
  emptyStateMessage = 'No models found matching your criteria.',
  loadingCount = 12,
  showPagination = true,
  className = '',
  children,
  testId = 'model-grid'
}) => {
  // Store connections
  const {
    loading,
    toggleFavorite
  } = useModelsStore();

  const {
    viewMode,
    openModelDetails
  } = useUIStore();

  // Get paginated models for current page
  const models = modelsSelectors.getCurrentPageModels(useModelsStore.getState());
  const loadingInfo = modelsSelectors.getLoadingInfo(useModelsStore.getState());
  const getGridClasses = () => {
    const baseClasses = 'gap-4';

    switch (viewMode) {
      case 'grid':
        return `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${baseClasses}`;
      case 'list':
        return `flex flex-col ${baseClasses}`;
      case 'compact':
        return `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 ${baseClasses}`;
      default:
        return `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${baseClasses}`;
    }
  };

  const renderLoadingCards = () => {
    return Array.from({ length: loadingCount }, (_, index) => (
      <ModelCard
        key={`loading-${index}`}
        model={{} as AIModel}
        viewMode={viewMode}
        loading={true}
        testId={`loading-card-${index}`}
      />
    ));
  };

  const renderEmptyState = () => (
    <div
      className="col-span-full flex flex-col items-center justify-center py-16 text-center"
      data-testid="empty-state"
    >
      <div className="w-24 h-24 mx-auto mb-4 opacity-20">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-full h-full"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No Models Found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">
        {emptyStateMessage}
      </p>
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  );

  const renderModelCards = () => {
    return models.map((model) => (
      <ModelCard
        key={model.id}
        model={model}
        viewMode={viewMode}
        onSelect={() => openModelDetails(model.id)}
        onFavorite={() => toggleFavorite(model.id)}
        testId={`model-card-${model.id}`}
      />
    ));
  };

  if (loading) {
    return (
      <div
        className={`${getGridClasses()} ${className}`}
        data-testid={`${testId}-loading`}
        aria-label="Loading models"
      >
        {renderLoadingCards()}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div
        className={`${className}`}
        data-testid={testId}
        role="region"
        aria-label="Models grid"
      >
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={`${getGridClasses()}`}
        data-testid={testId}
        role="region"
        aria-label={`Models grid displaying ${models.length} model${models.length === 1 ? '' : 's'} in ${viewMode} view`}
      >
        {renderModelCards()}
      </div>

      {showPagination && models.length > 0 && (
        <div className="mt-8">
          <Pagination testId={`${testId}-pagination`} />
        </div>
      )}
    </div>
  );
});

export default ModelGrid;