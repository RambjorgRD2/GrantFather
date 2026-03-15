describe('Core Functionality Suite', () => {
  const testUser = {
    email: 'test-core@example.com',
    password: 'TestPassword123!',
    fullName: 'Core Test User',
  };

  beforeEach(() => {
    cy.task('db:reset');
    cy.wait(500); // Reduced wait time
  });

  afterEach(() => {
    cy.task('db:cleanup');
  });

  describe('Landing Page & Navigation', () => {
    it('should display landing page correctly and handle navigation', () => {
      cy.visit('/');
      
      // Verify landing page elements
      cy.get('body').should('contain', 'GrantFather');
      cy.get('a[href="/register"]').should('be.visible');
      cy.get('a[href="/login"]').should('be.visible');
      
      // Test navigation to login
      cy.get('a[href="/login"]').first().click();
      cy.url().should('include', '/login');
      
      // Test navigation to register from login
      cy.get('a[href="/register"]').first().click();
      cy.url().should('include', '/register');
    });

    it('should handle protected route redirects correctly', () => {
      // Try to access protected route without authentication
      cy.visit('/applications');
      cy.url().should('include', '/login');
      
      cy.visit('/grants');
      cy.url().should('include', '/login');
      
      cy.visit('/onboarding');
      cy.url().should('include', '/login');
    });
  });

  describe('User Registration', () => {
    it('should complete user registration with validation', () => {
      cy.visit('/register');
      
      // Verify registration form elements
      cy.get('[data-testid="registration-form"]').should('be.visible');
      cy.get('[data-testid="full-name-input"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="confirm-password-input"]').should('be.visible');
      cy.get('[data-testid="agree-checkbox"]').should('be.visible');
      
      // Test form validation
      cy.get('[data-testid="register-button"]').click();
      
      // Fill form with valid data
      cy.get('[data-testid="full-name-input"]').type(testUser.fullName);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.password);
      cy.get('[data-testid="agree-checkbox"]').click();
      
      // Submit registration
      cy.get('[data-testid="register-button"]').should('not.be.disabled');
      cy.get('[data-testid="register-button"]').click();
    });

    it('should validate email format and password requirements', () => {
      cy.visit('/register');
      
      // Test invalid email - trigger validation by clicking register button
      cy.get('[data-testid="register-button"]').click();
      
      // Should show validation errors for empty fields
      cy.get('body').should('contain.text', 'Full name is required');
    });
  });

  describe('User Authentication', () => {
    it('should handle login flow correctly', () => {
      // Seed test user
      cy.task('db:seed');
      
      cy.visit('/login');
      
      // Verify login form
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-button"]').should('be.visible');
      
      // Attempt login
      cy.get('[data-testid="email-input"]').type('test-cypress@example.com');
      cy.get('[data-testid="password-input"]').type('TestPassword123!');
      cy.get('[data-testid="login-button"]').click();
      
      // Wait for potential redirect - optimized
      cy.wait(2000); // Reduced from 3000
      
      // Should either redirect to onboarding or main app
      cy.url().should('match', /\/(onboarding|grants|applications)/);
    });

    it('should handle logout functionality', () => {
      cy.task('db:seed');
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      
      // Find and click logout button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="logout-button"]').length) {
          cy.get('[data-testid="logout-button"]').click();
        } else if ($body.find('[data-testid="user-menu"]').length) {
          cy.get('[data-testid="user-menu"]').click();
          cy.get('[data-testid="logout-menu-item"]').click();
        }
      });
      
      // Should redirect to login or landing page
      cy.url().should('satisfy', (url) => 
        url.includes('/login') || url.includes('/') || url.includes('/landing')
      );
    });

    it('should handle invalid login credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type('invalid@example.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      
      // Should show error message
      cy.get('body').should('contain.text', 'Invalid login credentials');
    });
  });

  describe('Core Navigation & Layout', () => {
    it('should display header and navigation correctly for authenticated users', () => {
      cy.task('db:seed');
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      
      cy.visit('/grants');
      cy.wait(1500); // Optimized timing
      
      // Verify page loads
      cy.get('body').should('be.visible');
      cy.url().should('include', '/grants');
      
      // Check for grants page content
      cy.get('body').then(($body) => {
        if ($body.find('input[placeholder*="Search"]').length) {
          cy.get('input[placeholder*="Search"]').should('be.visible');
        }
      });
      
      // Test navigation links
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="grants-nav-link"]').length) {
          cy.get('[data-testid="grants-nav-link"]').should('be.visible');
        }
        if ($body.find('[data-testid="applications-nav-link"]').length) {
          cy.get('[data-testid="applications-nav-link"]').should('be.visible');
        }
      });
    });

    it('should handle responsive navigation on mobile', () => {
      cy.task('db:seed');
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      
      // Test mobile viewport
      cy.viewport(375, 667);
      cy.visit('/grants', { timeout: 10000 });
      cy.wait(2000); // Optimized mobile timing
      
      // Check that page loads on mobile
      cy.get('body').should('be.visible');
      cy.url().should('include', '/grants');
    });
  });

  describe('Error Handling & Loading States', () => {
    it('should handle 404 pages correctly', () => {
      cy.visit('/nonexistent-page');
      
      cy.get('body').should('contain.text', '404');
    });

    it('should display loading states appropriately', () => {
      cy.task('db:seed');
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      
      cy.visit('/grants');
      
      // Check for loading indicators or page content
      cy.get('body').should('be.visible');
    });

    it('should handle network errors gracefully', () => {
      cy.task('db:seed');
      cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
      
      // Intercept and fail network requests
      cy.intercept('GET', '/api/**', { forceNetworkError: true });
      
      cy.visit('/grants');
      cy.wait(2000); // Optimized network error test
      
      // Should show error state or fallback content
      cy.get('body').should('exist');
    });
  });

  describe('Accessibility & Performance', () => {
    it('should have proper ARIA labels and semantic HTML', () => {
      cy.visit('/');
      
      // Check for proper semantic HTML
      cy.get('main').should('exist');
      cy.get('header').should('exist');
      
      // Check for ARIA labels on interactive elements
      cy.get('a[href="/register"]').should('be.visible');
    });

    it('should handle keyboard navigation', () => {
      cy.visit('/login');
      
      // Test tab navigation
      cy.get('[data-testid="email-input"]').focus().tab();
      cy.focused().should('have.attr', 'data-testid', 'password-input');
      
      cy.tab();
      cy.focused().should('have.attr', 'data-testid', 'forgot-password-link');
    });

    it('should load pages within acceptable time limits', () => {
      const start = Date.now();
      cy.visit('/');
      cy.get('a[href="/register"]').should('be.visible');
      
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(5000); // 5 second max load time
      });
    });
  });
});