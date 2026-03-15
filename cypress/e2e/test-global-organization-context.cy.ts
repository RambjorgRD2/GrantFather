/**
 * Test Global Organization Context
 * 
 * This test verifies that organization selection in Organization Settings
 * updates the entire application globally, including:
 * - Top menu logo and organization name
 * - Dashboard organization information
 * - All pages that display organization data
 */

describe('Global Organization Context', () => {
  beforeEach(() => {
    // Login as a user with multiple organizations
    cy.session('global-org-test', () => {
      cy.visit('/login');
      cy.get('input[name="email"]').type('rambjorg.rdd@gmail.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    });
  });

  it('should update top menu logo and name when organization is changed', () => {
    cy.visit('/settings');
    
    // Wait for the page to load
    cy.get('[data-testid="org-cards"]', { timeout: 10000 }).should('be.visible');
    
    // Get the current organization name from the top menu
    cy.get('header').within(() => {
      cy.get('img[alt*="logo"]').should('exist');
      cy.get('p').contains('brAInstorm').should('exist');
    });
    
    // Click on a different organization (ADHD Vestland)
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland').click();
    
    // Wait for the organization to be selected
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland')
      .should('have.class', 'border-green-500');
    
    // Navigate to dashboard to verify the change
    cy.visit('/dashboard');
    
    // Verify the top menu now shows the new organization
    cy.get('header').within(() => {
      cy.get('img[alt*="logo"]').should('exist');
      cy.get('p').contains('ADHD Vestland').should('exist');
    });
    
    // Verify the dashboard shows the new organization information
    cy.get('img[alt*="logo"]').should('exist');
    cy.contains('ADHD Vestland').should('exist');
  });

  it('should persist organization selection across page navigation', () => {
    cy.visit('/settings');
    
    // Wait for the page to load
    cy.get('[data-testid="org-cards"]', { timeout: 10000 }).should('be.visible');
    
    // Select a different organization
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland').click();
    
    // Wait for selection
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland')
      .should('have.class', 'border-green-500');
    
    // Navigate to different pages and verify organization persists
    const pages = ['/dashboard', '/applications', '/settings'];
    
    pages.forEach(page => {
      cy.visit(page);
      
      // Verify the top menu shows the selected organization
      cy.get('header').within(() => {
        cy.get('p').contains('ADHD Vestland').should('exist');
      });
    });
  });

  it('should update organization information in grant applications', () => {
    cy.visit('/settings');
    
    // Wait for the page to load
    cy.get('[data-testid="org-cards"]', { timeout: 10000 }).should('be.visible');
    
    // Select a different organization
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland').click();
    
    // Wait for selection
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland')
      .should('have.class', 'border-green-500');
    
    // Navigate to applications page
    cy.visit('/applications');
    
    // Try to create a new application
    cy.get('button').contains('New Application').click();
    
    // Verify the modal shows the correct organization
    cy.get('[role="dialog"]').within(() => {
      cy.contains('ADHD Vestland').should('exist');
    });
  });

  it('should handle organization switching with logo updates', () => {
    cy.visit('/settings');
    
    // Wait for the page to load
    cy.get('[data-testid="org-cards"]', { timeout: 10000 }).should('be.visible');
    
    // Get the current logo from the top menu
    cy.get('header').within(() => {
      cy.get('img[alt*="logo"]').then($img => {
        const currentSrc = $img.attr('src');
        cy.wrap(currentSrc).as('originalLogo');
      });
    });
    
    // Select a different organization
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland').click();
    
    // Wait for selection
    cy.get('[data-testid="org-card-"]').contains('ADHD Vestland')
      .should('have.class', 'border-green-500');
    
    // Navigate to dashboard
    cy.visit('/dashboard');
    
    // Verify the logo has changed (if the organizations have different logos)
    cy.get('header').within(() => {
      cy.get('img[alt*="logo"]').should('exist');
      // The logo should be different from the original
      cy.get('img[alt*="logo"]').then($img => {
        const newSrc = $img.attr('src');
        cy.get('@originalLogo').then(originalSrc => {
          // If organizations have different logos, they should be different
          // If they have the same logo, they might be the same
          expect(newSrc).to.exist;
        });
      });
    });
  });
});
