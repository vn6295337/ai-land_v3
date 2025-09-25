/**
 * UI component type definitions
 *
 * This module provides TypeScript interfaces and types for
 * UI components, theming, and user interface elements.
 */

import { ReactNode } from 'react';

/**
 * Theme configuration interface
 */
export interface ThemeConfig {
  /** Color palette */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };

  /** Typography settings */
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
    sizes: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    weights: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };

  /** Spacing scale */
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };

  /** Responsive breakpoints */
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    wide: string;
  };

  /** Border radius values */
  radii: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };

  /** Shadow definitions */
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  /** Z-index layers */
  zIndex: {
    dropdown: number;
    modal: number;
    tooltip: number;
    overlay: number;
  };
}

/**
 * Generic component props that most components accept
 */
export interface ComponentProps {
  /** Additional CSS class name */
  className?: string;

  /** Child elements */
  children?: ReactNode;

  /** Test identifier for automated testing */
  testId?: string;

  /** Custom inline styles */
  style?: React.CSSProperties;

  /** Whether component is disabled */
  disabled?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Aria label for accessibility */
  'aria-label'?: string;

  /** Aria description for accessibility */
  'aria-describedby'?: string;

  /** Custom data attributes */
  [key: `data-${string}`]: unknown;
}

/**
 * Event handler interfaces
 */
export interface EventHandlers {
  /** Click event handler */
  onClick?: (event: React.MouseEvent) => void;

  /** Hover event handlers */
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;

  /** Focus event handlers */
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;

  /** Keyboard event handlers */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onKeyUp?: (event: React.KeyboardEvent) => void;
  onKeyPress?: (event: React.KeyboardEvent) => void;
}

/**
 * Accessibility properties
 */
export interface AccessibilityProps {
  /** Aria label */
  ariaLabel?: string;

  /** Aria description */
  ariaDescription?: string;

  /** ARIA role */
  role?: string;

  /** Tab index for keyboard navigation */
  tabIndex?: number;

  /** Whether element is focusable */
  focusable?: boolean;

  /** Screen reader only text */
  srOnly?: string;

  /** ARIA expanded state */
  ariaExpanded?: boolean;

  /** ARIA selected state */
  ariaSelected?: boolean;

  /** ARIA disabled state */
  ariaDisabled?: boolean;
}

/**
 * Performance metrics for components
 */
export interface PerformanceMetrics {
  /** Render time in milliseconds */
  renderTime: number;

  /** Bundle size in bytes */
  bundleSize: number;

  /** Memory usage in MB */
  memoryUsage: number;

  /** Cache hit rate (0-100) */
  cacheHitRate: number;

  /** Number of re-renders */
  reRenderCount: number;

  /** Time to interactive in milliseconds */
  timeToInteractive: number;
}

/**
 * Animation and transition options
 */
export interface AnimationConfig {
  /** Animation duration in milliseconds */
  duration: number;

  /** Animation easing function */
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | string;

  /** Animation delay in milliseconds */
  delay?: number;

  /** Whether to respect reduced motion preference */
  respectReducedMotion?: boolean;

  /** Animation direction */
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';

  /** Number of iterations */
  iterations?: number | 'infinite';
}

/**
 * Modal and dialog configuration
 */
export interface ModalConfig {
  /** Whether modal is open */
  isOpen: boolean;

  /** Function to close modal */
  onClose: () => void;

  /** Whether to show close button */
  showCloseButton?: boolean;

  /** Whether to close on backdrop click */
  closeOnBackdrop?: boolean;

  /** Whether to close on escape key */
  closeOnEscape?: boolean;

  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /** Whether modal is centered */
  centered?: boolean;

  /** Custom backdrop opacity */
  backdropOpacity?: number;
}

/**
 * Notification/Toast configuration
 */
export interface NotificationConfig {
  /** Notification message */
  message: string;

  /** Notification type */
  type: 'success' | 'error' | 'warning' | 'info';

  /** Duration in milliseconds (0 for persistent) */
  duration?: number;

  /** Whether notification is dismissible */
  dismissible?: boolean;

  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };

  /** Notification position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

  /** Custom icon */
  icon?: ReactNode;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
  /** Field name */
  name: string;

  /** Field label */
  label: string;

  /** Field type */
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';

  /** Field placeholder */
  placeholder?: string;

  /** Whether field is required */
  required?: boolean;

  /** Field validation rules */
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | undefined;
  };

  /** Field options for select/radio */
  options?: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;

  /** Help text */
  helpText?: string;

  /** Error message */
  errorMessage?: string;
}

/**
 * Table column configuration
 */
export interface TableColumn<T = unknown> {
  /** Column key */
  key: string;

  /** Column header label */
  label: string;

  /** Whether column is sortable */
  sortable?: boolean;

  /** Column width */
  width?: string | number;

  /** Column alignment */
  align?: 'left' | 'center' | 'right';

  /** Custom cell renderer */
  render?: (value: unknown, row: T) => ReactNode;

  /** Whether column is resizable */
  resizable?: boolean;

  /** Whether column is hidden */
  hidden?: boolean;

  /** Column group */
  group?: string;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Current page (1-based) */
  currentPage: number;

  /** Total number of pages */
  totalPages: number;

  /** Items per page */
  pageSize: number;

  /** Total number of items */
  totalItems: number;

  /** Page change handler */
  onPageChange: (page: number) => void;

  /** Page size change handler */
  onPageSizeChange?: (size: number) => void;

  /** Whether to show page size selector */
  showPageSize?: boolean;

  /** Available page sizes */
  pageSizeOptions?: number[];
}

/**
 * Search and filter UI state
 */
export interface SearchFilterState {
  /** Current search query */
  searchQuery: string;

  /** Active filters */
  activeFilters: Record<string, unknown>;

  /** Sort configuration */
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };

  /** Pagination state */
  pagination: {
    page: number;
    size: number;
  };

  /** Total results count */
  totalResults: number;

  /** Whether search is loading */
  isLoading: boolean;
}

/**
 * Drag and drop configuration
 */
export interface DragDropConfig {
  /** Whether drag is enabled */
  draggable: boolean;

  /** Drag data */
  dragData?: Record<string, unknown>;

  /** Drag start handler */
  onDragStart?: (event: React.DragEvent) => void;

  /** Drag end handler */
  onDragEnd?: (event: React.DragEvent) => void;

  /** Drop handler */
  onDrop?: (event: React.DragEvent) => void;

  /** Drag over handler */
  onDragOver?: (event: React.DragEvent) => void;

  /** Drop zone configuration */
  dropZone?: {
    accept: string[];
    maxFiles?: number;
    maxSize?: number;
  };
}

/**
 * Responsive behavior configuration
 */
export interface ResponsiveConfig {
  /** Breakpoint-specific visibility */
  hideAt?: 'mobile' | 'tablet' | 'desktop';
  showAt?: 'mobile' | 'tablet' | 'desktop';

  /** Responsive grid configuration */
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  /** Responsive spacing */
  spacing?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };

  /** Responsive text size */
  fontSize?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}

/**
 * Virtual scrolling configuration
 */
export interface VirtualScrollConfig {
  /** Item height in pixels */
  itemHeight: number;

  /** Container height in pixels */
  containerHeight: number;

  /** Number of items to render outside viewport */
  overscan?: number;

  /** Whether to enable horizontal scrolling */
  horizontal?: boolean;

  /** Scroll event handler */
  onScroll?: (scrollTop: number) => void;
}