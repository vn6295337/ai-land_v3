import React from 'react';
import { AIModel } from '../../types/models';
import { ComponentProps } from '../../types/ui';
import './ModelCard.module.css';

export interface ModelCardProps extends ComponentProps {
  model: AIModel;
  viewMode?: 'grid' | 'list' | 'compact';
  onSelect?: (model: AIModel) => void;
  onFavorite?: (model: AIModel) => void;
  loading?: boolean;
}

export const ModelCard: React.FC<ModelCardProps> = React.memo(({
  model,
  viewMode = 'grid',
  onSelect,
  onFavorite,
  loading = false,
  className = '',
  testId = 'model-card'
}) => {
  const baseClasses = {
    card: 'rounded-lg border transition-all duration-200 hover:shadow-lg cursor-pointer',
    cardLight: 'bg-white border-gray-200 hover:border-gray-300',
    cardDark: 'bg-gray-800 border-gray-700 hover:border-gray-600',
    content: 'p-4',
    header: 'flex items-start justify-between mb-3',
    title: 'font-semibold text-lg leading-tight',
    titleLight: 'text-gray-900',
    titleDark: 'text-white',
    provider: 'text-sm font-medium px-2 py-1 rounded-full',
    providerLight: 'bg-blue-100 text-blue-800',
    providerDark: 'bg-blue-900 text-blue-200',
    description: 'text-sm mb-3 line-clamp-2',
    descriptionLight: 'text-gray-600',
    descriptionDark: 'text-gray-300',
    metadata: 'space-y-2',
    metadataItem: 'flex justify-between items-center text-sm',
    metadataLabel: 'font-medium',
    metadataLabelLight: 'text-gray-500',
    metadataLabelDark: 'text-gray-400',
    metadataValue: '',
    metadataValueLight: 'text-gray-900',
    metadataValueDark: 'text-gray-100',
    actions: 'flex items-center justify-between mt-4 pt-3 border-t',
    actionsLight: 'border-gray-200',
    actionsDark: 'border-gray-700',
    pricing: 'px-2 py-1 rounded text-xs font-medium',
    pricingFree: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    pricingPaid: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    button: 'px-3 py-1.5 text-xs font-medium rounded transition-colors',
    buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-700',
    buttonSecondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
  };

  const isDarkMode = document.documentElement.classList.contains('dark');

  const handleCardClick = () => {
    if (onSelect && !loading) {
      onSelect(model);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavorite && !loading) {
      onFavorite(model);
    }
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (Math.abs(cost) < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const getPricingBadgeClass = () => {
    return model.cost === 0 ? baseClasses.pricingFree : baseClasses.pricingPaid;
  };

  if (loading) {
    return (
      <div
        className={`${baseClasses.card} ${isDarkMode ? baseClasses.cardDark : baseClasses.cardLight} animate-pulse ${className}`}
        data-testid={`${testId}-loading`}
      >
        <div className={baseClasses.content}>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div
        className={`${baseClasses.card} ${isDarkMode ? baseClasses.cardDark : baseClasses.cardLight} ${className}`}
        onClick={handleCardClick}
        data-testid={testId}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <div className="p-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-medium text-sm truncate ${isDarkMode ? baseClasses.titleDark : baseClasses.titleLight}`}>
                {model.name}
              </h3>
              <span className={`${baseClasses.provider} ${isDarkMode ? baseClasses.providerDark : baseClasses.providerLight}`}>
                {model.provider}
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? baseClasses.descriptionDark : baseClasses.descriptionLight}`}>
              {model.category}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${baseClasses.pricing} ${getPricingBadgeClass()}`}>
              {formatCost(model.cost)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div
        className={`${baseClasses.card} ${isDarkMode ? baseClasses.cardDark : baseClasses.cardLight} ${className}`}
        onClick={handleCardClick}
        data-testid={testId}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${isDarkMode ? baseClasses.titleDark : baseClasses.titleLight}`}>
                  {model.name}
                </h3>
                <span className={`${baseClasses.provider} ${isDarkMode ? baseClasses.providerDark : baseClasses.providerLight}`}>
                  {model.provider}
                </span>
              </div>
              <span className={`${baseClasses.pricing} ${getPricingBadgeClass()}`}>
                {formatCost(model.cost)}
              </span>
            </div>
            <p className={`text-sm mb-2 ${isDarkMode ? baseClasses.descriptionDark : baseClasses.descriptionLight}`}>
              {model.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Category: {model.category}</span>
              {model.contextLength && <span>Context: {model.contextLength.toLocaleString()}</span>}
              {model.lastUpdated && <span>Updated: {model.lastUpdated}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className={`${baseClasses.card} ${isDarkMode ? baseClasses.cardDark : baseClasses.cardLight} ${className}`}
      onClick={handleCardClick}
      data-testid={testId}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className={baseClasses.content}>
        <div className={baseClasses.header}>
          <div className="flex-1 min-w-0">
            <h3 className={`${baseClasses.title} ${isDarkMode ? baseClasses.titleDark : baseClasses.titleLight}`}>
              {model.name}
            </h3>
            <span className={`${baseClasses.provider} ${isDarkMode ? baseClasses.providerDark : baseClasses.providerLight}`}>
              {model.provider}
            </span>
          </div>
        </div>

        <p className={`${baseClasses.description} ${isDarkMode ? baseClasses.descriptionDark : baseClasses.descriptionLight}`}>
          {model.description}
        </p>

        <div className={baseClasses.metadata}>
          <div className={baseClasses.metadataItem}>
            <span className={`${baseClasses.metadataLabel} ${isDarkMode ? baseClasses.metadataLabelDark : baseClasses.metadataLabelLight}`}>
              Category
            </span>
            <span className={`${baseClasses.metadataValue} ${isDarkMode ? baseClasses.metadataValueDark : baseClasses.metadataValueLight}`}>
              {model.category}
            </span>
          </div>

          {model.contextLength && (
            <div className={baseClasses.metadataItem}>
              <span className={`${baseClasses.metadataLabel} ${isDarkMode ? baseClasses.metadataLabelDark : baseClasses.metadataLabelLight}`}>
                Context Length
              </span>
              <span className={`${baseClasses.metadataValue} ${isDarkMode ? baseClasses.metadataValueDark : baseClasses.metadataValueLight}`}>
                {model.contextLength.toLocaleString()}
              </span>
            </div>
          )}

          <div className={baseClasses.metadataItem}>
            <span className={`${baseClasses.metadataLabel} ${isDarkMode ? baseClasses.metadataLabelDark : baseClasses.metadataLabelLight}`}>
              Capabilities
            </span>
            <div className="flex gap-1">
              {model.functionCalling && <span className="w-2 h-2 bg-green-500 rounded-full" title="Function Calling"></span>}
              {model.vision && <span className="w-2 h-2 bg-blue-500 rounded-full" title="Vision"></span>}
              {model.streaming && <span className="w-2 h-2 bg-purple-500 rounded-full" title="Streaming"></span>}
            </div>
          </div>
        </div>

        <div className={`${baseClasses.actions} ${isDarkMode ? baseClasses.actionsDark : baseClasses.actionsLight}`}>
          <span className={`${baseClasses.pricing} ${getPricingBadgeClass()}`}>
            {formatCost(model.cost)}
          </span>
          <div className="flex gap-2">
            {onFavorite && (
              <button
                onClick={handleFavoriteClick}
                className={`${baseClasses.button} ${baseClasses.buttonSecondary}`}
                data-testid={`${testId}-favorite`}
              >
                ♡
              </button>
            )}
            <button
              className={`${baseClasses.button} ${baseClasses.buttonPrimary}`}
              data-testid={`${testId}-select`}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ModelCard;