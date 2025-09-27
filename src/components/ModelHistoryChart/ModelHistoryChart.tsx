import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ChevronDown, ChevronUp, Calendar, TrendingUp } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { AIModel } from '../../types/models';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface HistoricalDataPoint {
  timestamp: Date;
  totalCount: number;
  providerCounts: {
    inferenceProviders: { [key: string]: number };
    modelProviders: { [key: string]: number };
  };
}

export interface ModelHistoryChartProps extends ComponentProps {
  models: AIModel[];
  darkMode?: boolean;
}

export const ModelHistoryChart: React.FC<ModelHistoryChartProps> = ({
  models,
  darkMode = false,
  className = '',
  testId = 'model-history-chart'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedInferenceProviders, setSelectedInferenceProviders] = useState<Set<string>>(new Set());
  const [selectedModelProviders, setSelectedModelProviders] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  // Simulate historical data since we don't have analytics_history table yet
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);

  // Generate mock historical data for demonstration
  useEffect(() => {
    const generateMockData = () => {
      const data: HistoricalDataPoint[] = [];
      const now = new Date();

      // Generate 30 days of mock data
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

        // Calculate provider counts based on current models
        const inferenceProviders: { [key: string]: number } = {};
        const modelProviders: { [key: string]: number } = {};

        // Add some variation to make it realistic
        const variation = 0.8 + (Math.random() * 0.4); // 80% to 120% of current
        const currentTotal = Math.floor(models.length * variation);

        models.forEach(model => {
          if (Math.random() < variation) { // Include this model in historical data
            const infProvider = model.inferenceProvider || model.provider || 'Unknown';
            const modProvider = model.modelProvider || model.provider || 'Unknown';

            inferenceProviders[infProvider] = (inferenceProviders[infProvider] || 0) + 1;
            modelProviders[modProvider] = (modelProviders[modProvider] || 0) + 1;
          }
        });

        data.push({
          timestamp: date,
          totalCount: currentTotal,
          providerCounts: {
            inferenceProviders,
            modelProviders
          }
        });
      }

      setHistoricalData(data);
    };

    if (models.length > 0) {
      generateMockData();
    }
  }, [models]);

  // Get unique providers from historical data
  const availableProviders = useMemo(() => {
    const inferenceProviders = new Set<string>();
    const modelProviders = new Set<string>();

    historicalData.forEach(point => {
      Object.keys(point.providerCounts.inferenceProviders).forEach(provider => {
        inferenceProviders.add(provider);
      });
      Object.keys(point.providerCounts.modelProviders).forEach(provider => {
        modelProviders.add(provider);
      });
    });

    return {
      inferenceProviders: Array.from(inferenceProviders).sort(),
      modelProviders: Array.from(modelProviders).sort()
    };
  }, [historicalData]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (historicalData.length === 0) return [];

    const now = new Date();
    const cutoffTime = (() => {
      switch (timeRange) {
        case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'all': return new Date(0);
        default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    })();

    return historicalData.filter(point => point.timestamp >= cutoffTime);
  }, [historicalData, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const datasets = [];
    const colors = [
      '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'
    ];

    // Total count line (only shown when no providers are selected)
    const showTotalLine = selectedInferenceProviders.size === 0 && selectedModelProviders.size === 0;

    if (showTotalLine) {
      datasets.push({
        label: 'Total Models',
        data: filteredData.map(point => ({
          x: point.timestamp,
          y: point.totalCount
        })),
        borderColor: colors[0],
        backgroundColor: colors[0] + '20',
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 8,
        borderWidth: 2,
        pointBackgroundColor: colors[0],
        pointBorderColor: darkMode ? '#374151' : '#ffffff',
        pointBorderWidth: 2
      });
    }

    let colorIndex = showTotalLine ? 1 : 0;

    // Add selected inference provider lines
    selectedInferenceProviders.forEach(provider => {
      datasets.push({
        label: `${provider} (Inference)`,
        data: filteredData.map(point => ({
          x: point.timestamp,
          y: point.providerCounts.inferenceProviders[provider] || 0
        })),
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length] + '20',
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: colors[colorIndex % colors.length],
        pointBorderColor: darkMode ? '#374151' : '#ffffff',
        pointBorderWidth: 1
      });
      colorIndex++;
    });

    // Add selected model provider lines
    selectedModelProviders.forEach(provider => {
      datasets.push({
        label: `${provider} (Model)`,
        data: filteredData.map(point => ({
          x: point.timestamp,
          y: point.providerCounts.modelProviders[provider] || 0
        })),
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length] + '20',
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
        borderDash: [2, 2],
        pointBackgroundColor: colors[colorIndex % colors.length],
        pointBorderColor: darkMode ? '#374151' : '#ffffff',
        pointBorderWidth: 1
      });
      colorIndex++;
    });

    return { datasets };
  }, [filteredData, selectedInferenceProviders, selectedModelProviders, darkMode]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: darkMode ? '#e5e7eb' : '#374151',
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        titleColor: darkMode ? '#e5e7eb' : '#374151',
        bodyColor: darkMode ? '#e5e7eb' : '#374151',
        borderColor: darkMode ? '#4b5563' : '#d1d5db',
        borderWidth: 1,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          title: (context: any) => {
            return new Date(context[0].parsed.x).toLocaleDateString();
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          },
          tooltipFormat: 'PPP'
        },
        grid: {
          color: darkMode ? '#374151' : '#f3f4f6',
        },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
        },
        title: {
          display: true,
          text: 'Date',
          color: darkMode ? '#e5e7eb' : '#374151',
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: darkMode ? '#374151' : '#f3f4f6',
        },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          precision: 0
        },
        title: {
          display: true,
          text: 'Model Count',
          color: darkMode ? '#e5e7eb' : '#374151',
        }
      }
    }
  };

  const toggleProviderSelection = (provider: string, type: 'inference' | 'model') => {
    if (type === 'inference') {
      const newSet = new Set(selectedInferenceProviders);
      if (newSet.has(provider)) {
        newSet.delete(provider);
      } else {
        newSet.add(provider);
      }
      setSelectedInferenceProviders(newSet);
    } else {
      const newSet = new Set(selectedModelProviders);
      if (newSet.has(provider)) {
        newSet.delete(provider);
      } else {
        newSet.add(provider);
      }
      setSelectedModelProviders(newSet);
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}
        data-testid={testId}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Historical Trends
            </h3>
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            data-testid={`${testId}-expand`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}
      data-testid={testId}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Historical Model Trends
            </h3>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            data-testid={`${testId}-collapse`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>

        {/* Time Range Controls */}
        <div className="mt-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Time Range:</span>
          {(['24h', '7d', '30d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              data-testid={`${testId}-range-${range}`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Selection */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Inference Providers */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Inference Providers
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableProviders.inferenceProviders.map(provider => (
                <label key={provider} className="flex items-center gap-2 cursor-pointer min-h-[28px] touch-manipulation">
                  <input
                    type="checkbox"
                    checked={selectedInferenceProviders.has(provider)}
                    onChange={() => toggleProviderSelection(provider, 'inference')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{provider}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Model Providers */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Model Providers
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableProviders.modelProviders.map(provider => (
                <label key={provider} className="flex items-center gap-2 cursor-pointer min-h-[28px] touch-manipulation">
                  <input
                    type="checkbox"
                    checked={selectedModelProviders.has(provider)}
                    onChange={() => toggleProviderSelection(provider, 'model')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{provider}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 sm:p-6">
        <div className="h-64 sm:h-80 lg:h-96">
          {filteredData.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center">
              No data available for the selected time range
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="p-3 sm:p-0">
            <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {filteredData.length > 0 ? filteredData[filteredData.length - 1].totalCount : 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Current Total</div>
          </div>
          <div className="p-3 sm:p-0">
            <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {availableProviders.inferenceProviders.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Inference Providers</div>
          </div>
          <div className="p-3 sm:p-0">
            <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {availableProviders.modelProviders.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Model Providers</div>
          </div>
          <div className="p-3 sm:p-0">
            <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {filteredData.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Data Points</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelHistoryChart;