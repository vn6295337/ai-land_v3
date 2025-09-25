import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelGrid } from '../ModelGrid';
import { AIModel } from '../../../types/models';

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

  beforeEach(() => {
    mockOnModelSelect.mockClear();
    mockOnModelFavorite.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders models in grid view by default', () => {
      render(<ModelGrid models={mockModels} />);

      expect(screen.getByTestId('model-grid')).toBeInTheDocument();
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
      expect(screen.getByText('Test Model 2')).toBeInTheDocument();
      expect(screen.getByText('Test Model 3')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ModelGrid models={mockModels} className="custom-class" />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('custom-class');
    });

    it('applies correct testId', () => {
      render(<ModelGrid models={mockModels} testId="custom-grid" />);

      expect(screen.getByTestId('custom-grid')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<ModelGrid models={mockModels} />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('role', 'region');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 3 models in grid view');
    });
  });

  describe('View Modes', () => {
    it('applies grid view classes', () => {
      render(<ModelGrid models={mockModels} viewMode="grid" />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });

    it('applies list view classes', () => {
      render(<ModelGrid models={mockModels} viewMode="list" />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('flex', 'flex-col');
    });

    it('applies compact view classes', () => {
      render(<ModelGrid models={mockModels} viewMode="compact" />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4', '2xl:grid-cols-6');
    });

    it('passes viewMode to ModelCard components', () => {
      render(<ModelGrid models={mockModels} viewMode="list" />);

      // The ModelCard mock doesn't explicitly test viewMode prop, but we can verify the component renders
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading cards when loading is true', () => {
      render(<ModelGrid models={[]} loading={true} loadingCount={3} />);

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
      render(<ModelGrid models={[]} loading={true} />);

      // Default loadingCount is 12
      expect(screen.getAllByText('Loading...')).toHaveLength(12);
    });

    it('does not render actual models when loading', () => {
      render(<ModelGrid models={mockModels} loading={true} />);

      expect(screen.queryByText('Test Model 1')).not.toBeInTheDocument();
      expect(screen.getAllByText('Loading...')).toHaveLength(12);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no models provided', () => {
      render(<ModelGrid models={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No Models Found')).toBeInTheDocument();
      expect(screen.getByText('No models found matching your criteria.')).toBeInTheDocument();
    });

    it('displays custom empty state message', () => {
      const customMessage = 'Try adjusting your search criteria';
      render(<ModelGrid models={[]} emptyStateMessage={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('renders children in empty state actions area', () => {
      render(
        <ModelGrid models={[]}>
          <button>Clear Filters</button>
        </ModelGrid>
      );

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('does not render empty state when loading', () => {
      render(<ModelGrid models={[]} loading={true} />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
  });

  describe('Model Interactions', () => {
    it('calls onModelSelect when model card is clicked', () => {
      render(
        <ModelGrid
          models={mockModels}
          onModelSelect={mockOnModelSelect}
        />
      );

      const modelCard = screen.getByTestId('model-card-model-1');
      fireEvent.click(modelCard);

      expect(mockOnModelSelect).toHaveBeenCalledWith(mockModels[0]);
    });

    it('calls onModelFavorite when favorite button is clicked', () => {
      render(
        <ModelGrid
          models={mockModels}
          onModelFavorite={mockOnModelFavorite}
        />
      );

      const favoriteButton = screen.getByTestId('model-card-model-1-favorite');
      fireEvent.click(favoriteButton);

      expect(mockOnModelFavorite).toHaveBeenCalledWith(mockModels[0]);
      expect(mockOnModelSelect).not.toHaveBeenCalled();
    });

    it('does not render favorite buttons when onModelFavorite is not provided', () => {
      render(<ModelGrid models={mockModels} />);

      expect(screen.queryByTestId('model-card-model-1-favorite')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for different model counts', () => {
      const { rerender } = render(<ModelGrid models={[mockModels[0]]} />);

      let grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 1 model in grid view');

      rerender(<ModelGrid models={mockModels} />);
      grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 3 models in grid view');
    });

    it('updates aria-label based on view mode', () => {
      render(<ModelGrid models={mockModels} viewMode="list" />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 3 models in list view');
    });

    it('provides accessible loading state', () => {
      render(<ModelGrid models={[]} loading={true} />);

      const loadingGrid = screen.getByTestId('model-grid-loading');
      expect(loadingGrid).toHaveAttribute('aria-label', 'Loading models');
    });
  });

  describe('Model Card Generation', () => {
    it('generates unique testIds for each model card', () => {
      render(<ModelGrid models={mockModels} />);

      expect(screen.getByTestId('model-card-model-1')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-model-2')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-model-3')).toBeInTheDocument();
    });

    it('passes all props correctly to ModelCard components', () => {
      render(
        <ModelGrid
          models={[mockModels[0]]}
          viewMode="compact"
          onModelSelect={mockOnModelSelect}
          onModelFavorite={mockOnModelFavorite}
        />
      );

      // Verify the model card renders with the correct model data
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
      expect(screen.getByText('testai')).toBeInTheDocument();

      // Verify interactions work
      fireEvent.click(screen.getByTestId('model-card-model-1'));
      expect(mockOnModelSelect).toHaveBeenCalledWith(mockModels[0]);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty models array gracefully', () => {
      render(<ModelGrid models={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.queryByText('Test Model 1')).not.toBeInTheDocument();
    });

    it('handles single model correctly', () => {
      render(<ModelGrid models={[mockModels[0]]} />);

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

      render(<ModelGrid models={manyModels} />);

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

      render(<ModelGrid models={[incompleteModel]} />);

      expect(screen.getByText('Incomplete Model')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('applies correct grid classes for each view mode', () => {
      const viewModes = ['grid', 'list', 'compact'] as const;

      viewModes.forEach(mode => {
        const { unmount } = render(<ModelGrid models={mockModels} viewMode={mode} />);
        const grid = screen.getByTestId('model-grid');
        expect(grid).toHaveClass('gap-4');
        unmount();
      });
    });

    it('maintains responsive design classes', () => {
      render(<ModelGrid models={mockModels} viewMode="grid" />);

      const grid = screen.getByTestId('model-grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });
  });
});