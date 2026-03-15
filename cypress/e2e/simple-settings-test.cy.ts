describe('Simple Settings Test', () => {
  it('should be able to access settings page', () => {
    const email = Cypress.env('TEST_EMAIL');
    const password = Cypress.env('TEST_PASSWORD');
    
    cy.visit('/login');
    
    // Fill login form
    cy.get('input[type="email"], input[name="email"], input[autocomplete="email"]', { timeout: 20000 })
      .first()
      .type(email, { log: false });
    cy.get('input[type="password"], input[name="password"], input[autocomplete="current-password"]')
      .first()
      .type(password, { log: false });
    
    // Submit login
    cy.contains('button, [role="button"]', /sign in|log in|continue/i, { timeout: 10000 }).click();
    
    // Wait for redirect
    cy.location('pathname', { timeout: 30000 }).should((p) => {
      expect(p).to.match(/\/(dashboard|settings|home|applications|)$/);
    });
    
    // Visit settings
    cy.visit('/settings');
    cy.wait(10000); // Wait longer
    
    // Check if we're still on settings page
    cy.location('pathname').should('eq', '/settings');
    cy.screenshot('settings-page-loaded');
    
    // Check if any content is rendered
    cy.get('body').should('be.visible');
    cy.get('body').then(($body) => {
      const text = $body.text();
      cy.log('Body text length:', text.length);
      cy.log('Body text preview:', text.substring(0, 200));
      
      if (text.includes('Organization Settings')) {
        cy.log('Organization Settings text found');
        cy.screenshot('org-settings-found');
      } else {
        cy.log('Organization Settings text not found');
        cy.screenshot('org-settings-not-found');
      }
    });
  });
});
