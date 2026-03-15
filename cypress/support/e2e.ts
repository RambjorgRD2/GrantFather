// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';
import './enhanced-commands';
import './parallel-commands';
import './ai-commands';
import 'cypress-plugin-tab';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global test setup
beforeEach(() => {
  // Clear any existing data
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Reset database state if needed
  // cy.task('db:reset');
});

// Global test teardown
afterEach(() => {
  // Clean up any test data
  // cy.task('db:cleanup');
});

// Global after hook for comprehensive test data cleanup
after(() => {
  cy.log('🧹 Performing global test data cleanup...');
  cy.task('db:sweepAllTestData').then((result: any) => {
    if (result.success) {
      cy.log('✅ Global test data cleanup completed');
      cy.log(`🗑️ Cleaned up ${result.usersDeleted} test users and all related data`);
    } else {
      cy.log('❌ Global test data cleanup failed:', result.error);
    }
  });
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // for uncaught exceptions that are expected in the application
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection')) {
    return false;
  }
  return true;
});
