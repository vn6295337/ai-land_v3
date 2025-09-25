import React, { useMemo } from 'react';
import { ComponentProps } from '../../types/ui';

export interface MetricsGaugeProps extends ComponentProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  subtitle?: string;
  unit?: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  showValue?: boolean;
  showPercentage?: boolean;
  animated?: boolean;
  thresholds?: {
    good: number;
    warning: number;
  };
}

const COLORS = {
  blue: {
    primary: '#3B82F6',
    light: '#DBEAFE',
    gradient: 'from-blue-400 to-blue-600'
  },
  green: {
    primary: '#10B981',
    light: '#D1FAE5',
    gradient: 'from-green-400 to-green-600'
  },
  red: {
    primary: '#EF4444',
    light: '#FEE2E2',
    gradient: 'from-red-400 to-red-600'
  },
  yellow: {
    primary: '#F59E0B',
    light: '#FEF3C7',
    gradient: 'from-yellow-400 to-yellow-600'
  },
  purple: {
    primary: '#8B5CF6',
    light: '#EDE9FE',
    gradient: 'from-purple-400 to-purple-600'
  }
};

const SIZES = {
  small: { diameter: 120, strokeWidth: 8, fontSize: 'text-lg' },
  medium: { diameter: 160, strokeWidth: 12, fontSize: 'text-xl' },
  large: { diameter: 200, strokeWidth: 16, fontSize: 'text-2xl' }
};

export const MetricsGauge: React.FC<MetricsGaugeProps> = React.memo(({
  value,
  min = 0,
  max = 100,
  title,
  subtitle,
  unit = '',
  size = 'medium',
  color = 'blue',
  showValue = true,
  showPercentage = false,
  animated = true,
  thresholds,
  className = '',
  testId = 'metrics-gauge'
}) => {
  const { normalizedValue, percentage, displayValue, gaugeColor } = useMemo(() => {
    const clampedValue = Math.min(Math.max(value, min), max);
    const normalized = (clampedValue - min) / (max - min);
    const percent = normalized * 100;

    let selectedColor = color;

    // Override color based on thresholds if provided
    if (thresholds) {
      if (percent >= thresholds.good) {
        selectedColor = 'green';
      } else if (percent >= thresholds.warning) {
        selectedColor = 'yellow';
      } else {
        selectedColor = 'red';
      }
    }

    return {
      normalizedValue: normalized,
      percentage: percent,
      displayValue: clampedValue,
      gaugeColor: selectedColor
    };
  }, [value, min, max, color, thresholds]);

  const { diameter, strokeWidth, fontSize } = SIZES[size];
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - normalizedValue);

  const center = diameter / 2;

  const formatValue = (val: number): string => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
      data-testid={testId}
    >
      {/* Title and Subtitle */}
      {(title || subtitle) && (
        <div className="text-center mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Gauge SVG */}
      <div className="relative">
        <svg width={diameter} height={diameter} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            className="dark:stroke-gray-600"
          />

          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={COLORS[gaugeColor].primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={animated ? strokeDashoffset : 0}
            className={animated ? 'transition-all duration-1000 ease-out' : ''}
            style={{
              strokeDashoffset: strokeDashoffset
            }}
          />

          {/* Gradient definition for enhanced visual */}
          <defs>
            <linearGradient id={`gradient-${testId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={COLORS[gaugeColor].primary} stopOpacity={0.8} />
              <stop offset="100%" stopColor={COLORS[gaugeColor].primary} stopOpacity={1} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <div className={`${fontSize} font-bold text-gray-900 dark:text-gray-100`}>
              {formatValue(displayValue)}{unit}
            </div>
          )}
          {showPercentage && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {percentage.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Threshold indicators */}
      {thresholds && (
        <div className="mt-4 flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-500 dark:text-gray-400">
              &lt; {thresholds.warning}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-500 dark:text-gray-400">
              {thresholds.warning}% - {thresholds.good}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-500 dark:text-gray-400">
              ≥ {thresholds.good}%
            </span>
          </div>
        </div>
      )}

      {/* Min/Max labels */}
      <div className="mt-2 flex justify-between w-full text-xs text-gray-400 dark:text-gray-500">
        <span>{formatValue(min)}{unit}</span>
        <span>{formatValue(max)}{unit}</span>
      </div>
    </div>
  );
});

MetricsGauge.displayName = 'MetricsGauge';