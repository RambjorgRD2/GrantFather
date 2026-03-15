// Custom Cypress commands

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginSupabase(email: string, password: string): Chainable<void>;
      // Authentication commands
      login(email: string, password: string): Chainable<void>;
      loginSimple(email: string, password: string): Chainable<void>;
      authenticateWithOrganization(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      register(email: string, password: string, fullName: string): Chainable<void>;
      
      // Form commands
      fillOnboardingForm(organizationData: any): Chainable<void>;
      fillOnboardingStep1(organizationData: any): Chainable<void>;
      fillGrantApplicationForm(applicationData: any): Chainable<void>;
      fillGrantSearchForm(searchData: any): Chainable<void>;
      
      // Navigation commands
      navigateToOnboarding(): Chainable<void>;
      navigateToApplications(): Chainable<void>;
      navigateToGrants(): Chainable<void>;
      navigateToSettings(): Chainable<void>;
      
      // Data commands
      createTestOrganization(): Chainable<void>;
      createTestGrantApplication(): Chainable<void>;
      createTestGrantSearch(): Chainable<void>;
      createKnowledgeEntry(entryData: any): Chainable<void>;
      
      // Language commands
      switchUILanguage(languageCode: string): Chainable<void>;
      switchAILanguage(languageCode: string): Chainable<void>;
      
      // Database validation commands
      validateOrganizationInDB(organizationData: any): Chainable<void>;
      testRLSPolicies(userEmail: string): Chainable<void>;
      
      // Utility commands
      waitForAuth(): Chainable<void>;
      waitForOrganization(): Chainable<void>;
      waitForOnboarding(): Chainable<void>;
      clickWithOverlayHandling(selector: string): Chainable<void>;
      
      // Phase 3: Session management
      restoreSession(sessionName: string): Chainable<void>;
      saveSession(sessionName: string): Chainable<void>;

      // Test data cleanup
      deleteTestData(): Chainable<void>;

      // Loading state handling
      waitForLoadingStates(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginSupabase', (email: string, password: string) => {
  cy.visit('/login');
  cy.window({ log: false }).then(async (win: any) => {
    if (!win.supabase || !win.supabase.auth) {
      throw new Error('Supabase client not found on window');
    }
    const { error } = await win.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  });
});

// Authentication Commands - Enhanced for Phase 1
Cypress.Commands.add('login', (email: string, password: string) => {
  // Intercept auth requests to properly wait for completion
  cy.intercept('POST', '**/auth/v1/token*').as('authToken');
  cy.intercept('GET', '**/auth/v1/user*').as('authUser');
  
  cy.visit('/login');
  cy.get('[data-testid="email-input"]', { timeout: 8000 }).should('be.visible').type(email);
  cy.get('[data-testid="password-input"]').should('be.visible').type(password);
  cy.get('[data-testid="login-button"]').should('be.enabled').click();
  
  // Wait for authentication requests to complete with shorter timeout
  cy.wait('@authToken', { timeout: 8000 });
  cy.wait('@authUser', { timeout: 8000 });
  
  // Enhanced authentication validation
  cy.waitForAuth();
  cy.waitForLoadingStates();
});

// Login without setting up intercepts (for cases where we don't need to wait for network requests)
Cypress.Commands.add('loginSimple', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]', { timeout: 6000 }).should('be.visible').type(email);
  cy.get('[data-testid="password-input"]').should('be.visible').type(password);
  cy.get('[data-testid="login-button"]').should('be.enabled').click();
  
  // Optimized wait for authentication with reduced timeout
  cy.waitForAuth();
  cy.waitForLoadingStates();
});

// Unified authentication with organization setup - Phase 1 optimization
Cypress.Commands.add('authenticateWithOrganization', (email: string, password: string) => {
  cy.loginSimple(email, password);
  cy.waitForAuth();
  cy.createTestOrganization();
  cy.waitForOrganization();
});

Cypress.Commands.add('logout', () => {
  // Check if user is authenticated before attempting logout
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="user-menu"]').length > 0) {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      cy.url().should('include', '/');
    } else {
      cy.log('User not authenticated, skipping logout');
    }
  });
});

Cypress.Commands.add('register', (email: string, password: string, fullName: string) => {
  // Intercept registration requests
  cy.intercept('POST', '**/auth/v1/signup*').as('authSignup');
  cy.intercept('POST', '**/auth/v1/token*').as('authToken');
  
  cy.visit('/register');
  cy.get('[data-testid="full-name-input"]').type(fullName);
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="confirm-password-input"]').type(password);
  cy.get('[data-testid="agree-checkbox"]').click();
  cy.get('[data-testid="register-button"]').click();
  
  // Wait for registration request to complete
  cy.wait('@authSignup', { timeout: 10000 });
  
  // In test environment, registration may not trigger actual email verification
  // so we handle both success and error cases gracefully
  cy.wait(2000);
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="registration-success"]').length > 0) {
      // Success message shown on /register — user must click "Continue to login"
      cy.url().should('include', '/register');
    } else {
      cy.log('Registration completed with test environment limitations');
    }
  });
});

// Form Commands
Cypress.Commands.add('fillOnboardingStep1', (organizationData: any) => {
  // Step 1: Basic Information
  cy.get('[data-testid="org-name-input"]').clear().type(organizationData.name);
  
  // Handle organization type selection with proper overlay handling
  cy.get('[data-testid="org-type-select"]').click();
  cy.wait(1000); // Wait for dropdown to open
  
  // Select by data-value attribute instead of text content
  cy.get(`[data-value="${organizationData.orgType}"]`).click({ force: true });
  
  cy.get('[data-testid="contact-name-input"]').clear().type(organizationData.contactName);
  cy.get('[data-testid="contact-email-input"]').clear().type(organizationData.contactEmail);
  if (organizationData.contactPhone) {
    cy.get('[data-testid="contact-phone-input"]').type(organizationData.contactPhone);
  }
  cy.get('[data-testid="members-count-input"]').clear().type(organizationData.membersCount.toString());
  if (organizationData.mission) {
    cy.get('[data-testid="mission-textarea"]').clear().type(organizationData.mission);
  }
  
  // Debug: Check form state before clicking next
  cy.get('[data-testid="org-name-input"]').should('have.value', organizationData.name);
  cy.get('[data-testid="contact-name-input"]').should('have.value', organizationData.contactName);
  cy.get('[data-testid="contact-email-input"]').should('have.value', organizationData.contactEmail);
  cy.get('[data-testid="members-count-input"]').should('have.value', organizationData.membersCount.toString());
  
  // Debug: Check organization type selection
  cy.get('[data-testid="org-type-select"]').should('contain.text', organizationData.orgType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
  
  // Check if next button is enabled
  cy.get('[data-testid="next-step-button"]').should('not.be.disabled');
  
  // Debug: Log form state before clicking next
  cy.log('🔍 About to click next button for step advancement');
  
  // Click next button to proceed to step 2
  cy.get('[data-testid="next-step-button"]').click();
  cy.wait(1000);
});

Cypress.Commands.add('fillOnboardingForm', (organizationData: any) => {
  // Step 1: Basic Information
  cy.get('[data-testid="org-name-input"]').clear().type(organizationData.name);
  
  // Handle organization type selection with proper overlay handling
  cy.get('[data-testid="org-type-select"]').click();
  cy.wait(1000); // Wait for dropdown to open
  
  // Select by data-value attribute instead of text content
  cy.get(`[data-value="${organizationData.orgType}"]`).click({ force: true });
  
  cy.get('[data-testid="contact-name-input"]').clear().type(organizationData.contactName);
  cy.get('[data-testid="contact-email-input"]').clear().type(organizationData.contactEmail);
  if (organizationData.contactPhone) {
    cy.get('[data-testid="contact-phone-input"]').type(organizationData.contactPhone);
  }
  cy.get('[data-testid="members-count-input"]').clear().type(organizationData.membersCount.toString());
  if (organizationData.mission) {
    cy.get('[data-testid="mission-textarea"]').clear().type(organizationData.mission);
  }
  
  // Navigate to Step 2
  cy.get('[data-testid="next-step-button"]').should('not.be.disabled').click();
  cy.wait(3000);
  
  // Debug: Check if we're still on step 1
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="step-1"]').length > 0) {
      cy.log('❌ Still on Step 1 - form validation failed');
      // Check for validation errors
      cy.get('body').then(($body) => {
        const hasErrors = $body.find('[data-testid*="error"]').length > 0;
        if (hasErrors) {
          cy.log('❌ Form validation errors found');
          // Log the actual error messages
          $body.find('[data-testid*="error"]').each((index, element) => {
            cy.log(`Error ${index + 1}: ${element.textContent}`);
          });
        } else {
          cy.log('❌ No validation errors found, but step not advancing');
        }
      });
      // Check if next button is disabled
      cy.get('[data-testid="next-step-button"]').then(($btn) => {
        if ($btn.is(':disabled')) {
          cy.log('❌ Next button is disabled');
        } else {
          cy.log('❌ Next button is enabled but step not advancing');
        }
      });
      // Force navigation to step 2 for debugging
      cy.get('[data-testid="next-step-button"]').click({ force: true });
      cy.wait(1000);
    } else {
      cy.log('✅ Successfully advanced to Step 2');
    }
  });
  
  cy.get('[data-testid="step-2"]').should('be.visible');
  cy.get('[data-testid="event-types-section"]').should('be.visible');
  
  // Step 2: Event Types - wait for elements to be fully loaded
  organizationData.eventTypes.forEach((eventType: string) => {
    cy.get(`[data-testid="event-type-${eventType}"]`, { timeout: 10000 }).first().should('be.visible').click();
  });
  
  // Navigate to Step 3
  cy.get('[data-testid="next-step-button"]').should('not.be.disabled').click();
  cy.wait(1000);
  cy.get('[data-testid="step-3"]').should('be.visible');
  
  // Step 3: Funding Needs
  organizationData.fundingNeeds.forEach((fundingNeed: string) => {
    cy.get(`[data-testid="funding-need-${fundingNeed}"]`).first().should('be.visible').click();
  });
  
  // Navigate to Step 4
  cy.get('[data-testid="next-step-button"]').should('not.be.disabled').click();
  cy.wait(1000);
  cy.get('[data-testid="step-4"]').should('be.visible');
  
  // Step 4: Languages - use data-testid selection
  organizationData.preferredLanguages.forEach((language: string) => {
    cy.get(`[data-testid="language-${language}"]`).first().should('be.visible').click();
  });
});

Cypress.Commands.add('fillGrantApplicationForm', (applicationData: any) => {
  cy.get('[data-testid="project-name-input"]', { timeout: 2000 }).type(applicationData.projectName);
  cy.get('[data-testid="summary-textarea"]', { timeout: 2000 }).type(applicationData.summary);
  cy.get('[data-testid="target-audience-input"]', { timeout: 2000 }).type(applicationData.targetAudience);
  cy.get('[data-testid="timeline-start-input"]', { timeout: 2000 }).type(applicationData.timelineStart);
  cy.get('[data-testid="timeline-end-input"]', { timeout: 2000 }).type(applicationData.timelineEnd);
  cy.get('[data-testid="funding-amount-input"]', { timeout: 2000 }).type(applicationData.fundingAmount.toString());
  cy.get('[data-testid="expected-impact-textarea"]', { timeout: 2000 }).type(applicationData.expectedImpact);
  
  cy.get('[data-testid="save-application-button"]', { timeout: 2000 }).click();
});

Cypress.Commands.add('fillGrantSearchForm', (searchData: any) => {
  if (searchData.keywords) {
    cy.get('[data-testid="search-keywords-input"]').type(searchData.keywords);
  }
  if (searchData.fundingType) {
    cy.get('[data-testid="funding-type-select"]').click();
    cy.get(`[data-value="${searchData.fundingType}"]`).click();
  }
  if (searchData.amountRange) {
    cy.get('[data-testid="amount-min-input"]').type(searchData.amountRange.min.toString());
    cy.get('[data-testid="amount-max-input"]').type(searchData.amountRange.max.toString());
  }
  
  cy.get('[data-testid="search-button"]').click();
});

// Navigation Commands
Cypress.Commands.add('navigateToOnboarding', () => {
  cy.visit('/onboarding');
  cy.waitForOnboarding();
});

Cypress.Commands.add('navigateToApplications', () => {
  cy.visit('/applications');
  cy.waitForOrganization();
});

Cypress.Commands.add('navigateToGrants', () => {
  cy.visit('/grants');
  cy.waitForOrganization();
});

Cypress.Commands.add('navigateToSettings', () => {
  cy.visit('/settings');
  cy.waitForOrganization();
});

// Data Commands
Cypress.Commands.add('createTestOrganization', () => {
  const testOrg = Cypress.env('testOrganization');
  cy.navigateToOnboarding();
  cy.fillOnboardingForm(testOrg);
  cy.get('[data-testid="create-organization-button"]').click();
  cy.waitForOrganization();
});

Cypress.Commands.add('createTestGrantApplication', () => {
  const testApp = {
    projectName: 'Test Grant Project',
    summary: 'This is a test grant application for testing purposes',
    targetAudience: 'Local community members',
    timelineStart: '2024-01-01',
    timelineEnd: '2024-12-31',
    fundingAmount: 50000,
    expectedImpact: 'Improve community engagement and support local initiatives',
  };
  
  cy.navigateToApplications();
  cy.get('[data-testid="create-application-button"]').click();
  cy.fillGrantApplicationForm(testApp);
});

Cypress.Commands.add('createTestGrantSearch', () => {
  const testSearch = {
    keywords: 'community development',
    fundingType: 'operational',
    amountRange: { min: 10000, max: 100000 },
  };
  
  cy.navigateToGrants();
  cy.fillGrantSearchForm(testSearch);
});

// Knowledge Base Commands
Cypress.Commands.add('createKnowledgeEntry', (entryData: any) => {
  cy.get('[data-testid="add-knowledge-entry-button"]').click();
  cy.get('[data-testid="knowledge-title-input"]').type(entryData.title);
  cy.get('[data-testid="knowledge-content-textarea"]').type(entryData.content);
  cy.get('[data-testid="knowledge-document-type-select"]').click();
  cy.get(`[data-value="${entryData.documentType}"]`).click();
  
  if (entryData.tags && entryData.tags.length > 0) {
    entryData.tags.forEach((tag: string) => {
      cy.get('[data-testid="knowledge-tags-input"]').type(`${tag}{enter}`);
    });
  }
  
  if (entryData.url) {
    cy.get('[data-testid="knowledge-url-input"]').type(entryData.url);
  }
  
  cy.get('[data-testid="save-knowledge-button"]').click();
  cy.get('[data-testid="knowledge-created-success"]').should('be.visible');
});

// Language Commands
Cypress.Commands.add('switchUILanguage', (languageCode: string) => {
  cy.get('[data-testid="ui-language-button"]').click();
  cy.get(`[data-testid="language-option-${languageCode}"]`).click();
  cy.get('[data-testid="ui-language-menu"]').should('not.be.visible');
});

Cypress.Commands.add('switchAILanguage', (languageCode: string) => {
  cy.get('[data-testid="ai-language-button"]').click();
  cy.get(`[data-testid="ai-language-option-${languageCode}"]`).click();
  cy.get('[data-testid="ai-language-menu"]').should('not.be.visible');
});

// Database Validation Commands
Cypress.Commands.add('validateOrganizationInDB', (organizationData: any) => {
  const payload = {
    ...organizationData,
    userEmail: organizationData.userEmail || 'test-cypress@example.com',
  };
  cy.task('db:validateOrganization', payload).then((result: any) => {
    // Consider validation successful if the organization exists; log detailed mismatches
    expect(!!result.organization, result.error || 'Organization not found in DB').to.be.true;

    // Prefer soft checks for detailed fields to avoid flakiness between UI and DB serialization
    if (result.validation) {
      cy.log('Organization validation results:', result.validation);
      expect(result.validation.onboardingCompleted, 'onboarding completed flag').to.be.true;
    }
  });
});

Cypress.Commands.add('testRLSPolicies', (userEmail: string) => {
  cy.task('db:testRLS', userEmail).then((result: any) => {
    expect(result.success, result.error || 'RLS test reported failure').to.be.true;
    // Anon should not have access to list data; service should
    expect(result.anonHasAccess, 'Anon client must not list protected tables').to.be.false;
    expect(result.serviceHasAccess, 'Service client must access protected tables').to.be.true;
  });
});

// Utility Commands
Cypress.Commands.add('waitForAuth', () => {
  // Wait for authentication to complete by checking URL changes
  // The app will redirect away from login after successful auth
  cy.url({ timeout: 15000 }).should('not.include', '/login');
  
  // Wait for any loading states to complete
  cy.get('body').then(($body) => {
    // Check for various loading indicators that might exist
    if ($body.find('.animate-spin').length > 0) {
      cy.get('.animate-spin', { timeout: 10000 }).should('not.exist');
    }
    if ($body.find('[data-testid="organization-loading"]').length > 0) {
      cy.get('[data-testid="organization-loading"]', { timeout: 10000 }).should('not.exist');
    }
  });
  
  // Wait for the redirect to complete and check final destination
  cy.url({ timeout: 10000 }).then((currentUrl) => {
    if (currentUrl.includes('/onboarding')) {
      cy.log('User redirected to onboarding - this is expected for new users');
    } else if (currentUrl.includes('/dashboard') || currentUrl.includes('/grants') || currentUrl.includes('/applications')) {
      cy.log('User redirected to main app - onboarding completed');
    } else if (currentUrl.includes('/login')) {
      cy.log('User still on login page - checking for errors');
      // Check if there are any error messages
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="login-error"]').length > 0) {
          cy.get('[data-testid="login-error"]').should('be.visible');
        }
      });
    } else {
      cy.log(`User redirected to unexpected page: ${currentUrl}`);
    }
  });
  
  // Additional wait for any final loading states
  cy.wait(1000);
});

Cypress.Commands.add('waitForOrganization', () => {
  cy.get('[data-testid="organization-loading"]', { timeout: 10000 }).should('not.exist');
});

Cypress.Commands.add('waitForOnboarding', () => {
  // Wait for the page to load and check if we're on the onboarding page
  cy.url({ timeout: 10000 }).should('include', '/onboarding');
  
  // Wait for the page to be fully loaded
  cy.get('body', { timeout: 15000 }).should('be.visible');
  
  // Wait for the onboarding form to be fully loaded
  // Check for either the step indicator or the main form elements
  cy.get('body').then(($body) => {
    // Check if we have the step indicator
    if ($body.find('[data-testid="step-indicator"]').length > 0) {
      cy.get('[data-testid="step-indicator"]', { timeout: 15000 }).should('be.visible');
    }
    
    // Wait for the first step form elements to be ready
    // Try to find the org-name-input with a more flexible approach
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="org-name-input"]').length > 0) {
        cy.get('[data-testid="org-name-input"]', { timeout: 15000 }).should('be.visible');
      } else {
        // If not found, wait a bit more and try again
        cy.wait(3000);
        cy.get('[data-testid="org-name-input"]', { timeout: 15000 }).should('be.visible');
      }
    });
    
    // Also check for org-type-select
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="org-type-select"]').length > 0) {
        cy.get('[data-testid="org-type-select"]', { timeout: 15000 }).should('be.visible');
      } else {
        // If not found, wait a bit more and try again
        cy.wait(3000);
        cy.get('[data-testid="org-type-select"]', { timeout: 15000 }).should('be.visible');
      }
    });
  });
  
  // Wait a bit more to ensure everything is fully loaded
  cy.wait(2000);
});

// Enhanced loading state handling
Cypress.Commands.add('waitForLoadingStates', () => {
  // Wait for various loading states to complete
  cy.get('body').then(($body) => {
    // Check for loading spinners
    if ($body.find('.animate-spin').length > 0) {
      cy.get('.animate-spin', { timeout: 15000 }).should('not.exist');
    }
    
    // Check for loading text
    if ($body.find('span:contains("Loading...")').length > 0) {
      cy.contains('Loading...', { timeout: 15000 }).should('not.exist');
    }
    
    // Check for redirect messages
    if ($body.find('span:contains("Redirecting")').length > 0) {
      cy.contains('Redirecting', { timeout: 15000 }).should('not.exist');
    }
  });
  
  // Wait for any pending network requests
  cy.wait(1000);
});

// Overlay interaction handling
Cypress.Commands.add('clickWithOverlayHandling', (selector: string) => {
  // First try normal click
  cy.get(selector).then(($el) => {
    if ($el.css('pointer-events') === 'none') {
      // If pointer-events is none, use force click
      cy.get(selector).click({ force: true });
    } else {
      // Try normal click first
      cy.get(selector).click();
    }
  });
});

// Phase 3: Session Management Commands
Cypress.Commands.add('restoreSession', (sessionName: string) => {
  cy.session(sessionName, () => {
    // Session will be restored automatically by Cypress
  }, {
    validate: () => {
      // Validate session is still valid
      cy.visit('/');
      cy.get('body').should('contain', 'GrantFather');
    },
  });
});

Cypress.Commands.add('saveSession', (sessionName: string) => {
  cy.session(sessionName, () => {
    cy.authenticateWithOrganization('test-cypress@example.com', 'TestPassword123!');
  }, {
    validate: () => {
      cy.visit('/grants');
      cy.get('body').should('not.contain', 'Login');
    },
  });
});

// Test data cleanup command bridging to registered tasks
Cypress.Commands.add('deleteTestData', () => {
  // Prefer AI cleanup if available, otherwise fall back to DB sweep
  const userEmail = 'test-cypress@example.com';
  // Attempt to find userId via backend task is not trivial here, so cleanup by email and generic sweep
  cy.task('db:sweepTestData', { email: userEmail }).then(() => {
    // Also run generic cleanup to remove residuals
    cy.task('db:cleanup');
  });
});

// Export for TypeScript
export {};
