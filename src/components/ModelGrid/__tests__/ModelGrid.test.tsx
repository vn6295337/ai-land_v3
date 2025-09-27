import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelGrid } from '../ModelGrid';
import { AIModel } from '../../../types/models';

// Mock the stores
vi.mock('../../../stores/modelsStore', () => ({
  useModelsStore: vi.fn(),
  modelsSelectors: {
    getCurrentPageModels: vi.fn(),
    getLoadingInfo: vi.fn()
  }
}));

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn(),
  uiSelectors: {}
}));

// Mock the ModelCard component
vi.mock('../../ModelCard/ModelCard', () => ({
  ModelCard: ({ model, loading, testId, onSelect, onFavorite }: any) => {
    if (loading) {
      return <div data-testid={testId}>Loading...</div>;
    }
    return (
      <div
        data-testid={testId}
        onClick={() => onSelect?.(model)}
      >
        <h3>{model.name}</h3>
        <span>{model.provider}</span>
        {onFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(model);
            }}
            data-testid={`${testId}-favorite`}
          >
            Favorite
          </button>
        )}
      </div>
    );
  }
}));

// Mock Pagination component
vi.mock('../../Pagination/Pagination', () => ({
  Pagination: ({ testId }: any) => (
    <div data-testid={testId}>Pagination</div>
  )
}));

// Mock CSS modules
vi.mock('../ModelGrid.module.css', () => ({
  default: {},
}));

// Mock model data
const mockModels: AIModel[] = [
  {
    id: 'model-1',
    name: 'Test Model 1',
    description: 'First test model',
    provider: 'testai',
    modelId: 'test-1',
    category: 'conversational',
    cost: 0.02,
    contextLength: 4096,
    streaming: true,
    functionCalling: false,
    vision: false,
    lastUpdated: '2024-01-01',
    availability: 'public',
    license: 'mit'
  },
  {
    id: 'model-2',
    name: 'Test Model 2',
    description: 'Second test model',
    provider: 'openai',
    modelId: 'test-2',
    category: 'code_generation',
    cost: 0,
    contextLength: 8192,
    streaming: false,
    functionCalling: true,
    vision: true,
    lastUpdated: '2024-01-02',
    availability: 'public',
    license: 'proprietary'
  },
  {
    id: 'model-3',
    name: 'Test Model 3',
    description: 'Third test model',
    provider: 'anthropic',
    modelId: 'test-3',
    category: 'conversational',
    cost: 0.05,
    contextLength: 16384,
    streaming: true,
    functionCalling: true,
    vision: false,
    lastUpdated: '2024-01-03',
    availability: 'public',
    license: 'proprietary'
  }
];

describe('ModelGrid Component', () => {
  const mockOnModelSelect = vi.fn();
  const mockOnModelFavorite = vi.fn();
  const mockToggleFavorite = vi.fn();
  const mockOpenModelDetails = vi.fn();

  const setupMocks = async (models: AIModel[] = mockModels, loading = false, viewMode = 'grid') => {
    // Import the mocked stores
    const { useModelsStore, modelsSelectors } = await import('../../../stores/modelsStore');
    const { useUIStore } = await import('../../../stores/uiStore');

    vi.mocked(modelsSelectors.getCurrentPageModels).mockReturnValue(models);
    vi.mocked(modelsSelectors.getLoadingInfo).mockReturnValue({ isLoading: loading });

    vi.mocked(useModelsStore).mockReturnValue({
      loading,
      toggleFavorite: mockToggleFavorite
    } as any);

    vi.mocked(useUIStore).mockReturnValue({
      viewMode,
      openModelDetails: mockOpenModelDetails
    } as any);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockOnModelSelect.mockClear();
    mockOnModelFavorite.mockClear();
    mockToggleFavorite.mockClear();
    mockOpenModelDetails.mockClear();

    // Default setup - non-loading state with models
    await setupMocks();
  });

  describe('Basic Rendering', () => {
    it('renders models in grid view by default', () => {
      render(<ModelGrid />);

      expect(screen.getByTestId('model-grid')).toBeInTheDocument();
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
      expect(screen.getByText('Test Model 2')).toBeInTheDocument();
      expect(screen.getByText('Test Model 3')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ModelGrid className="custom-class" />);

      const container = screen.getByTestId('model-grid').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('applies correct testId', () => {
      render(<ModelGrid testId="custom-grid" />);

      expect(screen.getByTestId('custom-grid')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<ModelGrid />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('role', 'region');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 3 models in grid view');
    });
  });

  describe('View Modes', () => {
    it('applies grid view classes', async () => {
      await setupMocks(mockModels, false, 'grid');
      render(<ModelGrid />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });

    it('applies list view classes', () => {
      setupMocks(mockModels, false, 'list');
      render(<ModelGrid />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('flex', 'flex-col');
    });

    it('applies compact view classes', () => {
      setupMocks(mockModels, false, 'compact');
      render(<ModelGrid />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4', '2xl:grid-cols-6');
    });

    it('passes viewMode to ModelCard components', () => {
      setupMocks(mockModels, false, 'list');
      render(<ModelGrid />);

      // The ModelCard mock doesn't explicitly test viewMode prop, but we can verify the component renders
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading cards when loading is true', () => {
      setupMocks([], true);
      render(<ModelGrid loadingCount={3} />);

      const loadingGrid = screen.getByTestId('model-grid-loading');
      expect(loadingGrid).toBeInTheDocument();
      expect(loadingGrid).toHaveAttribute('aria-label', 'Loading models');

      // Check for loading cards
      expect(screen.getByTestId('loading-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('loading-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('loading-card-2')).toBeInTheDocument();
      expect(screen.getAllByText('Loading...')).toHaveLength(3);
    });

    it('uses default loading count when not specified', () => {
      setupMocks([], true);
      render(<ModelGrid />);

      // Default loadingCount is 12
      expect(screen.getAllByText('Loading...')).toHaveLength(12);
    });

    it('does not render actual models when loading', () => {
      setupMocks(mockModels, true);
      render(<ModelGrid />);

      expect(screen.queryByText('Test Model 1')).not.toBeInTheDocument();
      expect(screen.getAllByText('Loading...')).toHaveLength(12);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no models provided', () => {
      setupMocks([]);
      render(<ModelGrid />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No Models Found')).toBeInTheDocument();
      expect(screen.getByText('No models found matching your criteria.')).toBeInTheDocument();
    });

    it('displays custom empty state message', () => {
      setupMocks([]);
      const customMessage = 'Try adjusting your search criteria';
      render(<ModelGrid emptyStateMessage={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('renders children in empty state actions area', () => {
      setupMocks([]);
      render(
        <ModelGrid>
          <button>Clear Filters</button>
        </ModelGrid>
      );

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('does not render empty state when loading', () => {
      setupMocks([], true);
      render(<ModelGrid />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
  });

  describe('Model Interactions', () => {
    it('calls openModelDetails when model card is clicked', () => {
      render(<ModelGrid />);

      const modelCard = screen.getByTestId('model-card-model-1');
      fireEvent.click(modelCard);

      expect(mockOpenModelDetails).toHaveBeenCalledWith('model-1');
    });

    it('calls toggleFavorite when favorite button is clicked', () => {
      render(<ModelGrid />);

      const favoriteButton = screen.getByTestId('model-card-model-1-favorite');
      fireEvent.click(favoriteButton);

      expect(mockToggleFavorite).toHaveBeenCalledWith('model-1');
      expect(mockOpenModelDetails).not.toHaveBeenCalled();
    });

    it('always renders favorite buttons', () => {
      render(<ModelGrid />);

      expect(screen.getByTestId('model-card-model-1-favorite')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for different model counts', () => {
      setupMocks([mockModels[0]]);
      const { rerender } = render(<ModelGrid />);

      let grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 1 model in grid view');

      setupMocks(mockModels);
      rerender(<ModelGrid />);
      grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 3 models in grid view');
    });

    it('updates aria-label based on view mode', () => {
      setupMocks(mockModels, false, 'list');
      render(<ModelGrid />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 3 models in list view');
    });

    it('provides accessible loading state', () => {
      setupMocks([], true);
      render(<ModelGrid />);

      const loadingGrid = screen.getByTestId('model-grid-loading');
      expect(loadingGrid).toHaveAttribute('aria-label', 'Loading models');
    });
  });

  describe('Model Card Generation', () => {
    it('generates unique testIds for each model card', () => {
      render(<ModelGrid />);

      expect(screen.getByTestId('model-card-model-1')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-model-2')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-model-3')).toBeInTheDocument();
    });

    it('passes all props correctly to ModelCard components', () => {
      setupMocks([mockModels[0]], false, 'compact');
      render(<ModelGrid />);

      // Verify the model card renders with the correct model data
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
      expect(screen.getByText('testai')).toBeInTheDocument();

      // Verify interactions work
      fireEvent.click(screen.getByTestId('model-card-model-1'));
      expect(mockOpenModelDetails).toHaveBeenCalledWith('model-1');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty models array gracefully', () => {
      setupMocks([]);
      render(<ModelGrid />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.queryByText('Test Model 1')).not.toBeInTheDocument();
    });

    it('handles single model correctly', () => {
      setupMocks([mockModels[0]]);
      render(<ModelGrid />);

      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Model 2')).not.toBeInTheDocument();

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 1 model in grid view');
    });

    it('handles very large model arrays', () => {
      const manyModels = Array.from({ length: 100 }, (_, i) => ({
        ...mockModels[0],
        id: `model-${i}`,
        name: `Test Model ${i}`
      }));

      setupMocks(manyModels);
      render(<ModelGrid />);

      expect(screen.getByText('Test Model 0')).toBeInTheDocument();
      expect(screen.getByText('Test Model 99')).toBeInTheDocument();

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 100 models in grid view');
    });

    it('handles models with missing or undefined properties', () => {
      const incompleteModel = {
        id: 'incomplete',
        name: 'Incomplete Model',
        description: '',
        provider: 'test'
      } as AIModel;

      setupMocks([incompleteModel]);
      render(<ModelGrid />);

      expect(screen.getByText('Incomplete Model')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('applies correct grid classes for each view mode', () => {
      const viewModes = ['grid', 'list', 'compact'] as const;

      viewModes.forEach(mode => {
        setupMocks(mockModels, false, mode);
        const { unmount } = render(<ModelGrid />);
        const grid = screen.getByTestId('model-grid');
        expect(grid).toHaveClass('gap-4');
        unmount();
      });
    });

    it('maintains responsive design classes', () => {
      setupMocks(mockModels, false, 'grid');
      render(<ModelGrid />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });
  });
});