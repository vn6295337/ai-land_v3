/**
 * Core type definitions for AI models and related entities
 *
 * This module provides the fundamental TypeScript interfaces and types
 * used throughout the AI Models Dashboard application.
 */

/**
 * Supported AI model providers
 */
export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'huggingface'
  | 'cohere'
  | 'mistral'
  | 'meta'
  | 'perplexity'
  | 'together'
  | 'groq';

/**
 * Model categories for classification
 */
export type ModelCategory =
  | 'language'
  | 'multimodal'
  | 'embedding'
  | 'image'
  | 'audio'
  | 'code'
  | 'reasoning';

/**
 * Core AI model interface representing a single model
 */
export interface AIModel {
  /** Unique identifier for the model */
  id: string;

  /** Display name of the model */
  name: string;

  /** Detailed description of the model's capabilities */
  description: string;

  /** Provider/organization that created the model */
  provider: ModelProvider;

  /** Category classification of the model */
  category: ModelCategory;

  /** Model version or identifier used by the provider */
  modelId?: string;

  /** URL to model documentation or homepage */
  url?: string;

  /** Model parameter count (in billions) */
  parameters?: number;

  /** Context window size (in tokens) */
  contextWindow?: number;

  /** Maximum output tokens */
  maxTokens?: number;

  /** Whether the model supports streaming */
  streaming?: boolean;

  /** Whether the model supports function calling */
  functionCalling?: boolean;

  /** Whether the model supports vision/image inputs */
  vision?: boolean;

  /** Pricing information */
  pricing?: {
    input?: number;  // Price per 1K input tokens
    output?: number; // Price per 1K output tokens
    unit?: string;   // Pricing unit (e.g., 'per_1k_tokens')
  };

  /** Performance metrics */
  metrics?: ModelMetrics;

  /** Model availability status */
  available?: boolean;

  /** Release date */
  releaseDate?: string;

  /** Last updated timestamp */
  updatedAt?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  // Extended fields from ai_models_main table
  /** Inference provider */
  inferenceProvider?: string;

  /** Model provider */
  modelProvider?: string;

  /** Model name (human readable) */
  modelName?: string;

  /** Country of origin */
  country?: string;

  /** Official URL */
  officialUrl?: string;

  /** Input modalities */
  inputModalities?: string;

  /** Output modalities */
  outputModalities?: string;

  /** License name */
  license?: string;

  /** License URL */
  licenseUrl?: string;

  /** License information text */
  licenseInfo?: string;

  /** License information URL */
  licenseInfoUrl?: string;

  /** Rate limits */
  rateLimits?: string;

  /** API access information */
  apiAccess?: string;

  /** Created at timestamp */
  createdAt?: string;
}

/**
 * Performance metrics for AI models
 */
export interface ModelMetrics {
  /** Accuracy score (0-100) */
  accuracy?: number;

  /** Speed rating (0-100) */
  speed?: number;

  /** Cost efficiency rating (0-100) */
  cost?: number;

  /** Community popularity rating (0-100) */
  popularity?: number;

  /** Quality rating (0-100) */
  quality?: number;

  /** Safety rating (0-100) */
  safety?: number;

  /** Last time metrics were updated */
  lastUpdated?: string;
}

/**
 * Filter criteria for model search and filtering
 */
export interface FilterCriteria {
  /** Filter by provider */
  provider?: ModelProvider | ModelProvider[];

  /** Filter by category */
  category?: ModelCategory | ModelCategory[];

  /** Minimum accuracy threshold */
  minAccuracy?: number;

  /** Maximum cost threshold */
  maxCost?: number;

  /** Search term for name/description */
  searchTerm?: string;

  /** Minimum parameter count */
  minParameters?: number;

  /** Maximum parameter count */
  maxParameters?: number;

  /** Minimum context window */
  minContextWindow?: number;

  /** Required capabilities */
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
    vision?: boolean;
  };

  /** Only show available models */
  availableOnly?: boolean;

  /** Date range filter */
  dateRange?: {
    from?: string;
    to?: string;
  };
}

/**
 * Sorting options for model lists
 */
export type SortOptions =
  | 'name'
  | 'provider'
  | 'category'
  | 'accuracy'
  | 'speed'
  | 'cost'
  | 'popularity'
  | 'parameters'
  | 'releaseDate'
  | 'updatedAt';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * View mode options for displaying models
 */
export type ViewMode = 'grid' | 'list' | 'compact' | 'table';

/**
 * User preferences for the application
 */
export interface UserPreferences {
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';

  /** Default view mode */
  viewMode: ViewMode;

  /** Default sorting option */
  defaultSort: SortOptions;

  /** Default sort direction */
  defaultDirection: SortDirection;

  /** Show only favorites */
  favoritesOnly: boolean;

  /** Favorite model IDs */
  favoriteModels: string[];

  /** Default filter settings */
  defaultFilters?: Partial<FilterCriteria>;

  /** Items per page for pagination */
  itemsPerPage: number;

  /** Auto-refresh interval in minutes */
  autoRefreshInterval: number;

  /** Show detailed metrics */
  showDetailedMetrics: boolean;

  /** Accessibility preferences */
  accessibility?: {
    reducedMotion?: boolean;
    highContrast?: boolean;
    screenReader?: boolean;
  };
}

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  /** Response data */
  data: T;

  /** Error message if request failed */
  error?: string;

  /** Loading state indicator */
  loading: boolean;

  /** Success state indicator */
  success: boolean;

  /** HTTP status code */
  status?: number;

  /** Response metadata */
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

/**
 * Error state representation
 */
export interface ErrorState {
  /** Error message */
  message: string;

  /** Error code */
  code?: string | number;

  /** Timestamp when error occurred */
  timestamp: string;

  /** Retry function */
  retry?: () => void;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** Error severity level */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /** Whether error is recoverable */
  recoverable?: boolean;
}

/**
 * Loading state representation
 */
export interface LoadingState {
  /** Whether currently loading */
  isLoading: boolean;

  /** Loading progress (0-100) */
  progress?: number;

  /** Current loading stage */
  stage?: string;

  /** Estimated time remaining in seconds */
  estimatedTime?: number;

  /** Cancellation function */
  cancel?: () => void;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Validation error messages */
  errors: string[];

  /** Validation warning messages */
  warnings: string[];

  /** Field-specific errors */
  fieldErrors?: Record<string, string[]>;
}