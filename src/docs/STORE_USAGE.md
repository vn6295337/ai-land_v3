# Store Usage Guide

This guide demonstrates how to use the Zustand stores in the AI Models Discovery application.

## Overview

The application uses two main stores:
- **ModelsStore**: Manages model data, filtering, searching, and pagination
- **UIStore**: Manages UI state like themes, view modes, and modals

## Basic Usage

### ModelsStore

```typescript
import { useModelsStore, modelsSelectors } from '../stores/modelsStore';

function MyComponent() {
  // Access state and actions
  const {
    models,
    loading,
    error,
    searchQuery,
    filters,
    currentPage,
    // Actions
    fetchModels,
    setSearchQuery,
    setFilters,
    toggleFavorite,
    setPage
  } = useModelsStore();

  // Use selectors for derived state
  const currentPageModels = modelsSelectors.getCurrentPageModels(useModelsStore.getState());
  const paginationInfo = modelsSelectors.getPaginationInfo(useModelsStore.getState());
  const filterSummary = modelsSelectors.getFilterSummary(useModelsStore.getState());

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <div>Found {models.length} models</div>
      <div>Current page: {currentPage}</div>
    </div>
  );
}
```

### UIStore

```typescript
import { useUIStore, uiSelectors } from '../stores/uiStore';

function MyComponent() {
  // Access state and actions
  const {
    theme,
    viewMode,
    showFilters,
    selectedModelId,
    // Actions
    setTheme,
    toggleViewMode,
    toggleFilters,
    openModelDetails,
    showToastMessage
  } = useUIStore();

  // Use selectors for derived state
  const modalState = uiSelectors.getModalState(useUIStore.getState());
  const themeInfo = uiSelectors.getThemeInfo(useUIStore.getState());

  return (
    <div className={themeInfo.isDarkMode ? 'dark' : ''}>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={toggleViewMode}>Switch View</button>
      <button onClick={() => showToastMessage('Hello!')}>Show Toast</button>
    </div>
  );
}
```

## Component Examples

### SearchBar Integration

```typescript
// The SearchBar is now fully store-connected
function SearchExample() {
  return (
    <SearchBar
      placeholder="Search models..."
      showSuggestions={true}
      clearable={true}
      // No need to pass models, query, or handlers!
    />
  );
}
```

### ModelGrid Integration

```typescript
// The ModelGrid automatically gets data from stores
function GridExample() {
  return (
    <ModelGrid
      showPagination={true}
      emptyStateMessage="No models found"
      // Models, loading, view mode all come from stores
    />
  );
}
```

### Pagination Integration

```typescript
// Pagination is fully store-driven
function PaginationExample() {
  return (
    <Pagination
      showInfo={true}
      maxPageButtons={7}
      // All pagination state comes from ModelsStore
    />
  );
}
```

## Advanced Patterns

### Selective State Subscriptions

For performance, you can subscribe to only specific parts of the store:

```typescript
// Only subscribe to loading state
const loading = useModelsStore(state => state.loading);

// Only subscribe to current page
const currentPage = useModelsStore(state => state.currentPage);

// Multiple selections
const { models, loading } = useModelsStore(state => ({
  models: state.models,
  loading: state.loading
}));
```

### Using Selectors

Selectors provide computed state and are memoized:

```typescript
// Get paginated models for current page
const currentModels = modelsSelectors.getCurrentPageModels(useModelsStore.getState());

// Get pagination info
const pagination = modelsSelectors.getPaginationInfo(useModelsStore.getState());

// Check if filters are active
const filterSummary = modelsSelectors.getFilterSummary(useModelsStore.getState());
```

### Store Actions

#### ModelsStore Actions

```typescript
const store = useModelsStore();

// Data fetching
await store.fetchModels(); // Fetch with cache check
await store.refreshModels(); // Force refresh

// Search
store.setSearchQuery('GPT-4'); // Sets query and triggers search
store.clearSearch(); // Clear search

// Filtering
store.setFilters({
  providers: ['openai', 'anthropic'],
  freeOnly: true,
  minCost: 0,
  maxCost: 0.05
});
store.clearFilters(); // Reset all filters

// Favorites
store.toggleFavorite('model-id');
store.addFavorite('model-id');
store.removeFavorite('model-id');

// Pagination
store.setPage(2);
store.nextPage();
store.prevPage();
store.setItemsPerPage(24);
```

#### UIStore Actions

```typescript
const store = useUIStore();

// Theme management
store.setTheme('dark'); // 'light' | 'dark' | 'system'
store.toggleTheme(); // Toggle between light/dark
store.applySystemTheme(); // Use system preference

// View modes
store.setViewMode('grid'); // 'grid' | 'list' | 'compact'
store.toggleViewMode(); // Cycle through modes

// Modals
store.openModelDetails('model-id');
store.closeModelDetails();
store.openSettings();
store.closeAllModals();

// Notifications
store.showToastMessage('Success!', 'success');
store.showToastMessage('Error occurred', 'error');

// Layout
store.toggleFilters();
store.toggleKPIs();

// Accessibility
store.setReducedMotion(true);
store.setHighContrast(true);
store.detectAccessibilityPreferences(); // Auto-detect from system
```

## Performance Tips

### 1. Use React.memo

Components using stores should be memoized:

```typescript
export const MyComponent = React.memo(() => {
  const { models } = useModelsStore();
  return <div>{models.length} models</div>;
});
```

### 2. Selective Subscriptions

Only subscribe to what you need:

```typescript
// ❌ Bad - subscribes to entire store
const store = useModelsStore();

// ✅ Good - subscribes only to needed data
const loading = useModelsStore(state => state.loading);
const modelCount = useModelsStore(state => state.models.length);
```

### 3. Use Selectors

Selectors are memoized and compute derived state efficiently:

```typescript
// ✅ Use selectors for computed state
const currentModels = modelsSelectors.getCurrentPageModels(useModelsStore.getState());
const paginationInfo = modelsSelectors.getPaginationInfo(useModelsStore.getState());
```

## Store Persistence

Both stores automatically persist user preferences:

### ModelsStore Persists:
- Favorites (as Array, converted from Set)
- Filters
- Sort preferences
- Items per page
- Auto-refresh setting

### UIStore Persists:
- Theme preference
- View mode
- Layout settings (sidebar, filters, etc.)
- Accessibility settings
- Performance settings

## Error Handling

Stores provide comprehensive error handling:

```typescript
const { error, loading } = useModelsStore();

if (error) {
  return <div>Error: {error}</div>;
}

if (loading) {
  return <div>Loading...</div>;
}
```

## Testing with Stores

Mock stores in tests:

```typescript
vi.mock('../stores/modelsStore', () => ({
  useModelsStore: vi.fn(() => ({
    models: mockModels,
    loading: false,
    error: null,
    setSearchQuery: vi.fn()
  })),
  modelsSelectors: {
    getCurrentPageModels: vi.fn(() => mockModels)
  }
}));
```

## Best Practices

1. **Component Separation**: Keep components purely presentational
2. **Store Logic**: Put all business logic in stores
3. **Selective Subscriptions**: Subscribe only to needed state
4. **Use Selectors**: For computed/derived state
5. **Error Boundaries**: Wrap store-connected components
6. **Performance**: Use React.memo for components
7. **Testing**: Mock stores for isolated testing

This architecture provides a scalable, maintainable, and performant state management solution for the AI Models Discovery application.