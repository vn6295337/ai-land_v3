import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { AIModel } from '../../types/models';
import { useModelsStore, modelsSelectors } from '../../stores/modelsStore';
import { useUIStore } from '../../stores/uiStore';
import './SearchBar.module.css';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'model' | 'provider' | 'category' | 'recent';
  count?: number;
}

export interface SearchBarProps extends ComponentProps {
  placeholder?: string;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  clearable?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(({
  placeholder = 'Search models, providers, or categories...',
  onSuggestionSelect,
  showSuggestions = true,
  maxSuggestions = 8,
  debounceMs = 300,
  disabled = false,
  autoFocus = false,
  clearable = true,
  className = '',
  testId = 'search-bar'
}) => {
  // Store connections
  const {
    models,
    searchQuery,
    loading,
    setSearchQuery,
    performSearch
  } = useModelsStore();

  const searchInfo = modelsSelectors.getSearchInfo(useModelsStore.getState());

  // Local UI state
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        generateSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, models, debounceMs]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setActiveSuggestion(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

  const generateSuggestions = useCallback((searchQuery: string) => {
    if (!showSuggestions) return;

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const suggestionSet = new Set<string>();
    const newSuggestions: SearchSuggestion[] = [];

    // Model name suggestions
    models.forEach(model => {
      if (model.name.toLowerCase().includes(normalizedQuery)) {
        const key = model.name.toLowerCase();
        if (!suggestionSet.has(key)) {
          suggestionSet.add(key);
          newSuggestions.push({
            id: `model-${model.id}`,
            text: model.name,
            type: 'model',
            count: 1
          });
        }
      }
    });

    // Provider suggestions
    const providers = [...new Set(models.map(m => m.provider))]
      .filter(provider => provider.toLowerCase().includes(normalizedQuery));

    providers.forEach(provider => {
      const key = provider.toLowerCase();
      if (!suggestionSet.has(key)) {
        suggestionSet.add(key);
        const count = models.filter(m => m.provider === provider).length;
        newSuggestions.push({
          id: `provider-${provider}`,
          text: provider,
          type: 'provider',
          count
        });
      }
    });

    // Category suggestions
    const categories = [...new Set(models.map(m => m.category))]
      .filter(category => category.toLowerCase().includes(normalizedQuery));

    categories.forEach(category => {
      const key = category.toLowerCase();
      if (!suggestionSet.has(key)) {
        suggestionSet.add(key);
        const count = models.filter(m => m.category === category).length;
        newSuggestions.push({
          id: `category-${category}`,
          text: category,
          type: 'category',
          count
        });
      }
    });

    setSuggestions(newSuggestions.slice(0, maxSuggestions));
  }, [models, showSuggestions, maxSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    handleSearch(newValue);
    setShowDropdown(showSuggestions && newValue.length > 0);
    setActiveSuggestion(-1);
  };

  const handleInputFocus = () => {
    if (showSuggestions && searchQuery.length > 0 && suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow suggestion clicks
    setTimeout(() => {
      setShowDropdown(false);
      setActiveSuggestion(-1);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0) {
          handleSuggestionClick(suggestions[activeSuggestion]);
        } else {
          setShowDropdown(false);
          inputRef.current?.blur();
        }
        break;

      case 'Escape':
        setShowDropdown(false);
        setActiveSuggestion(-1);
        inputRef.current?.blur();
        break;

      case 'Tab':
        setShowDropdown(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    handleSearch(suggestion.text);
    setShowDropdown(false);
    setActiveSuggestion(-1);
    onSuggestionSelect?.(suggestion);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    handleSearch('');
    setShowDropdown(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'model':
        return '🤖';
      case 'provider':
        return '🏢';
      case 'category':
        return '📂';
      case 'recent':
        return '⏰';
      default:
        return '🔍';
    }
  };

  return (
    <div className={`relative w-full ${className}`} data-testid={testId}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <div
              className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"
              data-testid="loading-spinner"
            />
          ) : (
            <Search className="w-4 h-4 text-gray-400" data-testid="search-icon" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2 text-sm
            border border-gray-300 rounded-md
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          `}
          data-testid={`${testId}-input`}
          aria-label="Search models"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
        />

        {clearable && searchQuery.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 transition-colors"
            aria-label="Clear search"
            data-testid={`${testId}-clear`}
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={`
            absolute z-50 w-full mt-1
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-md shadow-lg
            max-h-64 overflow-y-auto
          `}
          data-testid={`${testId}-suggestions`}
          role="listbox"
          aria-label="Search suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`
                w-full px-3 py-2 text-left text-sm
                flex items-center justify-between
                hover:bg-gray-50 dark:hover:bg-gray-700
                focus:bg-gray-50 dark:focus:bg-gray-700
                focus:outline-none
                transition-colors duration-150
                ${activeSuggestion === index
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'text-gray-900 dark:text-gray-100'
                }
              `}
              data-testid={`${testId}-suggestion-${index}`}
              role="option"
              aria-selected={activeSuggestion === index}
            >
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-hidden="true">
                  {getSuggestionIcon(suggestion.type)}
                </span>
                <span className="font-medium">{suggestion.text}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {suggestion.type}
                </span>
              </div>
              {suggestion.count !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {suggestion.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Screen reader feedback */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading && 'Searching...'}
        {showDropdown && suggestions.length > 0 &&
          `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} available`
        }
        {searchQuery && !loading &&
          `Found ${searchInfo.resultsCount} result${searchInfo.resultsCount === 1 ? '' : 's'}`
        }
      </div>
    </div>
  );
});

export default SearchBar;