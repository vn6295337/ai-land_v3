/**
 * Format Utilities
 *
 * This module provides formatting functions for dates, numbers,
 * file sizes, and model-specific metrics.
 */

/**
 * Format date with locale support
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };

    return dateObj.toLocaleDateString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
    } else if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
    } else {
      return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
    }
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format number with locale support
 */
export function formatNumber(
  num: number,
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    if (!isFinite(num)) {
      return 'Invalid number';
    }

    return num.toLocaleString(undefined, options);
  } catch (error) {
    return 'Invalid number';
  }
}

/**
 * Format large numbers with units (K, M, B, T)
 */
export function formatLargeNumber(num: number, precision = 1): string {
  try {
    if (!isFinite(num) || num < 0) {
      return 'Invalid number';
    }

    if (num < 1000) {
      return num.toString();
    }

    const units = ['', 'K', 'M', 'B', 'T'];
    const unitIndex = Math.floor(Math.log10(num) / 3);
    const unitValue = Math.pow(1000, unitIndex);
    const formattedNumber = (num / unitValue).toFixed(precision);

    return `${parseFloat(formattedNumber)}${units[unitIndex] || ''}`;
  } catch (error) {
    return 'Invalid number';
  }
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number, precision = 1): string {
  try {
    if (!isFinite(bytes) || bytes < 0) {
      return 'Invalid size';
    }

    if (bytes === 0) {
      return '0 Bytes';
    }

    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const unitIndex = Math.floor(Math.log2(bytes) / 10);
    const unitValue = Math.pow(1024, unitIndex);
    const formattedSize = (bytes / unitValue).toFixed(precision);

    return `${parseFloat(formattedSize)} ${units[unitIndex] || 'Bytes'}`;
  } catch (error) {
    return 'Invalid size';
  }
}

/**
 * Format percentage with optional precision
 */
export function formatPercentage(
  value: number,
  precision = 1,
  includeSign = true
): string {
  try {
    if (!isFinite(value)) {
      return 'Invalid percentage';
    }

    const formatted = value.toFixed(precision);
    return includeSign ? `${formatted}%` : formatted;
  } catch (error) {
    return 'Invalid percentage';
  }
}

/**
 * Format currency with locale support
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    if (!isFinite(amount)) {
      return 'Invalid amount';
    }

    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    };

    return amount.toLocaleString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    return 'Invalid amount';
  }
}

/**
 * Format model metrics for display
 */
export function formatMetrics(metrics: {
  accuracy?: number;
  speed?: number;
  cost?: number;
  popularity?: number;
  quality?: number;
  safety?: number;
}): {
  accuracy?: string;
  speed?: string;
  cost?: string;
  popularity?: string;
  quality?: string;
  safety?: string;
} {
  const formatted: ReturnType<typeof formatMetrics> = {};

  if (typeof metrics.accuracy === 'number') {
    formatted.accuracy = formatPercentage(metrics.accuracy, 1);
  }

  if (typeof metrics.speed === 'number') {
    // Speed rating out of 100
    formatted.speed = `${metrics.speed.toFixed(0)}/100`;
  }

  if (typeof metrics.cost === 'number') {
    // Cost per 1K tokens
    if (metrics.cost < 0.01) {
      formatted.cost = `$${(metrics.cost * 1000).toFixed(3)}/1M tokens`;
    } else {
      formatted.cost = `$${metrics.cost.toFixed(3)}/1K tokens`;
    }
  }

  if (typeof metrics.popularity === 'number') {
    formatted.popularity = `${metrics.popularity.toFixed(0)}/100`;
  }

  if (typeof metrics.quality === 'number') {
    formatted.quality = `${metrics.quality.toFixed(0)}/100`;
  }

  if (typeof metrics.safety === 'number') {
    formatted.safety = `${metrics.safety.toFixed(0)}/100`;
  }

  return formatted;
}

/**
 * Format model parameter count
 */
export function formatParameters(parameters: number): string {
  try {
    if (!isFinite(parameters) || parameters < 0) {
      return 'Unknown';
    }

    if (parameters < 1) {
      return `${(parameters * 1000).toFixed(0)}M`;
    }

    return `${parameters.toFixed(1)}B`;
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Format context window size
 */
export function formatContextWindow(contextWindow: number): string {
  try {
    if (!isFinite(contextWindow) || contextWindow < 0) {
      return 'Unknown';
    }

    if (contextWindow < 1000) {
      return contextWindow.toString();
    }

    if (contextWindow < 1000000) {
      return `${(contextWindow / 1000).toFixed(0)}K`;
    }

    return `${(contextWindow / 1000000).toFixed(1)}M`;
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  try {
    if (!isFinite(ms) || ms < 0) {
      return 'Invalid duration';
    }

    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }

    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }

    const minutes = seconds / 60;
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }

    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  } catch (error) {
    return 'Invalid duration';
  }
}

/**
 * Format API response time
 */
export function formatResponseTime(ms: number): string {
  try {
    if (!isFinite(ms) || ms < 0) {
      return 'Unknown';
    }

    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }

    return `${(ms / 1000).toFixed(1)}s`;
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format search query for display
 */
export function formatSearchQuery(query: string, maxLength = 50): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  const trimmed = query.trim();
  return truncateText(trimmed, maxLength);
}

/**
 * Format list of items with proper grammar
 */
export function formatList(
  items: string[],
  conjunction = 'and',
  maxItems = 3
): string {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`;
  }

  if (items.length <= maxItems) {
    const lastItem = items[items.length - 1];
    const otherItems = items.slice(0, -1).join(', ');
    return `${otherItems}, ${conjunction} ${lastItem}`;
  }

  const visibleItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;
  return `${visibleItems.join(', ')}, and ${remainingCount} more`;
}