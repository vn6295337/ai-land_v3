import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';
import { AIModel } from '../../../types/models';

// Mock stores
vi.mock('../../../stores/modelsStore', () => ({
  useModelsStore: vi.fn(() => ({
    models: [],
    searchQuery: '',
    loading: false,
    setSearchQuery: vi.fn(),
    performSearch: vi.fn()
  })),
  modelsSelectors: {
    getSearchInfo: vi.fn(() => ({
      query: '',
      hasQuery: false,
      resultsCount: 0,
      filteredCount: 0
    }))
  }
}));

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({}))
}));

// Mock CSS modules
vi.mock('../SearchBar.module.css', () => ({
  default: {},
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Search: ({ className, ...props }: any) => <div className={className} data-testid="search-icon" {...props}>Search</div>,
  X: ({ className, ...props }: any) => <div className={className} data-testid="x-icon" {...props}>X</div>
}));

// Mock model data
const mockModels: AIModel[] = [
  {
    id: 'model-1',
    name: 'GPT-4 Turbo',
    description: 'Advanced language model',
    provider: 'openai',
    modelId: 'gpt-4-turbo',
    category: 'conversational',
    cost: 0.02,
    contextLength: 128000,
    streaming: true,
    functionCalling: true,
    vision: false,
    lastUpdated: '2024-01-01',
    availability: 'public',
    license: 'proprietary'
  },
  {
    id: 'model-2',
    name: 'Claude 3 Opus',
    description: 'Highly capable AI assistant',
    provider: 'anthropic',
    modelId: 'claude-3-opus',
    category: 'conversational',
    cost: 0.015,
    contextLength: 200000,
    streaming: true,
    functionCalling: false,
    vision: true,
    lastUpdated: '2024-01-02',
    availability: 'public',
    license: 'proprietary'
  }
];

describe('SearchBar Component', () => {
  const mockOnSuggestionSelect = vi.fn();
  const mockSetSearchQuery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset store mocks
    const { useModelsStore } = require('../../../stores/modelsStore');
    useModelsStore.mockReturnValue({
      models: mockModels,
      searchQuery: '',
      loading: false,
      setSearchQuery: mockSetSearchQuery,
      performSearch: vi.fn()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders search input with default placeholder', () => {
      render(<SearchBar />);

      const input = screen.getByTestId('search-bar-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search models, providers, or categories...');
      expect(input).toHaveAttribute('role', 'combobox');
      expect(input).toHaveAttribute('aria-label', 'Search models');
    });

    it('renders with custom placeholder', () => {
      render(<SearchBar models={mockModels} placeholder="Custom placeholder" />);

      const input = screen.getByTestId('search-bar-input');
      expect(input).toHaveAttribute('placeholder', 'Custom placeholder');
    });

    it('renders search icon by default', () => {
      render(<SearchBar models={mockModels} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('applies custom className and testId', () => {
      render(<SearchBar models={mockModels} className="custom-class" testId="custom-search" />);

      const container = screen.getByTestId('custom-search');
      expect(container).toHaveClass('custom-class');
      expect(screen.getByTestId('custom-search-input')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('updates query when user types', async () => {
      render(<SearchBar models={mockModels} onChange={mockOnChange} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'GPT');

      expect(input).toHaveValue('GPT');
      expect(mockOnChange).toHaveBeenCalledWith('GPT');
    });

    it('performs search after debounce delay', async () => {
      render(<SearchBar models={mockModels} onSearch={mockOnSearch} debounceMs={100} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'GPT');

      // Should not call immediately
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('GPT', [mockModels[0]]);
    });

    it('syncs external value with internal state', () => {
      const { rerender } = render(<SearchBar models={mockModels} value="initial" />);

      let input = screen.getByTestId('search-bar-input');
      expect(input).toHaveValue('initial');

      rerender(<SearchBar models={mockModels} value="updated" />);
      input = screen.getByTestId('search-bar-input');
      expect(input).toHaveValue('updated');
    });

    it('filters models correctly', async () => {
      render(<SearchBar models={mockModels} onSearch={mockOnSearch} debounceMs={0} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'Claude');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('Claude', [mockModels[1]]);
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when loading', () => {
      render(<SearchBar models={mockModels} loading={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('search-icon')).not.toBeInTheDocument();
    });

    it('shows search icon when not loading', () => {
      render(<SearchBar models={mockModels} loading={false} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Suggestions Dropdown', () => {
    it('shows suggestions when typing and showSuggestions is true', async () => {
      render(<SearchBar models={mockModels} showSuggestions={true} debounceMs={0} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'o'); // Should match "openai" and "conversational"

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await userEvent.click(input); // Focus to show dropdown

      await waitFor(() => {
        expect(screen.queryByTestId('search-bar-suggestions')).toBeInTheDocument();
      });
    });

    it('does not show suggestions when showSuggestions is false', async () => {
      render(<SearchBar models={mockModels} showSuggestions={false} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'GPT');
      await userEvent.click(input);

      expect(screen.queryByTestId('search-bar-suggestions')).not.toBeInTheDocument();
    });

    it('calls onSuggestionSelect when suggestion is clicked', async () => {
      render(
        <SearchBar
          models={mockModels}
          onSuggestionSelect={mockOnSuggestionSelect}
          showSuggestions={true}
          debounceMs={0}
        />
      );

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'openai');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await userEvent.click(input);

      await waitFor(() => {
        expect(screen.getByTestId('search-bar-suggestions')).toBeInTheDocument();
      });

      const suggestion = screen.getByTestId('search-bar-suggestion-0');
      await userEvent.click(suggestion);

      expect(mockOnSuggestionSelect).toHaveBeenCalled();
    });

    it('generates provider suggestions correctly', async () => {
      render(<SearchBar models={mockModels} showSuggestions={true} debounceMs={0} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'anthropic');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await userEvent.click(input);

      await waitFor(() => {
        expect(screen.getByText('anthropic')).toBeInTheDocument();
        expect(screen.getByText('provider')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates suggestions with arrow keys', async () => {
      render(<SearchBar models={mockModels} showSuggestions={true} debounceMs={0} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'o');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await userEvent.click(input);

      await waitFor(() => {
        expect(screen.queryByTestId('search-bar-suggestions')).toBeInTheDocument();
      });

      // Arrow down should select first suggestion
      await userEvent.keyboard('{ArrowDown}');
      const firstSuggestion = screen.getByTestId('search-bar-suggestion-0');
      expect(firstSuggestion).toHaveAttribute('aria-selected', 'true');

      // Arrow down again should select second suggestion if it exists
      if (screen.queryByTestId('search-bar-suggestion-1')) {
        await userEvent.keyboard('{ArrowDown}');
        const secondSuggestion = screen.getByTestId('search-bar-suggestion-1');
        expect(secondSuggestion).toHaveAttribute('aria-selected', 'true');
      }
    });

    it('closes suggestions with Escape key', async () => {
      render(<SearchBar models={mockModels} showSuggestions={true} debounceMs={0} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'openai');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await userEvent.click(input);

      await waitFor(() => {
        expect(screen.getByTestId('search-bar-suggestions')).toBeInTheDocument();
      });

      await userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByTestId('search-bar-suggestions')).not.toBeInTheDocument();
      });
    });

    it('triggers search with Enter when no suggestion selected', async () => {
      render(<SearchBar models={mockModels} onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'GPT');
      await userEvent.keyboard('{Enter}');

      expect(mockOnSearch).toHaveBeenCalledWith('GPT', expect.any(Array));
    });
  });

  describe('Clear Functionality', () => {
    it('shows clear button when query is not empty and clearable is true', async () => {
      render(<SearchBar models={mockModels} clearable={true} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'test');

      expect(screen.getByTestId('search-bar-clear')).toBeInTheDocument();
    });

    it('does not show clear button when query is empty', () => {
      render(<SearchBar models={mockModels} clearable={true} />);

      expect(screen.queryByTestId('search-bar-clear')).not.toBeInTheDocument();
    });

    it('does not show clear button when clearable is false', async () => {
      render(<SearchBar models={mockModels} clearable={false} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'test');

      expect(screen.queryByTestId('search-bar-clear')).not.toBeInTheDocument();
    });

    it('clears query when clear button is clicked', async () => {
      render(<SearchBar models={mockModels} clearable={true} onChange={mockOnChange} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'test');

      const clearButton = screen.getByTestId('search-bar-clear');
      await userEvent.click(clearButton);

      expect(input).toHaveValue('');
      expect(mockOnChange).toHaveBeenLastCalledWith('');
    });
  });

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      render(<SearchBar models={mockModels} disabled={true} />);

      const input = screen.getByTestId('search-bar-input');
      expect(input).toBeDisabled();
    });

    it('does not show clear button when disabled', async () => {
      render(<SearchBar models={mockModels} disabled={true} clearable={true} value="test" />);

      expect(screen.queryByTestId('search-bar-clear')).not.toBeInTheDocument();
    });
  });

  describe('Auto Focus', () => {
    it('focuses input when autoFocus is true', () => {
      render(<SearchBar models={mockModels} autoFocus={true} />);

      const input = screen.getByTestId('search-bar-input');
      expect(input).toHaveFocus();
    });

    it('does not focus input when autoFocus is false', () => {
      render(<SearchBar models={mockModels} autoFocus={false} />);

      const input = screen.getByTestId('search-bar-input');
      expect(input).not.toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<SearchBar models={mockModels} />);

      const input = screen.getByTestId('search-bar-input');
      expect(input).toHaveAttribute('role', 'combobox');
      expect(input).toHaveAttribute('aria-label', 'Search models');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('provides screen reader feedback', async () => {
      render(<SearchBar models={mockModels} debounceMs={0} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'GPT');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      // Screen reader content should be in the DOM
      expect(screen.getByText(/Found \d+ result/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty models array', () => {
      render(<SearchBar models={[]} />);

      const input = screen.getByTestId('search-bar-input');
      expect(input).toBeInTheDocument();
    });

    it('handles clicking outside to close suggestions', async () => {
      render(
        <div>
          <SearchBar models={mockModels} showSuggestions={true} debounceMs={0} />
          <button>Outside button</button>
        </div>
      );

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'openai');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await userEvent.click(input);

      await waitFor(() => {
        expect(screen.getByTestId('search-bar-suggestions')).toBeInTheDocument();
      });

      const outsideButton = screen.getByText('Outside button');
      fireEvent.mouseDown(outsideButton);

      await waitFor(() => {
        expect(screen.queryByTestId('search-bar-suggestions')).not.toBeInTheDocument();
      });
    });

    it('limits suggestions to maxSuggestions', async () => {
      const manyModels = Array.from({ length: 10 }, (_, i) => ({
        ...mockModels[0],
        id: `model-${i}`,
        name: `Model ${i}`,
        provider: `provider-${i}`
      }));

      render(<SearchBar models={manyModels} maxSuggestions={3} showSuggestions={true} debounceMs={0} />);

      const input = screen.getByTestId('search-bar-input');
      await userEvent.type(input, 'Model');

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await userEvent.click(input);

      await waitFor(() => {
        expect(screen.getByTestId('search-bar-suggestions')).toBeInTheDocument();
      });

      // Should only show maximum 3 suggestions
      expect(screen.queryByTestId('search-bar-suggestion-0')).toBeInTheDocument();
      expect(screen.queryByTestId('search-bar-suggestion-1')).toBeInTheDocument();
      expect(screen.queryByTestId('search-bar-suggestion-2')).toBeInTheDocument();
      expect(screen.queryByTestId('search-bar-suggestion-3')).not.toBeInTheDocument();
    });
  });
});