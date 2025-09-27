# Integration Testing Patterns

This document outlines the integration testing patterns for the AI Models Dashboard.

## Philosophy

Instead of fighting the store-integrated architecture, we embrace it with integration tests that validate components working WITH their store dependencies.

## Pattern 1: Component + Store Integration

```typescript
describe('Component Integration Tests', () => {
  beforeEach(() => {
    // Set up real store state
    useMyStore.setState({
      // Initial test state
    });
  });

  it('integrates with store correctly', () => {
    render(<MyComponent />);

    // Test component behavior with real store
    // Verify store state changes
    // Test user interactions affecting store
  });
});
```

## Pattern 2: Multi-Store Integration

```typescript
describe('Multi-Store Integration', () => {
  beforeEach(() => {
    // Set up multiple stores
    useModelsStore.setState({ /* models data */ });
    useUIStore.setState({ /* UI state */ });
    useUserProfileStore.setState({ /* user data */ });
  });

  it('coordinates between stores', () => {
    render(<ComplexComponent />);

    // Test cross-store interactions
    fireEvent.click(screen.getByRole('button'));

    // Verify multiple stores updated correctly
    expect(useModelsStore.getState()).toMatchObject({ /* expected */ });
    expect(useUIStore.getState()).toMatchObject({ /* expected */ });
  });
});
```

## Pattern 3: User Journey Integration

```typescript
describe('User Journey Integration', () => {
  it('completes full user flow', () => {
    // Set up initial state
    useModelsStore.setState({ models: mockModels });

    render(<Dashboard />);

    // Step 1: Search
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'GPT' }
    });

    // Step 2: Filter
    fireEvent.click(screen.getByText('OpenAI'));

    // Step 3: Select
    fireEvent.click(screen.getByText('GPT-4'));

    // Verify final state
    expect(useModelsStore.getState().selectedModel).toBeTruthy();
  });
});
```

## Benefits of This Approach

1. **Real Integration** - Tests how components actually work in production
2. **Store Validation** - Ensures store logic works with UI interactions
3. **Performance Insights** - Can catch performance issues with real state
4. **User-Centric** - Tests match actual user behavior patterns
5. **Maintainable** - Less brittle than complex mocking

## Testing Hierarchy

1. **Unit Tests** - Services, utilities, pure functions ✅
2. **Integration Tests** - Components + stores together ✅
3. **E2E Tests** - Full user journeys in browser ✅
4. **Visual Tests** - Component rendering validation

## Files to Test This Way

- ✅ ModelGrid + modelsStore + uiStore
- ✅ SearchBar + modelsStore
- 🔄 FilterPanel + modelsStore
- 🔄 Dashboard + all stores
- 🔄 UserProfile + userProfileStore

This approach aligns with the enterprise architecture and provides meaningful test coverage.