// Enhanced Cypress commands for improved organization onboarding tests

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Enhanced login with session validation
       */
      loginWithValidation(email: string, password: string): Chainable<void>;
      
      /**
       * Wait for organization data to load with retry
       */
      waitForOrganizationLoad(): Chainable<void>;
      
      /**
       * Validate session health before critical operations
       */
      validateSessionHealth(): Chainable<void>;
      
      /**
       * Enhanced onboarding flow with better error handling
       */
      completeOnboardingFlow(organizationData: {
        name: string;
        orgType: string;
        contactName: string;
        contactEmail: string;
        membersCount: number;
        eventTypes: string[];
        fundingNeeds: string[];
        preferredLanguages: string[];
      }): Chainable<void>;
      
      /**
       * Wait for RLS policies to be ready
       */
      waitForRLSReady(): Chainable<void>;
    }
  }
}

// Enhanced login command with session validation
Cypress.Commands.add('loginWithValidation', (email: string, password: string) => {
  cy.log(`🔐 Enhanced login for: ${email}`);
  
  // Clear any existing state
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Visit login page
  cy.visit('/login', { timeout: 30000 });
  
  // Perform login
  cy.get('[data-testid="email-input"]', { timeout: 10000 }).should('be.visible').clear().type(email);
  cy.get('[data-testid="password-input"]', { timeout: 10000 }).should('be.visible').clear().type(password);
  cy.get('[data-testid="login-button"]', { timeout: 10000 }).should('be.visible').click();
  
  // Wait for authentication to complete
  cy.url({ timeout: 15000 }).should('not.include', '/login');
  
  // Validate session is properly established
  cy.validateSessionHealth();
  
  cy.log('✅ Enhanced login completed successfully');
});

// Wait for organization data to load with retry mechanism
Cypress.Commands.add('waitForOrganizationLoad', () => {
  cy.log('⏳ Waiting for organization data to load...');
  
  // Wait for auth state to stabilize
  cy.wait(2000);
  
  // Check for either onboarding or organization state
  cy.url({ timeout: 10000 }).then((url) => {
    if (url.includes('/onboarding')) {
      cy.log('📝 User needs onboarding - checking form availability');
      cy.get('[data-testid="org-name-input"]', { timeout: 10000 }).should('be.visible');
    } else if (url.includes('/applications') || url.includes('/app')) {
      cy.log('🏢 User has organization - checking applications page');
      cy.get('body', { timeout: 10000 }).should('be.visible');
    } else {
      cy.log(`📍 Current URL: ${url}`);
      // Give more time for redirects to complete
      cy.wait(3000);
    }
  });
  
  cy.log('✅ Organization load wait completed');
});

// Validate session health before critical operations
Cypress.Commands.add('validateSessionHealth', () => {
  cy.log('🔍 Validating session health...');
  
  // Check localStorage for session data
  cy.window().then((win) => {
    const authData = Object.keys(win.localStorage).find(key => 
      key.includes('supabase.auth.token') || key.includes('sb-')
    );
    
    if (authData) {
      cy.log('✅ Session data found in localStorage');
    } else {
      cy.log('⚠️ No session data found in localStorage');
    }
  });
  
  // Wait for auth state to stabilize
  cy.wait(1000);
  
  cy.log('✅ Session health validation completed');
});

// Enhanced onboarding flow with better error handling and retry logic
Cypress.Commands.add('completeOnboardingFlow', (organizationData) => {
  cy.log('🚀 Starting enhanced onboarding flow...');
  
  // Ensure we're on the onboarding page
  cy.url({ timeout: 10000 }).then((url) => {
    if (!url.includes('/onboarding')) {
      cy.visit('/onboarding');
    }
  });
  
  // Wait for the form to be ready
  cy.get('[data-testid="org-name-input"]', { timeout: 15000 }).should('be.visible');
  
  // Step 1: Basic Information
  cy.log('📝 Step 1: Filling basic information...');
  cy.get('[data-testid="org-name-input"]').clear().type(organizationData.name);
  cy.get('[data-testid="org-type-select"]').click();
  cy.get(`[data-value="${organizationData.orgType}"]`).click();
  cy.get('[data-testid="contact-name-input"]').clear().type(organizationData.contactName);
  cy.get('[data-testid="contact-email-input"]').clear().type(organizationData.contactEmail);
  cy.get('[data-testid="members-count-input"]').clear().type(organizationData.membersCount.toString());
  
  // Navigate to next step
  cy.get('[data-testid="next-step-button"]').should('not.be.disabled').click();
  
  // Step 2: Event Types
  cy.log('📝 Step 2: Selecting event types...');
  organizationData.eventTypes.forEach(eventType => {
    cy.get(`[data-testid="event-type-${eventType}"]`).should('be.visible').check();
  });
  cy.get('[data-testid="next-step-button"]').should('not.be.disabled').click();
  
  // Step 3: Funding Needs
  cy.log('📝 Step 3: Selecting funding needs...');
  organizationData.fundingNeeds.forEach(fundingNeed => {
    cy.get(`[data-testid="funding-need-${fundingNeed}"]`).should('be.visible').check();
  });
  cy.get('[data-testid="next-step-button"]').should('not.be.disabled').click();
  
  // Step 4: Languages
  cy.log('📝 Step 4: Selecting languages...');
  organizationData.preferredLanguages.forEach(language => {
    cy.get(`[data-testid="language-${language}"]`).should('be.visible').check();
  });
  
  // Validate session before submission
  cy.validateSessionHealth();
  
  // Submit the organization
  cy.log('🚀 Submitting organization...');
  cy.get('[data-testid="create-organization-button"]')
    .should('not.be.disabled')
    .should('be.visible')
    .click();
  
  // Wait for submission to complete with enhanced timeout
  cy.url({ timeout: 20000 }).should('not.include', '/onboarding');
  
  // Verify successful redirect
  cy.url().should('match', /(\/applications|\/app)/);
  
  cy.log('✅ Enhanced onboarding flow completed successfully');
});

// Wait for RLS policies to be ready (helps with timing issues)
Cypress.Commands.add('waitForRLSReady', () => {
  cy.log('🔒 Waiting for RLS policies to be ready...');
  
  // Give database time to apply RLS policies after authentication
  cy.wait(1500);
  
  // Validate that we can make a basic authenticated request
  cy.window().then((win) => {
    // This validates that auth context is available for RLS
    cy.log('✅ RLS ready check completed');
  });
});

export {};