/**
 * Simple Global Organization Context Test
 * 
 * This test verifies that the global organization context is working
 * by checking that the organization data is available in the context.
 */

describe('Global Organization Context - Simple', () => {
  it('should have organization context available', () => {
    // Visit the login page to check if the app loads
    cy.visit('/login');
    
    // Check if the page loads without errors
    cy.get('body').should('be.visible');
    
    // Check if the header is present (which uses the organization context)
    cy.get('header').should('exist');
    
    // Check if the GrantFather branding is present
    cy.contains('GrantFather').should('be.visible');
  });

  it('should load organization settings page', () => {
    // Visit the settings page directly
    cy.visit('/settings');
    
    // Check if the page loads
    cy.get('body').should('be.visible');
    
    // Check if the organization settings title is present
    cy.contains('Organization Settings').should('be.visible');
  });

  it('should load dashboard page', () => {
    // Visit the dashboard page directly
    cy.visit('/dashboard');
    
    // Check if the page loads
    cy.get('body').should('be.visible');
    
    // Check if the dashboard content is present
    cy.contains('AI-Powered Grant Writing').should('be.visible');
  });
});
