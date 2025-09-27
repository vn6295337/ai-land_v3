import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelGrid } from '../ModelGrid';
import { useModelsStore } from '../../../stores/modelsStore';
import { useUIStore } from '../../../stores/uiStore';
import { AIModel } from '../../../types/models';

// Integration test - tests component WITH real stores
describe('ModelGrid Integration Tests', () => {
  const mockModels: AIModel[] = [
    {
      id: 'test-1',
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
    }
  ];

  beforeEach(() => {
    // Reset stores to clean state
    useModelsStore.setState({
      models: [],
      filteredModels: [],
      loading: false,
      error: null,
      currentPage: 1,
      itemsPerPage: 12,
      totalPages: 1
    });

    useUIStore.setState({
      viewMode: 'grid',
      theme: 'light',
      sidebarOpen: false
    });
  });

  it('renders empty state when no models', () => {
    render(<ModelGrid />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Models Found')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    useModelsStore.setState({ loading: true });
    render(<ModelGrid />);
    expect(screen.getByTestId('model-grid-loading')).toBeInTheDocument();
  });

  it('integrates with stores correctly', () => {
    // Set up store state
    useModelsStore.setState({
      models: mockModels,
      filteredModels: mockModels,
      loading: false
    });

    render(<ModelGrid />);

    // Component should render the grid container
    expect(screen.getByTestId('model-grid')).toBeInTheDocument();
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('respects viewMode from UI store', () => {
    useModelsStore.setState({
      models: mockModels,
      filteredModels: mockModels
    });

    useUIStore.setState({ viewMode: 'list' });

    render(<ModelGrid />);

    const grid = screen.getByTestId('model-grid');
    expect(grid).toHaveClass('flex', 'flex-col');
  });

  it('shows correct aria-label based on store state', () => {
    useModelsStore.setState({
      models: mockModels,
      filteredModels: mockModels
    });

    render(<ModelGrid />);

    const grid = screen.getByTestId('model-grid');
    expect(grid).toHaveAttribute('aria-label', 'Models grid displaying 1 model in grid view');
  });
});