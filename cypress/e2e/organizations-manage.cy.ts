describe('Organizations management', () => {
  it('navigates to Organizations, opens Manage for a selected org, and deep-links into settings', () => {
    const email = Cypress.env('TEST_EMAIL');
    const password = Cypress.env('TEST_PASSWORD');

    cy.visit('/login');
    cy.get('body', { timeout: 10000 }).then(($body) => {
      if ($body.find('[data-testid="login-form"]').length > 0) {
        cy.get('[data-testid="email-input"]').type(email, { log: false });
        cy.get('[data-testid="password-input"]').type(password, { log: false });
        cy.get('[data-testid="login-button"]').click();
      } else {
        cy.log('Login form not found, continuing (likely already authenticated)');
      }
    });

    // if already authed, this may not change; do not assert a specific post-login path
    // wait one tick for auth context to propagate
    cy.wait(500);

    // Go directly to the organizations page (public route with AppLayout)
    cy.visit('/organizations');
    cy.location('pathname', { timeout: 30000 }).then((path) => {
      if (path === '/settings') {
        // If the app redirects to settings, use the header or button to get to Organizations
        cy.get('[data-testid="manage-organizations-link"], [data-testid^="nav-"]', { timeout: 30000 })
          .then(($el) => {
            if ($el.filter('[data-testid="manage-organizations-link"]').length) {
              cy.get('[data-testid="manage-organizations-link"]').click();
            } else {
              cy.contains('[data-testid^="nav-"]', /organizations/i).click();
            }
          });
      }
    });

    cy.get('[data-testid="organizations-page"], h1:contains("Organizations")', { timeout: 30000 }).should('exist');
    cy.get('body').then(($body) => {
      const hasManage = $body.find('[data-testid="organizations-grid"] [data-testid^="manage-org-"]').length > 0;
      if (hasManage) {
        cy.get('[data-testid="organizations-grid"] [data-testid^="manage-org-"]').first().click();

        cy.location('pathname', { timeout: 30000 }).should('eq', '/settings');
        cy.location('search', { timeout: 30000 }).should('match', /orgId=/);
        cy.get('[data-testid="organization-section"]', { timeout: 30000 }).should('exist');
      } else {
        cy.log('No organizations to manage; page rendered correctly.');
      }
    });

    // Should land in settings with orgId param
    cy.location('pathname', { timeout: 30000 }).should('eq', '/settings');
    cy.location('search', { timeout: 30000 }).should('match', /orgId=/);
    // Organization section should be available after guard mounts
    cy.get('[data-testid="organization-section"]', { timeout: 30000 }).should('exist');
  });
});



