import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';
import {
  setupDOMMocks,
  createMockModelsStore,
  createMockUIStore,
  createMockSelectors,
  createMockUISelectors,
  mockModels
} from '../../../test-utils/storeTestUtils';

// Mock stores
const mockModelsStore = createMockModelsStore();
const mockUIStore = createMockUIStore();
const mockSelectors = createMockSelectors();
const mockUISelectors = createMockUISelectors();

vi.mock('../../../stores/modelsStore', () => ({
  useModelsStore: vi.fn(() => mockModelsStore),
  modelsSelectors: mockSelectors
}));

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn(() => mockUIStore),
  uiSelectors: mockUISelectors
}));

// Mock child components
vi.mock('../../SearchBar/SearchBar', () => ({
  SearchBar: ({ testId }: any) => <div data-testid={testId}>SearchBar</div>
}));

vi.mock('../../ModelGrid/ModelGrid', () => ({
  ModelGrid: ({ testId, emptyStateMessage }: any) => (
    <div data-testid={testId}>
      ModelGrid
      <div data-testid="empty-message">{emptyStateMessage}</div>
    </div>
  )
}));

vi.mock('../../FilterPanel/FilterPanel', () => ({
  FilterPanel: ({ testId }: any) => <div data-testid={testId}>FilterPanel</div>
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    setupDOMMocks();
    vi.clearAllMocks();

    // Reset mock implementations
    mockModelsStore.fetchModels = vi.fn().mockResolvedValue(undefined);
    mockSelectors.getLoadingInfo.mockReturnValue({
      loading: false,
      error: null,
      hasData: true,
      lastUpdated: new Date(),
      cacheValid: true
    });
    mockSelectors.getSearchInfo.mockReturnValue({
      query: '',
      hasQuery: false,
      resultsCount: 0,
      filteredCount: 0
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Rendering', () => {
    it('renders dashboard with default title', () => {
      render(<Dashboard />);

      expect(screen.getByText('AI Models Discovery')).toBeInTheDocument();
      expect(screen.getByText('Discover and compare AI models from multiple providers')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('renders dashboard with custom title', () => {
      render(<Dashboard title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('applies custom className and testId', () => {
      render(<Dashboard className="custom-class" testId="custom-dashboard" />);

      const dashboard = screen.getByTestId('custom-dashboard');
      expect(dashboard).toHaveClass('custom-class');
    });
  });

  describe('Component Integration', () => {
    it('renders SearchBar when showSearch is true', () => {
      render(<Dashboard showSearch={true} />);

      expect(screen.getByTestId('dashboard-search')).toBeInTheDocument();
    });

    it('does not render SearchBar when showSearch is false', () => {
      render(<Dashboard showSearch={false} />);

      expect(screen.queryByTestId('dashboard-search')).not.toBeInTheDocument();
    });

    it('renders FilterPanel and ModelGrid', () => {
      render(<Dashboard />);

      expect(screen.getByTestId('dashboard-filters')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    });

    it('renders view mode toggle button', () => {
      render(<Dashboard />);

      const toggleButton = screen.getByTestId('dashboard-view-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('View: grid');
    });

    it('renders filters toggle button when showFilters is true', () => {
      render(<Dashboard showFilters={true} />);

      expect(screen.getByTestId('dashboard-filters-toggle')).toBeInTheDocument();
    });
  });

  describe('Auto Fetch Behavior', () => {
    it('fetches models on mount when autoFetch is true and no data exists', () => {
      mockSelectors.getLoadingInfo.mockReturnValue({
        loading: false,
        error: null,
        hasData: false,
        lastUpdated: null,
        cacheValid: false
      });

      render(<Dashboard autoFetch={true} />);

      expect(mockModelsStore.fetchModels).toHaveBeenCalledTimes(1);
    });

    it('does not fetch models when autoFetch is false', () => {
      mockSelectors.getLoadingInfo.mockReturnValue({
        loading: false,
        error: null,
        hasData: false,
        lastUpdated: null,
        cacheValid: false
      });

      render(<Dashboard autoFetch={false} />);

      expect(mockModelsStore.fetchModels).not.toHaveBeenCalled();
    });

    it('does not fetch models when data already exists', () => {
      mockSelectors.getLoadingInfo.mockReturnValue({
        loading: false,
        error: null,
        hasData: true,
        lastUpdated: new Date(),
        cacheValid: true
      });

      render(<Dashboard autoFetch={true} />);

      expect(mockModelsStore.fetchModels).not.toHaveBeenCalled();
    });

    it('does not fetch models when already loading', () => {
      mockSelectors.getLoadingInfo.mockReturnValue({
        loading: false,
        error: null,
        hasData: false,
        lastUpdated: null,
        cacheValid: false
      });
      mockModelsStore.loading = true;

      render(<Dashboard autoFetch={true} />);

      expect(mockModelsStore.fetchModels).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('toggles view mode when view toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      const toggleButton = screen.getByTestId('dashboard-view-toggle');
      await user.click(toggleButton);

      expect(mockUIStore.toggleViewMode).toHaveBeenCalledTimes(1);
    });

    it('toggles filters when filters toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard showFilters={true} />);

      const filtersButton = screen.getByTestId('dashboard-filters-toggle');
      await user.click(filtersButton);

      expect(mockUIStore.toggleFilters).toHaveBeenCalledTimes(1);
    });

    it('shows active filters button state when filters are shown', () => {
      mockUIStore.showFilters = true;

      render(<Dashboard showFilters={true} />);

      const filtersButton = screen.getByTestId('dashboard-filters-toggle');
      expect(filtersButton).toHaveClass('bg-blue-600');
    });
  });

  describe('Stats Display', () => {
    it('displays model count without search', () => {
      mockModelsStore.filteredModels = mockModels;

      render(<Dashboard />);

      const stats = screen.getByTestId('dashboard-stats');
      expect(stats).toHaveTextContent('3 models available');
    });

    it('displays filtered model count with search', () => {
      mockModelsStore.filteredModels = [mockModels[0]];
      mockModelsStore.models = mockModels;
      mockSelectors.getSearchInfo.mockReturnValue({
        query: 'GPT',
        hasQuery: true,
        resultsCount: 1,
        filteredCount: 1
      });

      render(<Dashboard />);

      const stats = screen.getByTestId('dashboard-stats');
      expect(stats).toHaveTextContent('Showing 1 of 3 models');
    });

    it('shows loading indicator when loading', () => {
      mockModelsStore.loading = true;

      render(<Dashboard />);

      expect(screen.getByTestId('dashboard-loading-indicator')).toBeInTheDocument();
      expect(screen.getByText('Loading models...')).toBeInTheDocument();
    });
  });

  describe('Search Integration', () => {
    it('displays search results count when query exists', () => {
      mockSelectors.getSearchInfo.mockReturnValue({
        query: 'GPT-4',
        hasQuery: true,
        resultsCount: 1,
        filteredCount: 1
      });

      render(<Dashboard showSearch={true} />);

      expect(screen.getByText('Found 1 model for "GPT-4"')).toBeInTheDocument();
    });

    it('displays plural results count correctly', () => {
      mockSelectors.getSearchInfo.mockReturnValue({
        query: 'model',
        hasQuery: true,
        resultsCount: 2,
        filteredCount: 2
      });

      render(<Dashboard showSearch={true} />);

      expect(screen.getByText('Found 2 models for "model"')).toBeInTheDocument();
    });

    it('passes correct empty state message for search results', () => {
      mockSelectors.getSearchInfo.mockReturnValue({
        query: 'nonexistent',
        hasQuery: true,
        resultsCount: 0,
        filteredCount: 0
      });

      render(<Dashboard />);

      const emptyMessage = screen.getByTestId('empty-message');
      expect(emptyMessage).toHaveTextContent('No models found for "nonexistent". Try adjusting your search terms.');
    });

    it('passes default empty state message when no search', () => {
      render(<Dashboard />);

      const emptyMessage = screen.getByTestId('empty-message');
      expect(emptyMessage).toHaveTextContent('No models available. This might be a loading issue - try refreshing the page.');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error exists', () => {
      mockModelsStore.error = 'Network error occurred';

      render(<Dashboard />);

      const errorSection = screen.getByTestId('dashboard-error');
      expect(errorSection).toBeInTheDocument();
      expect(screen.getByText('Error loading models')).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('provides retry functionality on error', async () => {
      const user = userEvent.setup();
      mockModelsStore.error = 'Network error occurred';

      render(<Dashboard />);

      const retryButton = screen.getByText('Try again');
      await user.click(retryButton);

      expect(mockModelsStore.fetchModels).toHaveBeenCalledTimes(1);
    });

    it('does not display error section when no error', () => {
      mockModelsStore.error = null;

      render(<Dashboard />);

      expect(screen.queryByTestId('dashboard-error')).not.toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct theme classes', () => {
      render(<Dashboard />);

      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('min-h-screen', 'bg-gray-50', 'dark:bg-gray-900');
    });

    it('renders with sticky filter panel layout', () => {
      render(<Dashboard />);

      // Check grid layout structure
      const gridContainer = screen.getByTestId('dashboard').querySelector('.grid.grid-cols-1.lg\\:grid-cols-4');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<Dashboard showFilters={true} />);

      const viewToggle = screen.getByTestId('dashboard-view-toggle');
      const filtersToggle = screen.getByTestId('dashboard-filters-toggle');

      expect(viewToggle).toHaveAttribute('type', 'button');
      expect(filtersToggle).toHaveAttribute('type', 'button');
    });

    it('provides semantic HTML structure', () => {
      render(<Dashboard />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText('Discover and compare AI models from multiple providers')).toBeInTheDocument();
    });
  });
});