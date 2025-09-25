import React from 'react';
import { X, ArrowRight, Check, Minus, Zap, Eye, Code, DollarSign } from 'lucide-react';
import { AIModel } from '../../types/models';
import { ComponentProps } from '../../types/ui';
import { useModelsStore } from '../../stores/modelsStore';
import { useUIStore } from '../../stores/uiStore';

export interface ModelComparisonProps extends ComponentProps {
  models: AIModel[];
  maxModels?: number;
  onClose?: () => void;
  onRemoveModel?: (modelId: string) => void;
}

export const ModelComparison: React.FC<ModelComparisonProps> = React.memo(({
  models,
  maxModels = 4,
  onClose,
  onRemoveModel,
  className = '',
  testId = 'model-comparison'
}) => {
  const { toggleFavorite, favorites } = useModelsStore();
  const { openModelDetails } = useUIStore();

  const comparisonRows = [
    {
      key: 'basic',
      title: 'Basic Information',
      fields: ['name', 'provider', 'description']
    },
    {
      key: 'capabilities',
      title: 'Capabilities',
      fields: ['streaming', 'functionCalling', 'vision']
    },
    {
      key: 'technical',
      title: 'Technical Specs',
      fields: ['contextLength', 'cost', 'category']
    },
    {
      key: 'metadata',
      title: 'Metadata',
      fields: ['lastUpdated', 'license', 'availability']
    }
  ];

  const formatFieldValue = (field: string, value: any, model: AIModel) => {
    switch (field) {
      case 'streaming':
      case 'functionCalling':
      case 'vision':
        return (
          <div className="flex items-center gap-2">
            {value ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Minus className="w-4 h-4 text-gray-400" />
            )}
            <span className={value ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
              {value ? 'Yes' : 'No'}
            </span>
          </div>
        );

      case 'cost':
        return (
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className={value === 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
              {value === 0 ? 'Free' : `$${value.toFixed(4)}`}
            </span>
          </div>
        );

      case 'contextLength':
        return (
          <div className="flex items-center gap-1">
            <span className="font-mono">{value.toLocaleString()}</span>
            <span className="text-xs text-gray-500">tokens</span>
          </div>
        );

      case 'category':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full capitalize">
            {value.replace('_', ' ')}
          </span>
        );

      case 'provider':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full capitalize">
            {value}
          </span>
        );

      case 'lastUpdated':
        const date = new Date(value);
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {date.toLocaleDateString()}
          </span>
        );

      case 'license':
        return (
          <span className={`text-sm ${
            value === 'apache-2.0' || value === 'mit'
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {value.toUpperCase()}
          </span>
        );

      case 'availability':
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            value === 'public'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
          }`}>
            {value}
          </span>
        );

      case 'description':
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {value}
          </span>
        );

      case 'name':
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold">{value}</span>
            {favorites.has(model.id) && (
              <span className="text-red-500">♥</span>
            )}
          </div>
        );

      default:
        return <span>{String(value)}</span>;
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      name: 'Model Name',
      provider: 'Provider',
      description: 'Description',
      streaming: 'Streaming',
      functionCalling: 'Function Calling',
      vision: 'Vision',
      contextLength: 'Context Length',
      cost: 'Cost per 1K tokens',
      category: 'Category',
      lastUpdated: 'Last Updated',
      license: 'License',
      availability: 'Availability'
    };
    return labels[field] || field;
  };

  const renderModelHeader = (model: AIModel, index: number) => (
    <div
      key={model.id}
      className="flex-1 min-w-0 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-t-lg"
      data-testid={`${testId}-header-${index}`}
    >
      <div className="flex items-start justify-between mb-2">
        <button
          onClick={() => openModelDetails(model.id)}
          className="text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <h3 className="font-semibold text-lg truncate">{model.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{model.provider}</p>
        </button>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => toggleFavorite(model.id)}
            className={`p-1 rounded transition-colors ${
              favorites.has(model.id)
                ? 'text-red-500 hover:text-red-600'
                : 'text-gray-400 hover:text-red-500'
            }`}
            data-testid={`${testId}-favorite-${index}`}
          >
            ♥
          </button>

          {onRemoveModel && (
            <button
              onClick={() => onRemoveModel(model.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              data-testid={`${testId}-remove-${index}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span className={model.cost === 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
          {model.cost === 0 ? 'Free' : `$${model.cost.toFixed(4)}`}
        </span>
        <span>{model.contextLength.toLocaleString()} tokens</span>
        <span className="capitalize">{model.category.replace('_', ' ')}</span>
      </div>
    </div>
  );

  const renderComparisonRow = (rowConfig: typeof comparisonRows[0], rowIndex: number) => (
    <div key={rowConfig.key} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          {rowConfig.title}
        </h4>
      </div>

      {rowConfig.fields.map(field => (
        <div
          key={field}
          className="grid grid-cols-1 lg:grid-cols-5 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
          data-testid={`${testId}-row-${field}`}
        >
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 font-medium text-sm text-gray-700 dark:text-gray-300 lg:col-span-1">
            {getFieldLabel(field)}
          </div>

          {models.map((model, modelIndex) => (
            <div
              key={`${model.id}-${field}`}
              className="px-4 py-3 lg:col-span-1 flex items-center min-h-[3rem]"
              data-testid={`${testId}-cell-${modelIndex}-${field}`}
            >
              {formatFieldValue(field, (model as any)[field], model)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  if (models.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center ${className}`}
        data-testid={`${testId}-empty`}
      >
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <ArrowRight className="w-full h-full" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Models to Compare
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Select models from the grid to see a side-by-side comparison
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Model Comparison
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comparing {models.length} model{models.length !== 1 ? 's' : ''}
            {models.length >= maxModels && (
              <span className="ml-1 text-amber-600 dark:text-amber-400">
                (Maximum reached)
              </span>
            )}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            data-testid={`${testId}-close`}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Model Headers */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900">
        {models.map((model, index) => renderModelHeader(model, index))}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {comparisonRows.map((rowConfig, index) => renderComparisonRow(rowConfig, index))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Click model names to view detailed information
          </span>
          <span>
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ModelComparison;