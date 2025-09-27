// Custom commands for AI Models Dashboard E2E testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Search for models using the search bar
       */
      searchModels(query: string): Chainable<Element>

      /**
       * Filter models by provider
       */
      filterByProvider(provider: string): Chainable<Element>

      /**
       * Change view mode (grid, list, compact)
       */
      changeViewMode(mode: 'grid' | 'list' | 'compact'): Chainable<Element>

      /**
       * Wait for models to load
       */
      waitForModels(): Chainable<Element>
    }
  }
}

Cypress.Commands.add('searchModels', (query: string) => {
  cy.get('[data-testid="search-input"]').clear().type(query)
  cy.get('[data-testid="search-input"]').should('have.value', query)
})

Cypress.Commands.add('filterByProvider', (provider: string) => {
  cy.get('[data-testid="filter-panel"]').should('be.visible')
  cy.get(`[data-testid="provider-filter-${provider}"]`).click()
})

Cypress.Commands.add('changeViewMode', (mode: 'grid' | 'list' | 'compact') => {
  cy.get('[data-testid="view-mode-toggle"]').should('be.visible')
  cy.get(`[data-testid="view-mode-${mode}"]`).click()
})

Cypress.Commands.add('waitForModels', () => {
  cy.get('[data-testid="model-grid"]', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="loading-spinner"]').should('not.exist')
})