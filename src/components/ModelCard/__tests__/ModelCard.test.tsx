import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelCard } from '../ModelCard';
import { AIModel } from '../../../types/models';

// Mock CSS modules
vi.mock('../ModelCard.module.css', () => ({
  default: {},
}));

// Mock model data
const mockModel: AIModel = {
  id: 'test-model-1',
  name: 'Test Model GPT',
  description: 'A comprehensive test model for AI applications with advanced capabilities',
  provider: 'testai',
  modelId: 'test-gpt-4',
  category: 'conversational',
  cost: 0.02,
  contextLength: 8192,
  streaming: true,
  functionCalling: true,
  vision: false,
  lastUpdated: '2024-01-15',
  availability: 'public',
  license: 'proprietary'
};

const freeModel: AIModel = {
  ...mockModel,
  id: 'free-model-1',
  name: 'Free Test Model',
  cost: 0
};

describe('ModelCard Component', () => {
  const mockOnSelect = vi.fn();
  const mockOnFavorite = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnFavorite.mockClear();
  });

  afterEach(() => {
    // Reset dark mode
    document.documentElement.classList.remove('dark');
  });

  describe('Basic Rendering', () => {
    it('renders model information correctly in grid view', () => {
      render(<ModelCard model={mockModel} />);

      expect(screen.getByText('Test Model GPT')).toBeInTheDocument();
      expect(screen.getByText('testai')).toBeInTheDocument();
      expect(screen.getByText('A comprehensive test model for AI applications with advanced capabilities')).toBeInTheDocument();
      expect(screen.getByText('conversational')).toBeInTheDocument();
      expect(screen.getByText('8,192')).toBeInTheDocument();
      expect(screen.getByText('$0.02')).toBeInTheDocument();
    });

    it('renders with correct test id', () => {
      render(<ModelCard model={mockModel} testId="custom-model-card" />);

      expect(screen.getByTestId('custom-model-card')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ModelCard model={mockModel} className="custom-class" />);

      const card = screen.getByTestId('model-card');
      expect(card).toHaveClass('custom-class');
    });

    it('renders capabilities indicators', () => {
      render(<ModelCard model={mockModel} />);

      const capabilityDots = screen.getByTitle('Function Calling')?.parentElement?.children;
      expect(capabilityDots).toBeDefined();
      expect(screen.queryByTitle('Vision')).not.toBeInTheDocument(); // vision is false
      expect(screen.getByTitle('Streaming')).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('renders in compact view mode', () => {
      render(<ModelCard model={mockModel} viewMode="compact" />);

      // In compact view, description and full metadata should not be visible
      expect(screen.queryByText('A comprehensive test model for AI applications with advanced capabilities')).not.toBeInTheDocument();
      expect(screen.getByText('Test Model GPT')).toBeInTheDocument();
      expect(screen.getByText('testai')).toBeInTheDocument();
      expect(screen.getByText('$0.02')).toBeInTheDocument();
    });

    it('renders in list view mode', () => {
      render(<ModelCard model={mockModel} viewMode="list" />);

      expect(screen.getByText('Test Model GPT')).toBeInTheDocument();
      expect(screen.getByText('A comprehensive test model for AI applications with advanced capabilities')).toBeInTheDocument();
      expect(screen.getByText('Category: conversational')).toBeInTheDocument();
      expect(screen.getByText(/Context: 8,192/)).toBeInTheDocument();
      expect(screen.getByText(/Updated: 2024-01-15/)).toBeInTheDocument();
    });

    it('renders in grid view mode by default', () => {
      render(<ModelCard model={mockModel} />);

      // Grid view shows full metadata section
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Context Length')).toBeInTheDocument();
      expect(screen.getByText('Capabilities')).toBeInTheDocument();
    });
  });

  describe('Pricing Display', () => {
    it('displays free models correctly', () => {
      render(<ModelCard model={freeModel} />);

      const pricingElement = screen.getByText('Free');
      expect(pricingElement).toBeInTheDocument();
      expect(pricingElement).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('displays paid models correctly', () => {
      render(<ModelCard model={mockModel} />);

      const pricingElement = screen.getByText('$0.02');
      expect(pricingElement).toBeInTheDocument();
      expect(pricingElement).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('formats small costs correctly', () => {
      const smallCostModel = { ...mockModel, cost: 0.0001 };
      render(<ModelCard model={smallCostModel} />);

      expect(screen.getByText('$0.0001')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading skeleton', () => {
      render(<ModelCard model={mockModel} loading={true} />);

      const loadingCard = screen.getByTestId('model-card-loading');
      expect(loadingCard).toBeInTheDocument();
      expect(loadingCard).toHaveClass('animate-pulse');

      // Model details should not be visible during loading
      expect(screen.queryByText('Test Model GPT')).not.toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode classes correctly', () => {
      document.documentElement.classList.add('dark');
      render(<ModelCard model={mockModel} />);

      const card = screen.getByTestId('model-card');
      expect(card).toHaveClass('bg-gray-800', 'border-gray-700');
    });

    it('applies dark mode pricing classes for free models', () => {
      document.documentElement.classList.add('dark');
      render(<ModelCard model={freeModel} />);

      const pricingElement = screen.getByText('Free');
      expect(pricingElement).toHaveClass('dark:bg-green-900', 'dark:text-green-200');
    });
  });

  describe('Interactions', () => {
    it('calls onSelect when card is clicked', () => {
      render(<ModelCard model={mockModel} onSelect={mockOnSelect} />);

      const card = screen.getByTestId('model-card');
      fireEvent.click(card);

      expect(mockOnSelect).toHaveBeenCalledWith(mockModel);
    });

    it('calls onFavorite when favorite button is clicked', () => {
      render(<ModelCard model={mockModel} onFavorite={mockOnFavorite} />);

      const favoriteButton = screen.getByTestId('model-card-favorite');
      fireEvent.click(favoriteButton);

      expect(mockOnFavorite).toHaveBeenCalledWith(mockModel);
      expect(mockOnSelect).not.toHaveBeenCalled(); // Should not trigger card select
    });

    it('does not call handlers when loading', () => {
      render(<ModelCard model={mockModel} loading={true} onSelect={mockOnSelect} onFavorite={mockOnFavorite} />);

      // Loading state should not have interactive elements
      expect(screen.queryByTestId('model-card-favorite')).not.toBeInTheDocument();
      expect(screen.queryByTestId('model-card-select')).not.toBeInTheDocument();
    });

    it('prevents event propagation on favorite button click', () => {
      render(<ModelCard model={mockModel} onSelect={mockOnSelect} onFavorite={mockOnFavorite} />);

      const favoriteButton = screen.getByTestId('model-card-favorite');
      fireEvent.click(favoriteButton);

      // Only favorite should be called, not select
      expect(mockOnFavorite).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Optional Props Handling', () => {
    it('does not render favorite button when onFavorite is not provided', () => {
      render(<ModelCard model={mockModel} />);

      expect(screen.queryByTestId('model-card-favorite')).not.toBeInTheDocument();
    });

    it('handles missing optional model properties gracefully', () => {
      const minimalModel: AIModel = {
        id: 'minimal-1',
        name: 'Minimal Model',
        description: 'Basic model',
        provider: 'testai',
        modelId: 'minimal',
        category: 'conversational',
        cost: 0,
        contextLength: undefined as any,
        streaming: false,
        functionCalling: false,
        vision: false,
        lastUpdated: '',
        availability: 'public',
        license: 'mit'
      };

      render(<ModelCard model={minimalModel} />);

      expect(screen.getByText('Minimal Model')).toBeInTheDocument();
      expect(screen.queryByText('Context Length')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria attributes', () => {
      render(<ModelCard model={mockModel} onSelect={mockOnSelect} />);

      const card = screen.getByTestId('model-card');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('capability dots have proper title attributes', () => {
      render(<ModelCard model={mockModel} />);

      expect(screen.getByTitle('Function Calling')).toBeInTheDocument();
      expect(screen.getByTitle('Streaming')).toBeInTheDocument();
    });

    it('buttons have proper test ids for automation', () => {
      render(<ModelCard model={mockModel} onFavorite={mockOnFavorite} />);

      expect(screen.getByTestId('model-card-favorite')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-select')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long model names and descriptions', () => {
      const longContentModel = {
        ...mockModel,
        name: 'This is a very long model name that should be truncated appropriately in the UI',
        description: 'This is an extremely long description that should be properly handled by the component with line clamping and should not break the layout even when it contains a lot of text that would normally overflow the container boundaries and cause display issues'
      };

      render(<ModelCard model={longContentModel} />);

      expect(screen.getByText(/This is a very long model name/)).toBeInTheDocument();
      expect(screen.getByText(/This is an extremely long description/)).toBeInTheDocument();
    });

    it('handles zero and negative costs correctly', () => {
      const zeroCostModel = { ...mockModel, cost: 0 };
      const negativeCostModel = { ...mockModel, cost: -0.01 };

      const { rerender } = render(<ModelCard model={zeroCostModel} />);
      expect(screen.getByText('Free')).toBeInTheDocument();

      // Re-render with negative cost
      rerender(<ModelCard model={negativeCostModel} />);
      expect(screen.getByText('$-0.01')).toBeInTheDocument();
    });
  });
});