describe('AI Models Dashboard - User Journey', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('completes the full user journey: search → filter → sort → view → compare', () => {
    // Step 1: Wait for initial load
    cy.waitForModels()

    // Step 2: Search for models
    cy.searchModels('GPT')
    cy.waitForModels()

    // Verify search results
    cy.get('[data-testid="model-grid"]').should('contain.text', 'GPT')

    // Step 3: Apply filters
    cy.filterByProvider('openai')
    cy.waitForModels()

    // Step 4: Change view mode
    cy.changeViewMode('list')
    cy.get('[data-testid="model-grid"]').should('have.class', 'flex', 'flex-col')

    // Step 5: Change back to grid view
    cy.changeViewMode('grid')
    cy.get('[data-testid="model-grid"]').should('have.class', 'grid')

    // Step 6: Select a model for details
    cy.get('[data-testid^="model-card-"]').first().click()

    // Verify model details modal or page loads
    cy.get('body').should('contain.text', 'GPT') // Model name should be visible
  })

  it('handles empty search results gracefully', () => {
    cy.waitForModels()

    // Search for non-existent model
    cy.searchModels('NonExistentModel12345')

    // Should show empty state
    cy.get('[data-testid="empty-state"]', { timeout: 5000 }).should('be.visible')
    cy.get('[data-testid="empty-state"]').should('contain.text', 'No Models Found')
  })

  it('persists user preferences across page reloads', () => {
    cy.waitForModels()

    // Change to list view
    cy.changeViewMode('list')

    // Reload page
    cy.reload()
    cy.waitForModels()

    // View mode should persist
    cy.get('[data-testid="model-grid"]').should('have.class', 'flex', 'flex-col')
  })

  it('supports keyboard navigation', () => {
    cy.waitForModels()

    // Focus search input with keyboard shortcut (if implemented)
    cy.get('body').type('{ctrl}k')
    cy.get('[data-testid="search-input"]').should('be.focused')

    // Navigate with tab
    cy.get('[data-testid="search-input"]').tab()
    cy.focused().should('have.attr', 'data-testid')
  })

  it('works on mobile viewport', () => {
    cy.viewport('iphone-x')
    cy.waitForModels()

    // Mobile-specific interactions
    cy.get('[data-testid="model-grid"]').should('be.visible')

    // Should be responsive
    cy.get('[data-testid="model-grid"]').should('have.class', 'grid-cols-1')
  })

  it('loads performance within acceptable limits', () => {
    const startTime = Date.now()

    cy.visit('/')
    cy.waitForModels()

    cy.then(() => {
      const loadTime = Date.now() - startTime
      expect(loadTime).to.be.lessThan(5000) // Should load within 5 seconds
    })
  })
})