import React, { useMemo } from 'react';
import { ComponentProps } from '../../types/ui';

export interface HeatMapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface HeatMapProps extends ComponentProps {
  data: HeatMapDataPoint[];
  title?: string;
  width?: number;
  height?: number;
  colorScheme?: 'blue' | 'red' | 'green' | 'purple' | 'orange';
  showLabels?: boolean;
  showTooltip?: boolean;
  cellSize?: number;
  maxValue?: number;
  minValue?: number;
  onCellClick?: (dataPoint: HeatMapDataPoint) => void;
}

const COLOR_SCHEMES = {
  blue: {
    colors: ['#EBF8FF', '#BEE3F8', '#90CDF4', '#63B3ED', '#4299E1', '#3182CE', '#2B77CB', '#2C5282'],
    name: 'Blue'
  },
  red: {
    colors: ['#FED7D7', '#FEB2B2', '#FC8181', '#F56565', '#E53E3E', '#C53030', '#9B2C2C', '#742A2A'],
    name: 'Red'
  },
  green: {
    colors: ['#F0FDF4', '#DCFCE7', '#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E', '#16A34A', '#15803D'],
    name: 'Green'
  },
  purple: {
    colors: ['#FAF5FF', '#E9D5FF', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'],
    name: 'Purple'
  },
  orange: {
    colors: ['#FFF7ED', '#FFEDD5', '#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C', '#C2410C'],
    name: 'Orange'
  }
};

export const HeatMap: React.FC<HeatMapProps> = React.memo(({
  data,
  title,
  width = 800,
  height = 400,
  colorScheme = 'blue',
  showLabels = true,
  showTooltip = true,
  cellSize = 40,
  maxValue,
  minValue,
  onCellClick,
  className = '',
  testId = 'heat-map'
}) => {
  const {
    processedData,
    xLabels,
    yLabels,
    valueRange,
    gridData
  } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        processedData: [],
        xLabels: [],
        yLabels: [],
        valueRange: { min: 0, max: 1 },
        gridData: []
      };
    }

    // Extract unique labels for axes
    const uniqueX = Array.from(new Set(data.map(d => d.x))).sort();
    const uniqueY = Array.from(new Set(data.map(d => d.y))).sort();

    // Calculate value range
    const values = data.map(d => d.value);
    const computedMin = minValue !== undefined ? minValue : Math.min(...values);
    const computedMax = maxValue !== undefined ? maxValue : Math.max(...values);

    // Create grid data structure for easier rendering
    const grid: (HeatMapDataPoint | null)[][] = [];
    for (let yIndex = 0; yIndex < uniqueY.length; yIndex++) {
      grid[yIndex] = [];
      for (let xIndex = 0; xIndex < uniqueX.length; xIndex++) {
        const dataPoint = data.find(d => d.x === uniqueX[xIndex] && d.y === uniqueY[yIndex]);
        grid[yIndex][xIndex] = dataPoint || null;
      }
    }

    return {
      processedData: data,
      xLabels: uniqueX,
      yLabels: uniqueY,
      valueRange: { min: computedMin, max: computedMax },
      gridData: grid
    };
  }, [data, minValue, maxValue]);

  const getColorForValue = (value: number): string => {
    const { min, max } = valueRange;
    if (max === min) return COLOR_SCHEMES[colorScheme].colors[0];

    const normalized = (value - min) / (max - min);
    const colorIndex = Math.floor(normalized * (COLOR_SCHEMES[colorScheme].colors.length - 1));
    return COLOR_SCHEMES[colorScheme].colors[Math.min(colorIndex, COLOR_SCHEMES[colorScheme].colors.length - 1)];
  };

  const formatValue = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(1);
  };

  const [hoveredCell, setHoveredCell] = React.useState<HeatMapDataPoint | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  const handleCellMouseEnter = (dataPoint: HeatMapDataPoint | null, event: React.MouseEvent) => {
    if (dataPoint && showTooltip) {
      setHoveredCell(dataPoint);
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
  };

  const handleCellClick = (dataPoint: HeatMapDataPoint | null) => {
    if (dataPoint && onCellClick) {
      onCellClick(dataPoint);
    }
  };

  const actualWidth = Math.max(width, xLabels.length * cellSize + 100);
  const actualHeight = Math.max(height, yLabels.length * cellSize + 100);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}
        data-testid={`${testId}-empty`}
      >
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">🔥</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No heat map data available</p>
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

      <div className="relative overflow-auto">
        <svg width={actualWidth} height={actualHeight} className="border border-gray-200 dark:border-gray-600 rounded">
          {/* Grid cells */}
          {gridData.map((row, yIndex) =>
            row.map((dataPoint, xIndex) => {
              const x = xIndex * cellSize + 80; // Offset for Y-axis labels
              const y = yIndex * cellSize + 40; // Offset for title
              const fillColor = dataPoint ? getColorForValue(dataPoint.value) : '#F9FAFB';

              return (
                <g key={`cell-${xIndex}-${yIndex}`}>
                  <rect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill={fillColor}
                    stroke="#E5E7EB"
                    strokeWidth={0.5}
                    className={`${onCellClick ? 'cursor-pointer' : ''} hover:stroke-2 hover:stroke-gray-400 transition-all`}
                    onMouseEnter={(e) => handleCellMouseEnter(dataPoint, e)}
                    onMouseLeave={handleCellMouseLeave}
                    onClick={() => handleCellClick(dataPoint)}
                    data-testid={`${testId}-cell-${xIndex}-${yIndex}`}
                  />
                  {showLabels && dataPoint && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs fill-gray-700 dark:fill-gray-300 pointer-events-none"
                      fontSize="10"
                    >
                      {formatValue(dataPoint.value)}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* X-axis labels */}
          {xLabels.map((label, index) => (
            <text
              key={`x-label-${index}`}
              x={index * cellSize + cellSize / 2 + 80}
              y={30}
              textAnchor="middle"
              className="text-xs fill-gray-600 dark:fill-gray-400"
              fontSize="11"
            >
              {String(label)}
            </text>
          ))}

          {/* Y-axis labels */}
          {yLabels.map((label, index) => (
            <text
              key={`y-label-${index}`}
              x={70}
              y={index * cellSize + cellSize / 2 + 45}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-600 dark:fill-gray-400"
              fontSize="11"
            >
              {String(label)}
            </text>
          ))}
        </svg>

        {/* Color scale legend */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatValue(valueRange.min)}
            </span>
            <div className="flex">
              {COLOR_SCHEMES[colorScheme].colors.map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatValue(valueRange.max)}
            </span>
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && hoveredCell && (
          <div
            className="fixed z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 30,
            }}
            data-testid={`${testId}-tooltip`}
          >
            <div>X: {hoveredCell.x}</div>
            <div>Y: {hoveredCell.y}</div>
            <div>Value: {formatValue(hoveredCell.value)}</div>
            {hoveredCell.label && <div>Label: {hoveredCell.label}</div>}
          </div>
        )}
      </div>
    </div>
  );
});

HeatMap.displayName = 'HeatMap';