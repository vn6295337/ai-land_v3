/**
 * @file Tests for TypeScript interface definitions (Test requirement 54)
 *
 * Tests checkpoints 90-92, 97, 100, 102-103:
 * - AIModel interface
 * - ModelProvider type
 * - ModelMetrics interface
 * - APIResponse<T> generic interface
 * - ValidationResult interface
 * - ComponentProps interface
 * - EventHandlers interface
 */

import { describe, it, expect } from 'vitest';
import type {
  AIModel,
  ModelProvider,
  ModelMetrics,
  FilterCriteria,
  SortOptions,
  ViewMode,
  UserPreferences,
  APIResponse,
  ErrorState,
  LoadingState,
  ValidationResult
} from '../models';
import type {
  ComponentProps,
  EventHandlers,
  AccessibilityProps,
  PerformanceMetrics,
  ThemeConfig
} from '../ui';

describe('TypeScript Interface Definitions', () => {
  describe('AIModel Interface', () => {
    it('should accept valid AIModel object with required fields', () => {
      const model: AIModel = {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Advanced language model',
        provider: 'openai',
        category: 'language'
      };

      expect(model.id).toBe('gpt-4');
      expect(model.name).toBe('GPT-4');
      expect(model.description).toBe('Advanced language model');
      expect(model.provider).toBe('openai');
      expect(model.category).toBe('language');
    });

    it('should accept AIModel with optional fields', () => {
      const model: AIModel = {
        id: 'claude-3',
        name: 'Claude 3',
        description: 'Anthropic language model',
        provider: 'anthropic',
        category: 'language',
        parameters: 175,
        contextWindow: 200000,
        streaming: true,
        functionCalling: true,
        vision: true,
        pricing: {
          input: 0.015,
          output: 0.075,
          unit: 'per_1k_tokens'
        },
        metrics: {
          accuracy: 95,
          speed: 85,
          cost: 75,
          popularity: 90
        }
      };

      expect(model.parameters).toBe(175);
      expect(model.contextWindow).toBe(200000);
      expect(model.streaming).toBe(true);
      expect(model.functionCalling).toBe(true);
      expect(model.vision).toBe(true);
      expect(model.pricing?.input).toBe(0.015);
      expect(model.metrics?.accuracy).toBe(95);
    });
  });

  describe('ModelProvider Type', () => {
    it('should accept valid provider values', () => {
      const providers: ModelProvider[] = [
        'openai',
        'anthropic',
        'google',
        'huggingface',
        'cohere',
        'mistral',
        'meta',
        'perplexity',
        'together',
        'groq'
      ];

      providers.forEach(provider => {
        const model: AIModel = {
          id: 'test',
          name: 'Test',
          description: 'Test model',
          provider,
          category: 'language'
        };
        expect(model.provider).toBe(provider);
      });
    });
  });

  describe('ModelMetrics Interface', () => {
    it('should accept valid metrics object', () => {
      const metrics: ModelMetrics = {
        accuracy: 95.5,
        speed: 80,
        cost: 70,
        popularity: 85,
        quality: 90,
        safety: 95,
        lastUpdated: '2024-09-24T00:00:00Z'
      };

      expect(metrics.accuracy).toBe(95.5);
      expect(metrics.speed).toBe(80);
      expect(metrics.cost).toBe(70);
      expect(metrics.popularity).toBe(85);
      expect(metrics.quality).toBe(90);
      expect(metrics.safety).toBe(95);
      expect(metrics.lastUpdated).toBe('2024-09-24T00:00:00Z');
    });

    it('should accept partial metrics object', () => {
      const metrics: ModelMetrics = {
        accuracy: 90,
        speed: 85
      };

      expect(metrics.accuracy).toBe(90);
      expect(metrics.speed).toBe(85);
      expect(metrics.cost).toBeUndefined();
    });
  });

  describe('APIResponse<T> Generic Interface', () => {
    it('should work with different data types', () => {
      const stringResponse: APIResponse<string> = {
        data: 'test data',
        success: true,
        loading: false
      };

      const modelResponse: APIResponse<AIModel> = {
        data: {
          id: 'test',
          name: 'Test Model',
          description: 'Test',
          provider: 'openai',
          category: 'language'
        },
        success: true,
        loading: false
      };

      const arrayResponse: APIResponse<AIModel[]> = {
        data: [
          {
            id: 'model1',
            name: 'Model 1',
            description: 'First model',
            provider: 'openai',
            category: 'language'
          }
        ],
        success: true,
        loading: false,
        meta: {
          total: 1,
          page: 1,
          limit: 10
        }
      };

      expect(stringResponse.data).toBe('test data');
      expect(modelResponse.data.name).toBe('Test Model');
      expect(arrayResponse.data).toHaveLength(1);
      expect(arrayResponse.meta?.total).toBe(1);
    });

    it('should handle error states', () => {
      const errorResponse: APIResponse<null> = {
        data: null,
        success: false,
        loading: false,
        error: 'Request failed',
        status: 500
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Request failed');
      expect(errorResponse.status).toBe(500);
    });
  });

  describe('ValidationResult Interface', () => {
    it('should represent valid validation result', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(validResult.warnings).toHaveLength(0);
    });

    it('should represent invalid validation result with errors', () => {
      const invalidResult: ValidationResult = {
        isValid: false,
        errors: ['Field is required', 'Invalid format'],
        warnings: ['Field is deprecated'],
        fieldErrors: {
          email: ['Invalid email format'],
          password: ['Password too weak']
        }
      };

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
      expect(invalidResult.warnings).toHaveLength(1);
      expect(invalidResult.fieldErrors?.email).toContain('Invalid email format');
    });
  });

  describe('ComponentProps Interface', () => {
    it('should accept common component props', () => {
      const props: ComponentProps = {
        className: 'test-class',
        children: 'Test content',
        testId: 'test-component',
        disabled: false,
        loading: true,
        'aria-label': 'Test component',
        'data-testid': 'component-test'
      };

      expect(props.className).toBe('test-class');
      expect(props.children).toBe('Test content');
      expect(props.testId).toBe('test-component');
      expect(props.disabled).toBe(false);
      expect(props.loading).toBe(true);
      expect(props['aria-label']).toBe('Test component');
      expect(props['data-testid']).toBe('component-test');
    });
  });

  describe('EventHandlers Interface', () => {
    it('should accept event handler functions', () => {
      const mockClick = () => {};
      const mockFocus = () => {};

      const handlers: EventHandlers = {
        onClick: mockClick,
        onFocus: mockFocus,
        onMouseEnter: () => {},
        onKeyDown: () => {}
      };

      expect(typeof handlers.onClick).toBe('function');
      expect(typeof handlers.onFocus).toBe('function');
      expect(typeof handlers.onMouseEnter).toBe('function');
      expect(typeof handlers.onKeyDown).toBe('function');
    });
  });

  describe('Type Unions and Enums', () => {
    it('should accept valid SortOptions values', () => {
      const sortOptions: SortOptions[] = [
        'name',
        'provider',
        'category',
        'accuracy',
        'speed',
        'cost',
        'popularity',
        'parameters',
        'releaseDate',
        'updatedAt'
      ];

      sortOptions.forEach(option => {
        const sortBy: SortOptions = option;
        expect(sortBy).toBe(option);
      });
    });

    it('should accept valid ViewMode values', () => {
      const viewModes: ViewMode[] = ['grid', 'list', 'compact', 'table'];

      viewModes.forEach(mode => {
        const viewMode: ViewMode = mode;
        expect(viewMode).toBe(mode);
      });
    });
  });

  describe('Complex Interface Compositions', () => {
    it('should work with UserPreferences interface', () => {
      const preferences: UserPreferences = {
        theme: 'dark',
        viewMode: 'grid',
        defaultSort: 'name',
        defaultDirection: 'asc',
        favoritesOnly: false,
        favoriteModels: ['gpt-4', 'claude-3'],
        itemsPerPage: 24,
        autoRefreshInterval: 5,
        showDetailedMetrics: true,
        accessibility: {
          reducedMotion: false,
          highContrast: true,
          screenReader: false
        }
      };

      expect(preferences.theme).toBe('dark');
      expect(preferences.viewMode).toBe('grid');
      expect(preferences.favoriteModels).toContain('gpt-4');
      expect(preferences.accessibility?.highContrast).toBe(true);
    });

    it('should work with FilterCriteria interface', () => {
      const filters: FilterCriteria = {
        provider: ['openai', 'anthropic'],
        category: 'language',
        minAccuracy: 90,
        maxCost: 0.1,
        searchTerm: 'gpt',
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false
        },
        availableOnly: true
      };

      expect(Array.isArray(filters.provider)).toBe(true);
      expect(filters.category).toBe('language');
      expect(filters.minAccuracy).toBe(90);
      expect(filters.capabilities?.streaming).toBe(true);
    });
  });

  describe('Error and Loading States', () => {
    it('should work with ErrorState interface', () => {
      const error: ErrorState = {
        message: 'Network error occurred',
        code: 'NETWORK_ERROR',
        timestamp: '2024-09-24T12:00:00Z',
        retry: () => {},
        severity: 'high',
        recoverable: true
      };

      expect(error.message).toBe('Network error occurred');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.severity).toBe('high');
      expect(typeof error.retry).toBe('function');
    });

    it('should work with LoadingState interface', () => {
      const loading: LoadingState = {
        isLoading: true,
        progress: 75,
        stage: 'Processing data',
        estimatedTime: 30,
        cancel: () => {}
      };

      expect(loading.isLoading).toBe(true);
      expect(loading.progress).toBe(75);
      expect(loading.stage).toBe('Processing data');
      expect(typeof loading.cancel).toBe('function');
    });
  });
});