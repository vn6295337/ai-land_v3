import React, { useState } from 'react';
import { AIModel, SortOptions, SortDirection } from '../../types/models';
import { ComponentProps } from '../../types/ui';
import { useModelsStore } from '../../stores/modelsStore';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';

export interface ModelsTableProps extends ComponentProps {
  emptyStateMessage?: string;
  onModelSelect?: (model: AIModel) => void;
}

export const ModelsTable: React.FC<ModelsTableProps> = ({
  emptyStateMessage = 'No models found matching your criteria.',
  onModelSelect,
  className = '',
  testId = 'models-table'
}) => {
  const {
    filteredModels,
    loading,
    sortBy,
    sortDirection,
    setSorting
  } = useModelsStore();

  // Table columns configuration matching ai-land dashboard
  const columns = [
    { key: 'inferenceProvider', label: 'Inference Provider', sortable: true, width: 'w-40' },
    { key: 'modelName', label: 'Model Name', sortable: true, width: 'w-64' },
    { key: 'country', label: 'Country', sortable: true, width: 'w-32' },
    { key: 'inputModalities', label: 'Input Types', sortable: true, width: 'w-32' },
    { key: 'outputModalities', label: 'Output Types', sortable: true, width: 'w-32' },
    { key: 'license', label: 'License', sortable: true, width: 'w-32' },
    { key: 'rateLimits', label: 'Rate Limits', sortable: true, width: 'w-40' },
    { key: 'apiAccess', label: 'API Access', sortable: false, width: 'w-32' },
  ];

  const handleSort = (columnKey: string) => {
    const isSameColumn = sortBy === columnKey;
    const newDirection: SortDirection = isSameColumn
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc';

    setSorting(columnKey as SortOptions, newDirection);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return null;
    }

    return sortDirection === 'asc'
      ? <ChevronUp className="w-4 h-4 ml-1" />
      : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const renderEmptyState = () => (
    <tr>
      <td colSpan={columns.length} className="px-6 py-16 text-center">
        <div className="flex flex-col items-center justify-center">
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
        </div>
      </td>
    </tr>
  );

  const renderLoadingState = () => (
    <>
      {Array.from({ length: 10 }, (_, index) => (
        <tr key={`loading-${index}`} className="border-b border-gray-200 dark:border-gray-700">
          {columns.map((column) => (
            <td key={column.key} className="px-6 py-4">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  const formatCellValue = (model: AIModel, columnKey: string): string => {
    const value = model[columnKey as keyof AIModel];

    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    return String(value);
  };

  const renderApiAccessCell = (model: AIModel) => {
    const accessText = formatCellValue(model, 'apiAccess');
    const isApiKeyRequired = accessText.toLowerCase().includes('api key');

    return (
      <div className="flex items-center space-x-2">
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            isApiKeyRequired
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}
        >
          {isApiKeyRequired ? '🔑 API Key' : '🔓 Open'}
        </span>
      </div>
    );
  };

  const renderProviderCell = (model: AIModel) => {
    const provider = formatCellValue(model, 'inferenceProvider');
    const url = model.officialUrl;

    return (
      <div className="flex items-center space-x-2">
        <span className="text-gray-900 dark:text-gray-100">
          {provider}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            title="Visit provider website"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  };

  const renderTableRow = (model: AIModel, index: number) => (
    <tr
      key={model.id}
      className={`
        border-b border-gray-200 dark:border-gray-700
        hover:bg-gray-50 dark:hover:bg-gray-800
        transition-colors duration-150
        ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
        ${onModelSelect ? 'cursor-pointer' : ''}
      `}
      onClick={() => onModelSelect?.(model)}
      data-testid={`${testId}-row-${model.id}`}
    >
      <td className="px-3 sm:px-6 py-4 text-sm">
        {renderProviderCell(model)}
      </td>
      <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
        <div className="max-w-xs truncate" title={formatCellValue(model, 'modelName')}>
          {formatCellValue(model, 'modelName')}
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
        {formatCellValue(model, 'country')}
      </td>
      <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="max-w-24 truncate" title={formatCellValue(model, 'inputModalities')}>
          {formatCellValue(model, 'inputModalities')}
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="max-w-24 truncate" title={formatCellValue(model, 'outputModalities')}>
          {formatCellValue(model, 'outputModalities')}
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="max-w-24 truncate" title={formatCellValue(model, 'license')}>
          {formatCellValue(model, 'license')}
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="max-w-32 truncate" title={formatCellValue(model, 'rateLimits')}>
          {formatCellValue(model, 'rateLimits')}
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 text-sm">
        {renderApiAccessCell(model)}
      </td>
    </tr>
  );

  const renderMobileCard = (model: AIModel, index: number) => (
    <div
      key={model.id}
      className={`
        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        rounded-lg p-4 mb-4 shadow-sm transition-colors
        ${onModelSelect ? 'cursor-pointer hover:shadow-md' : ''}
      `}
      onClick={() => onModelSelect?.(model)}
      data-testid={`${testId}-mobile-card-${model.id}`}
    >
      {/* Header with model name and provider */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {formatCellValue(model, 'modelName')}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {renderProviderCell(model)}
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          {renderApiAccessCell(model)}
        </div>
      </div>

      {/* Model details grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Country:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{formatCellValue(model, 'country')}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">License:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{formatCellValue(model, 'license')}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Input Types:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1 text-wrap break-words">
            {formatCellValue(model, 'inputModalities')}
          </p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Output Types:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1 text-wrap break-words">
            {formatCellValue(model, 'outputModalities')}
          </p>
        </div>
        <div className="xs:col-span-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">Rate Limits:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1 text-wrap break-words">
            {formatCellValue(model, 'rateLimits')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`${className}`}
      data-testid={testId}
    >
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-900 shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`
                      px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                      ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                      ${column.width}
                    `}
                    onClick={() => column.sortable && handleSort(column.key)}
                    data-testid={`${testId}-header-${column.key}`}
                  >
                    <div className="flex items-center">
                      {column.label}
                      {column.sortable && renderSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading && renderLoadingState()}
              {!loading && filteredModels.length === 0 && renderEmptyState()}
              {!loading && filteredModels.length > 0 &&
                filteredModels.map((model, index) => renderTableRow(model, index))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={`mobile-loading-${index}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i}>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredModels.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="flex flex-col items-center justify-center">
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
              <p className="text-gray-500 dark:text-gray-400 text-center">
                {emptyStateMessage}
              </p>
            </div>
          </div>
        )}

        {!loading && filteredModels.length > 0 && (
          <div className="space-y-4">
            {filteredModels.map((model, index) => renderMobileCard(model, index))}
          </div>
        )}
      </div>

      {/* Table stats footer */}
      {!loading && filteredModels.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
            <span>
              Showing {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Click column headers to sort
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelsTable;