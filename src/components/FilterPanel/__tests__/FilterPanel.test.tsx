import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from '../FilterPanel';
import {
  setupDOMMocks,
  createMockModelsStore,
  createMockUIStore,
  createMockSelectors,
  mockModels
} from '../../../test-utils/storeTestUtils';

// Mock stores
const mockModelsStore = createMockModelsStore();
const mockUIStore = createMockUIStore();
const mockSelectors = createMockSelectors();

vi.mock('../../../stores/modelsStore', () => ({
  useModelsStore: vi.fn(() => mockModelsStore),
  modelsSelectors: mockSelectors
}));

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn(() => mockUIStore)
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>
}));

describe('FilterPanel Component', () => {
  beforeEach(() => {
    setupDOMMocks();
    vi.clearAllMocks();

    // Setup default mock data
    mockModelsStore.models = mockModels;
    mockModelsStore.filters = {
      providers: [],
      categories: [],
      minCost: undefined,
      maxCost: undefined,
      capabilities: [],
      searchTerm: '',
      freeOnly: false
    };
    mockUIStore.showFilters = true;

    mockSelectors.getFilterSummary.mockReturnValue({
      activeCount: 0,
      filters: [],
      hasActiveFilters: false
    });
  });

  describe('Visibility Control', () => {
    it('renders when showFilters is true', () => {
      mockUIStore.showFilters = true;

      render(<FilterPanel />);

      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('does not render when showFilters is false', () => {
      mockUIStore.showFilters = false;

      render(<FilterPanel />);

      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
    });
  });

  describe('Filter Header', () => {
    it('displays filter title', () => {
      render(<FilterPanel />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('shows clear all button when filters are active', () => {
      mockSelectors.getFilterSummary.mockReturnValue({
        activeCount: 2,
        filters: [['providers', ['openai']], ['freeOnly', true]],
        hasActiveFilters: true
      });

      render(<FilterPanel />);

      expect(screen.getByTestId('filter-panel-clear-all')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('does not show clear all button when no filters are active', () => {
      render(<FilterPanel />);

      expect(screen.queryByTestId('filter-panel-clear-all')).not.toBeInTheDocument();
    });

    it('shows active filter count', () => {
      mockSelectors.getFilterSummary.mockReturnValue({
        activeCount: 3,
        filters: [],
        hasActiveFilters: true
      });

      render(<FilterPanel />);

      expect(screen.getByText('3 filters active')).toBeInTheDocument();
    });

    it('shows singular filter text for single filter', () => {
      mockSelectors.getFilterSummary.mockReturnValue({
        activeCount: 1,
        filters: [],
        hasActiveFilters: true
      });

      render(<FilterPanel />);

      expect(screen.getByText('1 filter active')).toBeInTheDocument();
    });
  });

  describe('Free Only Toggle', () => {
    it('renders free only checkbox', () => {
      render(<FilterPanel />);

      const checkbox = screen.getByTestId('filter-panel-free-only');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('reflects current free only state', () => {
      mockModelsStore.filters = { ...mockModelsStore.filters, freeOnly: true };

      render(<FilterPanel />);

      const checkbox = screen.getByTestId('filter-panel-free-only');
      expect(checkbox).toBeChecked();
    });

    it('calls setFilters when free only is toggled', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const checkbox = screen.getByTestId('filter-panel-free-only');
      await user.click(checkbox);

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ freeOnly: true });
    });
  });

  describe('Provider Filtering', () => {
    it('displays provider options with counts', () => {
      render(<FilterPanel />);

      expect(screen.getByText('Providers')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-provider-openai')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-provider-anthropic')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-provider-mistral')).toBeInTheDocument();

      // Check model counts
      expect(screen.getByText('(1)', { selector: 'span' })).toBeInTheDocument(); // Each provider has 1 model
    });

    it('reflects selected providers', () => {
      mockModelsStore.filters = {
        ...mockModelsStore.filters,
        providers: ['openai']
      };

      render(<FilterPanel />);

      const checkbox = screen.getByTestId('filter-panel-provider-openai').querySelector('input');
      expect(checkbox).toBeChecked();
    });

    it('updates providers when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const providerLabel = screen.getByTestId('filter-panel-provider-openai');
      const checkbox = providerLabel.querySelector('input');

      await user.click(checkbox!);

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ providers: ['openai'] });
    });

    it('removes provider when unchecking', async () => {
      const user = userEvent.setup();
      mockModelsStore.filters = {
        ...mockModelsStore.filters,
        providers: ['openai', 'anthropic']
      };

      render(<FilterPanel />);

      const providerLabel = screen.getByTestId('filter-panel-provider-openai');
      const checkbox = providerLabel.querySelector('input');

      await user.click(checkbox!);

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ providers: ['anthropic'] });
    });
  });

  describe('Category Filtering', () => {
    it('displays category options with counts', () => {
      render(<FilterPanel />);

      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-category-conversational')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-category-code_generation')).toBeInTheDocument();
    });

    it('updates categories when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const categoryLabel = screen.getByTestId('filter-panel-category-conversational');
      const checkbox = categoryLabel.querySelector('input');

      await user.click(checkbox!);

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ categories: ['conversational'] });
    });
  });

  describe('Capability Filtering', () => {
    it('displays capability options', () => {
      render(<FilterPanel />);

      expect(screen.getByText('Capabilities')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-capability-streaming')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-capability-function-calling')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-capability-vision')).toBeInTheDocument();
    });

    it('updates capabilities when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const capabilityLabel = screen.getByTestId('filter-panel-capability-streaming');
      const checkbox = capabilityLabel.querySelector('input');

      await user.click(checkbox!);

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ capabilities: ['streaming'] });
    });
  });

  describe('Cost Range Filtering', () => {
    it('displays cost range options', () => {
      render(<FilterPanel />);

      expect(screen.getByText('Cost Range')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-cost-free')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-cost-low--0-001---0-01-')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-cost-medium--0-01---0-05-')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-cost-high--0-05--')).toBeInTheDocument();
    });

    it('updates cost range when radio button is selected', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const freeOption = screen.getByTestId('filter-panel-cost-free').querySelector('input');
      await user.click(freeOption!);

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ minCost: 0, maxCost: 0 });
    });

    it('reflects selected cost range', () => {
      mockModelsStore.filters = {
        ...mockModelsStore.filters,
        minCost: 0,
        maxCost: 0
      };

      render(<FilterPanel />);

      const freeOption = screen.getByTestId('filter-panel-cost-free').querySelector('input');
      expect(freeOption).toBeChecked();
    });
  });

  describe('Custom Cost Range', () => {
    it('displays custom cost inputs', () => {
      render(<FilterPanel />);

      expect(screen.getByText('Custom Cost Range')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-min-cost')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel-max-cost')).toBeInTheDocument();
    });

    it('reflects current min cost value', () => {
      mockModelsStore.filters = {
        ...mockModelsStore.filters,
        minCost: 0.01
      };

      render(<FilterPanel />);

      const minCostInput = screen.getByTestId('filter-panel-min-cost');
      expect(minCostInput).toHaveValue(0.01);
    });

    it('updates min cost when input changes', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const minCostInput = screen.getByTestId('filter-panel-min-cost');
      await user.clear(minCostInput);
      await user.type(minCostInput, '0.005');

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ minCost: 0.005 });
    });

    it('updates max cost when input changes', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const maxCostInput = screen.getByTestId('filter-panel-max-cost');
      await user.clear(maxCostInput);
      await user.type(maxCostInput, '0.1');

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ maxCost: 0.1 });
    });

    it('handles empty cost input values', async () => {
      const user = userEvent.setup();
      mockModelsStore.filters = {
        ...mockModelsStore.filters,
        minCost: 0.01
      };

      render(<FilterPanel />);

      const minCostInput = screen.getByTestId('filter-panel-min-cost');
      await user.clear(minCostInput);

      expect(mockModelsStore.setFilters).toHaveBeenCalledWith({ minCost: undefined });
    });
  });

  describe('Clear All Functionality', () => {
    it('clears all filters when clear all button is clicked', async () => {
      const user = userEvent.setup();
      mockSelectors.getFilterSummary.mockReturnValue({
        activeCount: 2,
        filters: [],
        hasActiveFilters: true
      });

      render(<FilterPanel />);

      const clearButton = screen.getByTestId('filter-panel-clear-all');
      await user.click(clearButton);

      expect(mockModelsStore.clearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form controls', () => {
      render(<FilterPanel />);

      expect(screen.getByText('Min Cost ($)')).toBeInTheDocument();
      expect(screen.getByText('Max Cost ($)')).toBeInTheDocument();
    });

    it('has proper checkbox labels', () => {
      render(<FilterPanel />);

      const freeOnlyLabel = screen.getByText('Free models only');
      expect(freeOnlyLabel).toBeInTheDocument();
    });

    it('provides proper input types and attributes', () => {
      render(<FilterPanel />);

      const minCostInput = screen.getByTestId('filter-panel-min-cost');
      const maxCostInput = screen.getByTestId('filter-panel-max-cost');

      expect(minCostInput).toHaveAttribute('type', 'number');
      expect(minCostInput).toHaveAttribute('step', '0.001');
      expect(maxCostInput).toHaveAttribute('type', 'number');
      expect(maxCostInput).toHaveAttribute('step', '0.001');
    });
  });

  describe('Visual Feedback', () => {
    it('displays model counts for each filter option', () => {
      render(<FilterPanel />);

      // Each provider should show count
      const providerCounts = screen.getAllByText('(1)', { selector: 'span' });
      expect(providerCounts.length).toBeGreaterThan(0);
    });

    it('uses proper styling classes', () => {
      render(<FilterPanel />);

      const panel = screen.getByTestId('filter-panel');
      expect(panel).toHaveClass('bg-white', 'dark:bg-gray-800', 'border', 'rounded-lg');
    });
  });

  describe('Error Handling', () => {
    it('handles empty models array gracefully', () => {
      mockModelsStore.models = [];

      render(<FilterPanel />);

      // Should still render the panel structure
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('handles missing filter properties gracefully', () => {
      mockModelsStore.filters = {} as any;

      expect(() => render(<FilterPanel />)).not.toThrow();
    });
  });
});