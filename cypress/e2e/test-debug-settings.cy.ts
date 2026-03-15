/**
 * Debug Settings Page
 * 
 * This test helps debug what's actually being rendered on the settings page
 */

describe('Debug Settings Page', () => {
  it('should show what is actually rendered', () => {
    cy.visit('/settings');
    
    // Wait for the page to load
    cy.get('body').should('be.visible');
    
    // Take a screenshot to see what's actually there
    cy.screenshot('settings-page-debug');
    
    // Log the page title
    cy.title().then((title) => {
      cy.log('Page title:', title);
    });
    
    // Log the body content
    cy.get('body').then(($body) => {
      cy.log('Body content length:', $body.text().length);
      cy.log('Body HTML:', $body.html().substring(0, 500));
    });
    
    // Check if there are any error messages
    cy.get('body').then(($body) => {
      const text = $body.text();
      if (text.includes('Error') || text.includes('error')) {
        cy.log('Found error text:', text);
      }
    });
    
    // Check if there are any React error boundaries
    cy.get('[data-testid="error-boundary"]').should('not.exist');
    
    // Check if the page is completely blank
    cy.get('body').should('not.be.empty');
  });
});
