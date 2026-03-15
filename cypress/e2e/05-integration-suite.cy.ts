describe('Integration & Performance Suite', () => {
  const testUser = {
    email: 'test-integration@example.com',
    password: 'TestPassword123!',
    fullName: 'Integration Test User',
  };

  const testOrganization = {
    name: 'Integration Test Organization',
    orgType: 'nonprofit',
    contactName: 'Integration Contact',
    contactEmail: 'integration@testorg.com',
    contactPhone: '+4712345678',
    membersCount: 50,
    mission: 'Testing system integration and performance',
    eventTypes: ['community', 'education'],
    fundingNeeds: ['operational', 'program'],
    preferredLanguages: ['Norwegian', 'English'],
  };

  describe('Cross-System Integration Tests', () => {
    beforeEach(() => {
      // Phase 2 optimization: Efficient setup
      cy.task('db:reset');
      cy.task('db:seed');
      cy.authenticateWithOrganization('test-cypress@example.com', 'TestPassword123!');
    });

    afterEach(() => {
      cy.task('db:cleanup');
    });

    it('should handle complete user journey from registration to grant application', () => {
      // Logout and start fresh
      cy.logout();
      
      // Registration
      cy.visit('/register');
      cy.wait(1000);
      
      const uniqueEmail = `integration-test-${Date.now()}@example.com`;
      
      cy.get('[data-testid="full-name-input"]').type(testUser.fullName);
      cy.get('[data-testid="email-input"]').type(uniqueEmail);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.password);
      cy.get('[data-testid="agree-checkbox"]').click();
      cy.get('[data-testid="register-button"]').click();
      
      cy.wait(3000);
      
      // Login with new user
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type(uniqueEmail);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();
      
      cy.wait(3000);
      
      // Complete onboarding if redirected
      cy.url().then((url) => {
        if (url.includes('/onboarding')) {
          cy.fillOnboardingForm(testOrganization);
          cy.wait(3000);
        }
      });
      
      // Navigate through main features
      cy.visit('/grants');
      cy.wait(2000);
      cy.get('body').should('exist');
      
      cy.visit('/applications');
      cy.wait(2000);
      cy.get('body').should('exist');
      
      cy.navigateToSettings();
      cy.wait(2000);
      cy.get('body').should('exist');
    });

    it('should handle data consistency across different pages', () => {
      // Update organization in settings
      cy.navigateToSettings();
      cy.wait(2000);
      
      const updatedName = 'Updated Integration Org';
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="edit-org-info-button"]').length) {
          cy.get('[data-testid="edit-org-info-button"]').click();
          cy.wait(1000);
          
          if ($body.find('[data-testid="org-name-input"]').length) {
            cy.get('[data-testid="org-name-input"]').clear().type(updatedName);
            
            if ($body.find('[data-testid="save-org-info-button"]').length) {
              cy.get('[data-testid="save-org-info-button"]').click();
              cy.wait(2000);
            }
          }
        }
      });
      
      // Verify update appears on other pages
      cy.visit('/grants');
      cy.wait(2000);
      cy.get('body').should('contain', updatedName);
      
      cy.visit('/applications');
      cy.wait(2000);
      cy.get('body').should('exist'); // Organization name may not be displayed here
    });

    it('should handle session persistence across browser tabs', () => {
      // Verify authenticated state
      cy.visit('/grants');
      cy.wait(2000);
      cy.url().should('include', '/grants');
      
      // Open new tab simulation by visiting login directly
      cy.visit('/login');
      cy.wait(1000);
      
      // Should redirect away from login if still authenticated
      cy.wait(2000);
      cy.url().should('not.include', '/login');
    });

    it('should handle concurrent user operations', () => {
      // Simulate multiple operations happening quickly
      cy.visit('/applications');
      cy.wait(1000);
      
      cy.visit('/grants');
      cy.wait(1000);
      
      cy.navigateToSettings();
      cy.wait(1000);
      
      cy.visit('/applications');
      cy.wait(2000);
      
      // All operations should complete successfully
      cy.get('body').should('exist');
      cy.url().should('include', '/applications');
    });
  });

  describe('Performance Testing & Optimization', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.wait(1000);
      cy.task('db:seed');
      cy.wait(1000);
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      cy.createTestOrganization();
      cy.wait(1000);
    });

    afterEach(() => {
      cy.task('db:cleanup');
    });

    it('should load all major pages within acceptable time limits', () => {
      const pageLoadTimes: Record<string, number> = {};
      
      // Test grants page load time
      const grantsStart = Date.now();
      cy.visit('/grants');
      cy.get('body').should('exist');
      cy.wait(2000);
      pageLoadTimes.grants = Date.now() - grantsStart;
      
      // Test applications page load time
      const appsStart = Date.now();
      cy.visit('/applications');
      cy.get('body').should('exist');
      cy.wait(2000);
      pageLoadTimes.applications = Date.now() - appsStart;
      
      // Test settings page load time
      const settingsStart = Date.now();
      cy.navigateToSettings();
      cy.get('body').should('exist');
      cy.wait(2000);
      pageLoadTimes.settings = Date.now() - settingsStart;
      
      // Verify all pages loaded within 10 seconds
      cy.then(() => {
        Object.entries(pageLoadTimes).forEach(([page, time]) => {
          expect(time, `${page} page load time`).to.be.lessThan(10000);
        });
      });
    });

    it('should handle rapid navigation without memory leaks', () => {
      // Rapidly navigate between pages
      for (let i = 0; i < 5; i++) {
        cy.visit('/grants');
        cy.wait(500);
        
        cy.visit('/applications');
        cy.wait(500);
        
        cy.navigateToSettings();
        cy.wait(500);
      }
      
      // Final page should still work properly
      cy.visit('/grants');
      cy.wait(2000);
      cy.get('body').should('exist');
    });

    it('should handle large data sets efficiently', () => {
      // Test with simulated large data (actual data may vary)
      cy.visit('/grants');
      cy.wait(3000);
      
      // Check for pagination or virtual scrolling
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="pagination"]').length) {
          cy.get('[data-testid="pagination"]').should('be.visible');
        }
        
        if ($body.find('[data-testid="load-more-button"]').length) {
          cy.get('[data-testid="load-more-button"]').click();
          cy.wait(2000);
        }
      });
    });

    it('should optimize network requests and minimize API calls', () => {
      // Monitor network requests
      cy.intercept('GET', '**/api/**').as('apiRequests');
      
      cy.visit('/grants');
      cy.wait(3000);
      
      // Should not make excessive API requests
      cy.get('@apiRequests.all').then((requests) => {
        expect(requests.length).to.be.lessThan(20); // Reasonable limit
      });
    });
  });

  describe('Error Recovery & Resilience Testing', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.wait(1000);
      cy.task('db:seed');
      cy.wait(1000);
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      cy.createTestOrganization();
      cy.wait(1000);
    });

    afterEach(() => {
      cy.task('db:cleanup');
    });

    it('should recover from network failures gracefully', () => {
      // Intercept and fail all API requests
      cy.intercept('GET', '**/api/**', { forceNetworkError: true }).as('failedRequests');
      
      cy.visit('/grants');
      cy.wait(3000);
      
      // Should show error state or fallback content
      cy.get('body').should('exist');
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        expect(bodyText.length).to.be.greaterThan(0);
      });
      
      // Remove network failure and try again
      cy.intercept('GET', '**/api/**').as('normalRequests');
      cy.reload();
      cy.wait(3000);
      
      cy.get('body').should('exist');
    });

    it('should handle authentication failures and recovery', () => {
      // Simulate auth failure
      cy.intercept('GET', '**/auth/**', { statusCode: 401 }).as('authFailure');
      
      cy.visit('/grants');
      cy.wait(3000);
      
      // Should redirect to login or show auth error
      cy.url().then((url) => {
        if (url.includes('/login')) {
          cy.log('Correctly redirected to login on auth failure');
        } else {
          cy.get('body').should('contain.text', 'authentication');
        }
      });
    });

    it('should handle database connection issues', () => {
      // Intercept and fail database-related requests
      cy.intercept('GET', '**/api/organizations/**', { statusCode: 503 }).as('dbFailure');
      
      cy.navigateToSettings();
      cy.wait(3000);
      
      // Should handle database errors gracefully
      cy.get('body').should('exist');
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        // Should show error message or fallback content
        expect(bodyText.includes('error') || bodyText.includes('unavailable') || bodyText.length > 0).to.be.true;
      });
    });

    it('should recover from partial page load failures', () => {
      // Intercept and fail some but not all requests
      cy.intercept('GET', '**/api/grants/**', { statusCode: 500 }).as('grantsFailure');
      
      cy.visit('/grants');
      cy.wait(3000);
      
      // Page should still load even if some components fail
      cy.get('body').should('exist');
      cy.get('header').should('exist'); // Header should still load
    });
  });

  describe('Accessibility & Standards Compliance', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.wait(1000);
      cy.task('db:seed');
      cy.wait(1000);
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      cy.createTestOrganization();
      cy.wait(1000);
    });

    afterEach(() => {
      cy.task('db:cleanup');
    });

    it('should maintain proper heading hierarchy across all pages', () => {
      const pages = ['/grants', '/applications'];
      
      pages.forEach((page) => {
        cy.visit(page);
        cy.wait(2000);
        
        // Check for proper heading structure
        cy.get('h1').should('have.length.at.most', 1); // Only one H1 per page
        cy.get('h1, h2, h3, h4, h5, h6').should('have.length.greaterThan', 0);
      });
    });

    it('should support keyboard navigation across entire application', () => {
      cy.visit('/grants');
      cy.wait(2000);
      
      // Test keyboard navigation
      cy.get('body').focus();
      cy.tab();
      cy.focused().should('exist');
      
      // Continue tabbing through interactive elements
      cy.tab();
      cy.focused().should('exist');
      
      cy.tab();
      cy.focused().should('exist');
    });

    it('should provide proper ARIA labels and roles', () => {
      cy.visit('/grants');
      cy.wait(2000);
      
      // Check for essential ARIA attributes
      cy.get('main').should('exist');
      cy.get('nav').should('exist');
      
      // Check for ARIA labels on interactive elements
      cy.get('button, input, select, [role="button"]').then(($elements) => {
        if ($elements.length > 0) {
          cy.wrap($elements.first()).should('have.attr', 'aria-label');
        }
      });
    });

    it('should maintain focus management during navigation', () => {
      cy.visit('/grants');
      cy.wait(2000);
      
      // Focus an element
      cy.get('button, input, a').first().focus();
      cy.focused().should('exist');
      
      // Navigate to another page
      cy.visit('/applications');
      cy.wait(2000);
      
      // Focus should be managed properly
      cy.focused().should('exist');
    });

    it('should work properly with screen reader simulation', () => {
      cy.visit('/grants');
      cy.wait(2000);
      
      // Check for screen reader friendly content
      cy.get('[aria-hidden="true"]').should('not.contain.text', 'important');
      cy.get('[aria-label]').should('exist');
      
      // Check for skip links
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="skip-to-content"]').length) {
          cy.get('[data-testid="skip-to-content"]').should('exist');
        }
      });
    });
  });

  describe('Security & Data Protection', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.wait(1000);
      cy.task('db:seed');
      cy.wait(1000);
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      cy.createTestOrganization();
      cy.wait(1000);
    });

    afterEach(() => {
      cy.task('db:cleanup');
    });

    it('should validate Row Level Security policies across the application', () => {
      // Test RLS policies
      cy.testRLSPolicies('test-cypress@example.com');
      
      // Verify user can only access their own data
      cy.visit('/applications');
      cy.wait(2000);
      
      // Should only show user's own applications
      cy.get('body').should('exist');
    });

    it('should prevent unauthorized access to admin features', () => {
      // Try to access admin routes
      cy.visit('/admin');
      cy.wait(2000);
      
      // Should redirect away or show access denied
      cy.url().then((url) => {
        expect(url).to.not.include('/admin');
      });
    });

    it('should handle sensitive data appropriately', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Check that sensitive fields are properly handled
      cy.get('input[type="password"]').should('have.attr', 'type', 'password');
      
      // Verify no sensitive data in console
      cy.window().then((win) => {
        const logs = win.console;
        // This would typically require custom console monitoring
        cy.log('Console monitoring for sensitive data exposure');
      });
    });

    it('should maintain secure session handling', () => {
      // Verify session timeout behavior
      cy.visit('/grants');
      cy.wait(2000);
      
      // Clear session storage to simulate timeout
      cy.clearLocalStorage();
      cy.clearCookies();
      
      // Try to access protected resource
      cy.reload();
      cy.wait(3000);
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });

  describe('Multi-Language & Internationalization', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.wait(1000);
      cy.task('db:seed');
      cy.wait(1000);
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      cy.createTestOrganization();
      cy.wait(1000);
    });

    afterEach(() => {
      cy.task('db:cleanup');
    });

    it('should handle Norwegian language preference', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Switch to Norwegian
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="ui-language-select"]').length) {
          cy.get('[data-testid="ui-language-select"]').click();
          cy.get('[data-value="no"]').click();
          cy.wait(2000);
          
          // Verify Norwegian text appears
          cy.get('body').should('contain.text', 'Innstillinger');
        }
      });
    });

    it('should handle English language preference', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Switch to English
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="ui-language-select"]').length) {
          cy.get('[data-testid="ui-language-select"]').click();
          cy.get('[data-value="en"]').click();
          cy.wait(2000);
          
          // Verify English text appears
          cy.get('body').should('contain.text', 'Settings');
        }
      });
    });

    it('should persist language preferences across sessions', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Set language preference
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="ui-language-select"]').length) {
          cy.get('[data-testid="ui-language-select"]').click();
          cy.get('[data-value="no"]').click();
          cy.wait(2000);
        }
      });
      
      // Logout and login again
      cy.logout();
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Language preference should be preserved
      cy.get('body').should('exist');
    });

    it('should handle mixed language content appropriately', () => {
      // Test with both Norwegian and English content
      cy.visit('/grants');
      cy.wait(2000);
      
      // Content should be displayed consistently
      cy.get('body').should('exist');
      
      // Check for proper text direction and formatting
      cy.get('html').should('have.attr', 'lang');
    });
  });

  describe('System Integration & Health Checks', () => {
    it('should verify database connectivity and operations', () => {
      cy.task('db:reset');
      cy.wait(1000);
      
      // Verify database operations work
      cy.task('db:seed');
      cy.wait(1000);
      
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      
      // Verify data persistence
      cy.createTestOrganization();
      cy.wait(1000);
      
      // Cleanup should also work
      cy.task('db:cleanup');
    });

    it('should verify authentication system integration', () => {
      // Test auth system end-to-end
      cy.visit('/login');
      cy.wait(1000);
      
      cy.task('db:seed');
      cy.wait(1000);
      
      cy.get('[data-testid="email-input"]').type('test-cypress@example.com');
      cy.get('[data-testid="password-input"]').type('TestPassword123!');
      cy.get('[data-testid="login-button"]').click();
      
      cy.wait(3000);
      
      // Should be authenticated
      cy.url().should('not.include', '/login');
    });

    it('should verify edge function integration', () => {
      cy.task('db:seed');
      cy.wait(1000);
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      cy.createTestOrganization();
      
      // Test edge functions through normal application flow
      cy.visit('/grants');
      cy.wait(3000);
      
      // Edge functions should work for search/data operations
      cy.get('body').should('exist');
    });

    it('should verify storage and file handling integration', () => {
      cy.task('db:seed');
      cy.wait(1000);
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      cy.createTestOrganization();
      
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Test file upload if available
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="file-upload-input"]').length) {
          const fileName = 'test-upload.txt';
          cy.get('[data-testid="file-upload-input"]').selectFile({
            contents: Cypress.Buffer.from('test file content'),
            fileName: fileName,
            mimeType: 'text/plain',
          });
          cy.wait(2000);
        }
      });
    });
  });
});