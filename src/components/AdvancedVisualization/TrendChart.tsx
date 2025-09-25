import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { ComponentProps } from '../../types/ui';

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
  category?: string;
}

export interface TrendChartProps extends ComponentProps {
  data: TrendDataPoint[];
  type?: 'line' | 'area' | 'bar' | 'pie';
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  animate?: boolean;
  gradientFill?: boolean;
  multiSeries?: boolean;
  predictiveData?: TrendDataPoint[];
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
];

export const TrendChart: React.FC<TrendChartProps> = React.memo(({
  data,
  type = 'line',
  title,
  xAxisLabel,
  yAxisLabel,
  color = '#3B82F6',
  height = 300,
  showGrid = true,
  showLegend = true,
  animate = true,
  gradientFill = false,
  multiSeries = false,
  predictiveData = [],
  className = '',
  testId = 'trend-chart'
}) => {
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Combine actual and predictive data
    const combinedData = [...data];
    if (predictiveData.length > 0) {
      combinedData.push(...predictiveData.map(point => ({
        ...point,
        predicted: true
      })));
    }

    return combinedData;
  }, [data, predictiveData]);

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey="date"
          stroke="#6B7280"
          fontSize={12}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined}
        />
        <YAxis
          stroke="#6B7280"
          fontSize={12}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
          labelStyle={{ color: '#374151' }}
        />
        {showLegend && <Legend />}

        {/* Actual data line */}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          animationDuration={animate ? 1000 : 0}
          name="Actual"
        />

        {/* Predictive data line */}
        {predictiveData.length > 0 && (
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: color, strokeWidth: 2, r: 4, opacity: 0.7 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2, opacity: 0.7 }}
            animationDuration={animate ? 1000 : 0}
            name="Predicted"
            connectNulls={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {gradientFill && (
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
        )}
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey="date"
          stroke="#6B7280"
          fontSize={12}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined}
        />
        <YAxis
          stroke="#6B7280"
          fontSize={12}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
        />
        {showLegend && <Legend />}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={gradientFill ? "url(#colorGradient)" : color}
          fillOpacity={gradientFill ? 1 : 0.3}
          strokeWidth={2}
          animationDuration={animate ? 1000 : 0}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey="date"
          stroke="#6B7280"
          fontSize={12}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined}
        />
        <YAxis
          stroke="#6B7280"
          fontSize={12}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
        />
        {showLegend && <Legend />}
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
          animationDuration={animate ? 1000 : 0}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => {
    const pieData = data.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length]
    }));

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
            outerRadius={Math.min(height * 0.3, 100)}
            fill="#8884d8"
            dataKey="value"
            animationDuration={animate ? 1000 : 0}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'area':
        return renderAreaChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'line':
      default:
        return renderLineChart();
    }
  };

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}
        data-testid={`${testId}-empty`}
      >
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">📊</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`} data-testid={testId}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
      )}
      <div className="w-full">
        {renderChart()}
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';