import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { useUIStore } from '../../stores/uiStore';

export interface ThemeToggleProps extends ComponentProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'dropdown';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = false,
  size = 'md',
  variant = 'button',
  className = '',
  testId = 'theme-toggle'
}) => {
  const { theme, setTheme, toggleTheme } = useUIStore();

  const getThemeIcon = (currentTheme: string) => {
    switch (currentTheme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
        return Monitor;
      default:
        return Sun;
    }
  };

  const getThemeLabel = (currentTheme: string) => {
    switch (currentTheme) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'system':
        return 'System Theme';
      default:
        return 'Light Mode';
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`} data-testid={testId}>
        <div className="flex flex-col space-y-1">
          {(['light', 'dark', 'system'] as const).map((themeOption) => {
            const Icon = getThemeIcon(themeOption);
            const isActive = theme === themeOption;

            return (
              <button
                key={themeOption}
                onClick={() => setTheme(themeOption)}
                className={`
                  flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors
                  ${isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                data-testid={`${testId}-${themeOption}`}
              >
                <Icon className={iconSizes[size]} />
                <span>{getThemeLabel(themeOption)}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Button variant
  const Icon = getThemeIcon(theme);

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        inline-flex items-center justify-center rounded-md
        bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
        text-gray-700 dark:text-gray-300
        hover:bg-gray-50 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-colors duration-200
        touch-manipulation
        ${className}
      `}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      data-testid={testId}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {getThemeLabel(theme)}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;