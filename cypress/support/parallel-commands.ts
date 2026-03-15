// Parallel testing specific commands and utilities

declare global {
  namespace Cypress {
    interface Chainable {
      // Parallel test setup commands
      setupParallelTest(testGroup: string): Chainable<void>;
      cleanupParallelTest(testGroup: string): Chainable<void>;
      
      // Performance monitoring commands
      measurePerformance(operation: string): Chainable<number>;
      checkMemoryUsage(): Chainable<{ used: number; total: number }>;
      
      // Advanced authentication for parallel tests
      parallelLogin(userType: 'regular' | 'admin' | 'superadmin'): Chainable<void>;
      ensureTestIsolation(): Chainable<void>;
      
      // Test data management
      createIsolatedTestData(dataType: string, options?: any): Chainable<any>;
      validateTestDataIntegrity(): Chainable<boolean>;
    }
  }
}

// Setup parallel test environment
Cypress.Commands.add('setupParallelTest', (testGroup: string) => {
  cy.log(`🔧 Setting up parallel test for group: ${testGroup}`);
  
  // Clear any existing state
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set unique session identifiers to prevent cross-test interference
  const sessionId = `${testGroup}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  cy.window().then((win) => {
    win.sessionStorage.setItem('cypress-test-session', sessionId);
  });
  
  // Initialize test-specific database state
  cy.task('db:seedEnhanced').then((result: any) => {
    if (!result.success) {
      throw new Error(`Failed to seed database for ${testGroup}: ${result.error}`);
    }
    cy.log(`✅ Database seeded for ${testGroup}`);
  });
});

// Cleanup after parallel test
Cypress.Commands.add('cleanupParallelTest', (testGroup: string) => {
  cy.log(`🧹 Cleaning up parallel test for group: ${testGroup}`);
  
  // Get session ID and clean up associated data
  cy.window().then((win) => {
    const sessionId = win.sessionStorage.getItem('cypress-test-session');
    if (sessionId) {
      cy.log(`Cleaning up session: ${sessionId}`);
    }
  });
  
  // Note: Full cleanup is handled by the global cleanup in e2e.ts
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Performance measurement
Cypress.Commands.add('measurePerformance', (operation: string) => {
  const startTime = performance.now();
  
  return cy.wrap(null).then(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    cy.log(`⏱️ Performance: ${operation} took ${duration.toFixed(2)}ms`);
    return duration;
  });
});

// Memory usage monitoring
Cypress.Commands.add('checkMemoryUsage', () => {
  return cy.window().then((win) => {
    if ('performance' in win && 'memory' in win.performance) {
      const memory = (win.performance as any).memory;
      const memoryInfo = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) // MB
      };
      cy.log(`💾 Memory Usage: ${memoryInfo.used}MB / ${memoryInfo.total}MB`);
      return memoryInfo;
    } else {
      cy.log('⚠️ Memory API not available in this browser');
      return { used: 0, total: 0 };
    }
  });
});

// Parallel-safe login with user type
Cypress.Commands.add('parallelLogin', (userType: 'regular' | 'admin' | 'superadmin' = 'regular') => {
  // Create or get test user for this type
  cy.createTestUser(userType).then((userData: any) => {
    cy.login(userData.email, userData.password);
    
    // Store user info for cleanup
    cy.window().then((win) => {
      win.sessionStorage.setItem('cypress-test-user', JSON.stringify(userData));
    });
  });
});

// Ensure test isolation between parallel runs
Cypress.Commands.add('ensureTestIsolation', () => {
  // Check for any lingering state from other tests
  cy.window().then((win) => {
    // Clear any cached authentication state
    delete (win as any).supabaseClient;
    
    // Clear React Query cache if it exists
    if ((win as any).queryClient) {
      (win as any).queryClient.clear();
    }
    
    // Force a clean slate
    cy.reload();
    cy.wait(1000); // Allow app to reinitialize
  });
});

// Create isolated test data
Cypress.Commands.add('createIsolatedTestData', (dataType: string, options: any = {}) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  switch (dataType) {
    case 'user':
      return cy.createTestUser(options.userType || 'regular');
      
    case 'organization':
      const orgData = {
        name: `Test Org ${timestamp}-${randomId}`,
        orgType: options.orgType || 'nonprofit',
        contactName: `Test Contact ${timestamp}`,
        contactEmail: `contact-${timestamp}@example.com`,
        membersCount: options.membersCount || 5,
        mission: `Test mission ${timestamp}`,
        eventTypes: options.eventTypes || ['community', 'education'],
        fundingNeeds: options.fundingNeeds || ['operational', 'program'],
        preferredLanguages: options.preferredLanguages || ['Norwegian', 'English'],
        ...options
      };
      return cy.wrap(orgData);
      
    case 'application':
      const appData = {
        projectName: `Test Project ${timestamp}-${randomId}`,
        summary: `Test application summary ${timestamp}`,
        fundingAmount: options.fundingAmount || 50000,
        targetAudience: 'Test audience',
        timelineStart: '2024-01-01',
        timelineEnd: '2024-12-31',
        expectedImpact: 'Test impact description',
        ...options
      };
      return cy.wrap(appData);
      
    default:
      throw new Error(`Unknown data type: ${dataType}`);
  }
});

// Validate test data integrity
Cypress.Commands.add('validateTestDataIntegrity', () => {
  return cy.window().then((win) => {
    const testUser = win.sessionStorage.getItem('cypress-test-user');
    if (!testUser) {
      cy.log('⚠️ No test user found in session');
      return false;
    }
    
    const userData = JSON.parse(testUser);
    return cy.task('db:checkUserState', userData.email).then((result: any) => {
      if (!result.userExists) {
        cy.log('❌ Test user integrity compromised - user does not exist');
        return false;
      }
      
      cy.log('✅ Test data integrity validated');
      return true;
    });
  });
});

export {};