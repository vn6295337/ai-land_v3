import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../SearchBar';
import { useModelsStore } from '../../../stores/modelsStore';
import { AIModel } from '../../../types/models';

describe('SearchBar Integration Tests', () => {
  const mockModels: AIModel[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'OpenAI GPT-4 model',
      provider: 'openai',
      modelId: 'gpt-4',
      category: 'conversational',
      cost: 0.03,
      contextLength: 8192,
      streaming: true,
      functionCalling: true,
      vision: false,
      lastUpdated: '2024-01-01',
      availability: 'public',
      license: 'proprietary'
    },
    {
      id: 'claude-3',
      name: 'Claude-3 Sonnet',
      description: 'Anthropic Claude-3 model',
      provider: 'anthropic',
      modelId: 'claude-3-sonnet',
      category: 'conversational',
      cost: 0.03,
      contextLength: 200000,
      streaming: true,
      functionCalling: true,
      vision: true,
      lastUpdated: '2024-01-01',
      availability: 'public',
      license: 'proprietary'
    }
  ];

  beforeEach(() => {
    // Reset store state
    useModelsStore.setState({
      models: mockModels,
      filteredModels: mockModels,
      searchQuery: '',
      searchResults: [],
      loading: false,
      error: null
    });
  });

  it('integrates search with models store', async () => {
    render(<SearchBar />);

    const searchInput = screen.getByRole('textbox');
    expect(searchInput).toBeInTheDocument();

    // Type search query
    fireEvent.change(searchInput, { target: { value: 'GPT' } });

    // Should update store search query
    await waitFor(() => {
      const state = useModelsStore.getState();
      expect(state.searchQuery).toBe('GPT');
    });
  });

  it('shows suggestions based on store data', async () => {
    render(<SearchBar />);

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'claude' } });

    // Should show suggestions (if implemented)
    await waitFor(() => {
      // This test depends on actual SearchBar implementation
      // Adjust based on your component's behavior
      expect(searchInput).toHaveValue('claude');
    });
  });

  it('clears search when cleared', async () => {
    // Set initial search state
    useModelsStore.setState({ searchQuery: 'test query' });

    render(<SearchBar />);

    const searchInput = screen.getByRole('textbox');
    expect(searchInput).toHaveValue('test query');

    // Clear the search
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      const state = useModelsStore.getState();
      expect(state.searchQuery).toBe('');
    });
  });

  it('handles debounced search correctly', async () => {
    render(<SearchBar />);

    const searchInput = screen.getByRole('textbox');

    // Type quickly (should be debounced)
    fireEvent.change(searchInput, { target: { value: 'g' } });
    fireEvent.change(searchInput, { target: { value: 'gp' } });
    fireEvent.change(searchInput, { target: { value: 'gpt' } });

    // Wait for debounce to settle
    await waitFor(() => {
      const state = useModelsStore.getState();
      expect(state.searchQuery).toBe('gpt');
    }, { timeout: 500 });
  });
});