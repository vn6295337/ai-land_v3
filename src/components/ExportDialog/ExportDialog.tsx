import React, { useState } from 'react';
import { Download, FileText, Table, File, X, Check, AlertCircle } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { useModelsStore, modelsSelectors } from '../../stores/modelsStore';
import { useUIStore } from '../../stores/uiStore';
import { useUserProfileStore } from '../../stores/userProfileStore';

export interface ExportDialogProps extends ComponentProps {
  onClose?: () => void;
}

type ExportFormat = 'json' | 'csv' | 'xlsx';
type ExportScope = 'all' | 'filtered' | 'favorites' | 'current-page';

export const ExportDialog: React.FC<ExportDialogProps> = React.memo(({
  onClose,
  className = '',
  testId = 'export-dialog'
}) => {
  const {
    models,
    filteredModels,
    favorites,
    getFavoriteModels
  } = useModelsStore();

  const { closeExportDialog } = useUIStore();
  const { exportData, trackExport, preferences } = useUserProfileStore();

  const [format, setFormat] = useState<ExportFormat>(preferences.dataExportFormat);
  const [scope, setScope] = useState<ExportScope>('filtered');
  const [includeFields, setIncludeFields] = useState({
    basic: true,
    technical: true,
    capabilities: true,
    metadata: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const currentPageModels = modelsSelectors.getCurrentPageModels(useModelsStore.getState());
  const favoriteModels = getFavoriteModels();

  const scopeOptions = [
    {
      value: 'all' as const,
      label: 'All Models',
      description: `Export all ${models.length} models`,
      count: models.length
    },
    {
      value: 'filtered' as const,
      label: 'Filtered Results',
      description: `Export current filtered results`,
      count: filteredModels.length
    },
    {
      value: 'favorites' as const,
      label: 'Favorites Only',
      description: `Export your favorite models`,
      count: favoriteModels.length
    },
    {
      value: 'current-page' as const,
      label: 'Current Page',
      description: `Export models on current page`,
      count: currentPageModels.length
    }
  ];

  const formatOptions = [
    {
      value: 'json' as const,
      label: 'JSON',
      description: 'JavaScript Object Notation - best for developers',
      icon: FileText,
      extension: '.json'
    },
    {
      value: 'csv' as const,
      label: 'CSV',
      description: 'Comma-Separated Values - best for spreadsheets',
      icon: Table,
      extension: '.csv'
    },
    {
      value: 'xlsx' as const,
      label: 'Excel',
      description: 'Excel Workbook - best for analysis',
      icon: File,
      extension: '.xlsx'
    }
  ];

  const fieldGroups = [
    {
      key: 'basic',
      label: 'Basic Information',
      description: 'Name, provider, description',
      fields: ['name', 'provider', 'description', 'modelId']
    },
    {
      key: 'technical',
      label: 'Technical Specs',
      description: 'Cost, context length, category',
      fields: ['cost', 'contextLength', 'category']
    },
    {
      key: 'capabilities',
      label: 'Capabilities',
      description: 'Streaming, function calling, vision',
      fields: ['streaming', 'functionCalling', 'vision']
    },
    {
      key: 'metadata',
      label: 'Metadata',
      description: 'Last updated, license, availability',
      fields: ['lastUpdated', 'license', 'availability']
    }
  ];

  const getModelsToExport = () => {
    switch (scope) {
      case 'all':
        return models;
      case 'filtered':
        return filteredModels;
      case 'favorites':
        return favoriteModels;
      case 'current-page':
        return currentPageModels;
      default:
        return filteredModels;
    }
  };

  const generateFileName = () => {
    const selectedScope = scopeOptions.find(opt => opt.value === scope);
    const timestamp = new Date().toISOString().split('T')[0];
    const scopeName = selectedScope?.label.toLowerCase().replace(/\s+/g, '-') || 'models';
    const formatExt = formatOptions.find(opt => opt.value === format)?.extension || '.json';
    return `ai-models-${scopeName}-${timestamp}${formatExt}`;
  };

  const filterModelFields = (model: any) => {
    const result: any = { id: model.id }; // Always include ID

    fieldGroups.forEach(group => {
      if (includeFields[group.key as keyof typeof includeFields]) {
        group.fields.forEach(field => {
          if (field in model) {
            result[field] = model[field];
          }
        });
      }
    });

    return result;
  };

  const generateExportData = async () => {
    const modelsToExport = getModelsToExport();
    const filteredData = modelsToExport.map(filterModelFields);

    switch (format) {
      case 'json':
        return JSON.stringify({
          exportInfo: {
            timestamp: new Date().toISOString(),
            format,
            scope,
            totalModels: filteredData.length,
            includeFields: Object.keys(includeFields).filter(key =>
              includeFields[key as keyof typeof includeFields]
            )
          },
          models: filteredData
        }, null, 2);

      case 'csv':
        if (filteredData.length === 0) return '';

        const headers = Object.keys(filteredData[0]);
        const csvRows = [
          headers.join(','),
          ...filteredData.map(model =>
            headers.map(header => {
              const value = model[header];
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ];
        return csvRows.join('\n');

      case 'xlsx':
        // In a real implementation, you'd use a library like xlsx or exceljs
        // For now, return CSV format as placeholder
        return generateExportData(); // Would generate actual Excel file

      default:
        return JSON.stringify(filteredData, null, 2);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const data = await generateExportData();
      const modelsToExport = getModelsToExport();

      // Track export in user profile
      trackExport(format, modelsToExport.length, { scope, includeFields });

      // Download file
      const blob = new Blob([data], {
        type: format === 'json'
          ? 'application/json'
          : format === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    onClose?.();
    closeExportDialog();
  };

  const selectedScopeOption = scopeOptions.find(opt => opt.value === scope);
  const selectedFormatOption = formatOptions.find(opt => opt.value === format);

  if (exportComplete) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md mx-4 text-center">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Export Complete!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your file has been downloaded successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${className}`}
        data-testid={testId}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Export Models
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            data-testid={`${testId}-close`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Scope */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              What to Export
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scopeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    scope === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  data-testid={`${testId}-scope-${option.value}`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={option.value}
                    checked={scope === option.value}
                    onChange={(e) => setScope(e.target.value as ExportScope)}
                    className="mt-1"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {option.label}
                      <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                        ({option.count})
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Export Format
            </h3>
            <div className="space-y-3">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      format === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    data-testid={`${testId}-format-${option.value}`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={option.value}
                      checked={format === option.value}
                      onChange={(e) => setFormat(e.target.value as ExportFormat)}
                      className="mr-3"
                    />
                    <Icon className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Fields to Include
            </h3>
            <div className="space-y-3">
              {fieldGroups.map((group) => (
                <label
                  key={group.key}
                  className="flex items-start p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  data-testid={`${testId}-fields-${group.key}`}
                >
                  <input
                    type="checkbox"
                    checked={includeFields[group.key as keyof typeof includeFields]}
                    onChange={(e) => setIncludeFields(prev => ({
                      ...prev,
                      [group.key]: e.target.checked
                    }))}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {group.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {group.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Export Summary</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Models to export: <span className="font-medium">{selectedScopeOption?.count || 0}</span></div>
              <div>Format: <span className="font-medium">{selectedFormatOption?.label}</span></div>
              <div>File name: <span className="font-mono text-xs">{generateFileName()}</span></div>
              <div>Fields: <span className="font-medium">
                {Object.values(includeFields).filter(Boolean).length} groups selected
              </span></div>
            </div>
          </div>

          {/* Warning for large exports */}
          {selectedScopeOption && selectedScopeOption.count > 100 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-800 dark:text-yellow-200">Large Export</div>
                <div className="text-yellow-600 dark:text-yellow-400">
                  This export contains over 100 models and may take a moment to generate.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            data-testid={`${testId}-cancel`}
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || (selectedScopeOption?.count || 0) === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            data-testid={`${testId}-export`}
          >
            {isExporting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {selectedScopeOption?.count || 0} Models
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ExportDialog;