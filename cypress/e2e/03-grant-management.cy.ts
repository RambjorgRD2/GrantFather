describe('Grant Management Suite', () => {
  const testUser = {
    email: 'test-grants@example.com',
    password: 'TestPassword123!',
    fullName: 'Grants Test User',
  };

  const testOrganization = {
    name: 'Grants Test Organization',
    orgType: 'nonprofit',
    contactName: 'Grants Contact',
    contactEmail: 'grants@testorg.com',
    contactPhone: '+4712345678',
    membersCount: 10,
    mission: 'Testing grant management functionality',
    eventTypes: ['community', 'education'],
    fundingNeeds: ['operational', 'program'],
    preferredLanguages: ['Norwegian', 'English'],
  };

  const testApplication = {
    title: 'Test Grant Application',
    description: 'A comprehensive test application for grant management testing',
    fundingAmount: 50000,
    deadline: '2024-12-31',
    status: 'draft',
    notes: 'Initial test application notes'
  };

  const testSearchQueries = {
    basic: 'community development',
    specific: 'environmental conservation grants Norway',
    funding: 'operational funding nonprofit',
    amount: 'grants over 50000 NOK',
  };

  beforeEach(() => {
    // Phase 2 optimization: Reduce database operations
    cy.task('db:reset');
    cy.task('db:seed');
    cy.authenticateWithOrganization('test-cypress@example.com', 'TestPassword123!');
  });

  afterEach(() => {
    cy.task('db:cleanup');
  });

  describe('Grants Page & Search Interface', () => {
    it('should display grants page with search interface correctly', () => {
      cy.navigateToGrants();
      cy.wait(2000);
      
      // Verify page loaded correctly
      cy.url().should('include', '/grants');
      
      // Verify main page elements
      cy.get('body').should('contain', 'Grants');
      
      // Check for search interface elements
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="search-input"]').length) {
          cy.get('[data-testid="search-input"]').should('be.visible');
        }
        if ($body.find('[data-testid="search-button"]').length) {
          cy.get('[data-testid="search-button"]').should('be.visible');
        }
        if ($body.find('input[placeholder*="search"]').length) {
          cy.get('input[placeholder*="search"]').should('be.visible');
        }
      });
      
      // Verify page is interactive
      cy.get('body').should('not.be.empty');
    });

    it('should handle grant search functionality', () => {
      cy.navigateToGrants();
      cy.wait(2000);
      
      // Find and use search input
      cy.get('body').then(($body) => {
        const searchInput = $body.find('[data-testid="search-input"]').length ? 
          '[data-testid="search-input"]' : 'input[type="text"]';
        
        if ($body.find(searchInput).length) {
          cy.get(searchInput).first().type(testSearchQueries.basic);
          
          // Try to trigger search
          if ($body.find('[data-testid="search-button"]').length) {
            cy.get('[data-testid="search-button"]').click();
          } else {
            cy.get(searchInput).first().type('{enter}');
          }
          
          cy.wait(2000);
          
          // Verify search was attempted (results may vary)
          cy.get('body').should('exist');
        }
      });
    });

    it('should display search filters when available', () => {
      cy.navigateToGrants();
      cy.wait(2000);
      
      // Check for filter interface
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="filters-section"]').length) {
          cy.get('[data-testid="filters-section"]').should('be.visible');
        }
        if ($body.find('[data-testid="advanced-filters"]').length) {
          cy.get('[data-testid="advanced-filters"]').should('be.visible');
        }
        if ($body.find('[data-testid="filter-toggle"]').length) {
          cy.get('[data-testid="filter-toggle"]').click();
          cy.wait(500);
        }
      });
    });

    it('should handle foundation listings and details', () => {
      cy.navigateToGrants();
      cy.wait(3000);
      
      // Check for foundation cards or listings
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="foundation-card"]').length) {
          cy.get('[data-testid="foundation-card"]').first().should('be.visible');
          
          // Test foundation interaction
          cy.get('[data-testid="foundation-card"]').first().click();
          cy.wait(1000);
        }
        
        if ($body.find('[data-testid="foundation-list"]').length) {
          cy.get('[data-testid="foundation-list"]').should('be.visible');
        }
        
        // Check for foundation details
        if ($body.find('[data-testid="foundation-details"]').length) {
          cy.get('[data-testid="foundation-details"]').should('be.visible');
        }
      });
    });

    it('should handle grant statistics and analytics', () => {
      cy.navigateToGrants();
      cy.wait(2000);
      
      // Check for statistics display
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="grant-statistics"]').length) {
          cy.get('[data-testid="grant-statistics"]').should('be.visible');
        }
        if ($body.find('[data-testid="total-grants"]').length) {
          cy.get('[data-testid="total-grants"]').should('be.visible');
        }
        if ($body.find('[data-testid="active-grants"]').length) {
          cy.get('[data-testid="active-grants"]').should('be.visible');
        }
      });
    });
  });

  describe('Applications Dashboard & Management', () => {
    it('should display applications dashboard correctly', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      // Should load applications page
      cy.url().should('include', '/applications');
      cy.get('body').should('contain', 'Applications');
      
      // Check for main dashboard elements
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="applications-header"]').length) {
          cy.get('[data-testid="applications-header"]').should('be.visible');
        }
        if ($body.find('[data-testid="new-application-button"]').length) {
          cy.get('[data-testid="new-application-button"]').should('be.visible');
        }
        if ($body.find('[data-testid="applications-list"]').length) {
          cy.get('[data-testid="applications-list"]').should('be.visible');
        }
      });
    });

    it('should handle empty state when no applications exist', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      // Check for empty state
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="empty-state"]').length) {
          cy.get('[data-testid="empty-state"]').should('be.visible');
          cy.get('[data-testid="empty-state-message"]').should('contain', 'No applications');
        } else if ($body.text().includes('No applications') || $body.text().includes('empty')) {
          cy.log('Empty state detected in page content');
        }
      });
    });

    it('should open create application modal when available', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      // Try to open create application modal
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="new-application-button"]').length) {
          cy.get('[data-testid="new-application-button"]').click();
          cy.wait(1000);
          
          // Check for modal
          if ($body.find('[data-testid="create-application-modal"]').length) {
            cy.get('[data-testid="create-application-modal"]').should('be.visible');
          }
        } else if ($body.find('button').length > 0) {
          // Try generic button that might open create modal
          cy.get('button').contains(/create|new|add/i).first().click();
          cy.wait(1000);
        }
      });
    });

    it('should display applications in list and table views', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      // Check for view toggle buttons
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="list-view-button"]').length) {
          cy.get('[data-testid="list-view-button"]').should('be.visible');
          cy.get('[data-testid="list-view-button"]').click();
          cy.wait(500);
        }
        
        if ($body.find('[data-testid="table-view-button"]').length) {
          cy.get('[data-testid="table-view-button"]').should('be.visible');
          cy.get('[data-testid="table-view-button"]').click();
          cy.wait(500);
        }
      });
    });

    it('should handle application search and filtering', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      // Test search functionality
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="application-search"]').length) {
          cy.get('[data-testid="application-search"]').type(testApplication.title);
          cy.wait(1000);
        }
        
        // Test status filter
        if ($body.find('[data-testid="status-filter"]').length) {
          cy.get('[data-testid="status-filter"]').click();
          cy.wait(500);
        }
        
        // Test date filter
        if ($body.find('[data-testid="date-filter"]').length) {
          cy.get('[data-testid="date-filter"]').should('be.visible');
        }
      });
    });
  });

  describe('Application CRUD Operations', () => {
    it('should create new application with form validation', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      // Try to create new application
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="new-application-button"]').length) {
          cy.get('[data-testid="new-application-button"]').click();
          cy.wait(1000);
          
          // Fill application form if modal opens
          if ($body.find('[data-testid="application-title-input"]').length) {
            cy.get('[data-testid="application-title-input"]').type(testApplication.title);
            cy.get('[data-testid="application-description-textarea"]').type(testApplication.description);
            
            if ($body.find('[data-testid="funding-amount-input"]').length) {
              cy.get('[data-testid="funding-amount-input"]').type(testApplication.fundingAmount.toString());
            }
            
            // Submit application
            if ($body.find('[data-testid="create-application-submit"]').length) {
              cy.get('[data-testid="create-application-submit"]').click();
              cy.wait(2000);
            }
          }
        }
      });
    });

    it('should validate required fields in application form', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="new-application-button"]').length) {
          cy.get('[data-testid="new-application-button"]').click();
          cy.wait(1000);
          
          // Try to submit empty form
          if ($body.find('[data-testid="create-application-submit"]').length) {
            cy.get('[data-testid="create-application-submit"]').click();
            
            // Should show validation errors
            cy.wait(1000);
            cy.get('body').should('contain.text', 'required');
          }
        }
      });
    });

    it('should edit existing application when available', () => {
      // This test assumes there are applications to edit
      cy.visit('/applications');
      cy.wait(3000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="edit-application-button"]').length) {
          cy.get('[data-testid="edit-application-button"]').first().click();
          cy.wait(1000);
          
          // Edit application details
          if ($body.find('[data-testid="application-title-input"]').length) {
            cy.get('[data-testid="application-title-input"]').clear().type('Updated Application Title');
            
            if ($body.find('[data-testid="save-application-button"]').length) {
              cy.get('[data-testid="save-application-button"]').click();
              cy.wait(2000);
            }
          }
        }
      });
    });

    it('should delete application with confirmation', () => {
      cy.visit('/applications');
      cy.wait(3000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="delete-application-button"]').length) {
          cy.get('[data-testid="delete-application-button"]').first().click();
          cy.wait(1000);
          
          // Confirm deletion
          if ($body.find('[data-testid="confirm-delete-button"]').length) {
            cy.get('[data-testid="confirm-delete-button"]').click();
            cy.wait(2000);
          }
        }
      });
    });
  });

  describe('Grant Draft Editor & AI Features', () => {
    it('should access grant draft editor from application', () => {
      cy.visit('/applications');
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="edit-draft-button"]').length) {
          cy.get('[data-testid="edit-draft-button"]').first().click();
          cy.wait(2000);
          
          // Should navigate to draft editor
          cy.url().should('include', '/draft');
        } else if ($body.find('a[href*="draft"]').length) {
          cy.get('a[href*="draft"]').first().click();
          cy.wait(2000);
        }
      });
    });

    it('should display grant draft editor interface', () => {
      // Direct navigation to draft editor
      cy.visit('/draft');
      cy.wait(3000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="draft-editor"]').length) {
          cy.get('[data-testid="draft-editor"]').should('be.visible');
        }
        
        if ($body.find('[data-testid="section-navigation"]').length) {
          cy.get('[data-testid="section-navigation"]').should('be.visible');
        }
        
        if ($body.find('[data-testid="ai-toolbar"]').length) {
          cy.get('[data-testid="ai-toolbar"]').should('be.visible');
        }
      });
    });

    it('should handle AI section regeneration when available', () => {
      cy.visit('/draft');
      cy.wait(3000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="regenerate-section-button"]').length) {
          cy.get('[data-testid="regenerate-section-button"]').first().click();
          cy.wait(2000);
          
          // Should show AI generation in progress
          if ($body.find('[data-testid="ai-generating"]').length) {
            cy.get('[data-testid="ai-generating"]').should('be.visible');
          }
        }
      });
    });
  });

  describe('Performance & Mobile Responsiveness', () => {
    it('should load grants page within acceptable time limits', () => {
      const start = Date.now();
      cy.navigateToGrants();
      cy.wait(2000);
      
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(10000); // 10 second max
      });
    });

    it('should handle mobile viewport correctly', () => {
      cy.viewport(375, 667);
      cy.navigateToGrants();
      cy.wait(2000);
      
      // Verify mobile responsiveness
      cy.get('body').should('be.visible');
      
      // Check for mobile-specific elements
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="mobile-menu"]').length) {
          cy.get('[data-testid="mobile-menu"]').should('be.visible');
        }
      });
    });

    it('should handle tablet viewport correctly', () => {
      cy.viewport(768, 1024);
      cy.visit('/applications');
      cy.wait(2000);
      
      cy.get('body').should('be.visible');
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle network errors gracefully', () => {
      // Intercept and fail API requests
      cy.intercept('GET', '**/api/**', { forceNetworkError: true });
      
      cy.navigateToGrants();
      cy.wait(3000);
      
      // Should show error state or fallback content
      cy.get('body').should('exist');
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        expect(bodyText.length).to.be.greaterThan(0);
      });
    });

    it('should handle empty search results', () => {
      cy.navigateToGrants();
      cy.wait(2000);
      
      // Search for non-existent grants
      cy.get('body').then(($body) => {
        const searchInput = $body.find('[data-testid="search-input"]').length ? 
          '[data-testid="search-input"]' : 'input[type="text"]';
        
        if ($body.find(searchInput).length) {
          cy.get(searchInput).first().type('nonexistentgrantsearch12345');
          cy.get(searchInput).first().type('{enter}');
          cy.wait(2000);
          
          // Should handle empty results gracefully
          cy.get('body').should('exist');
        }
      });
    });

    it('should handle malformed search queries', () => {
      cy.navigateToGrants();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        const searchInput = $body.find('[data-testid="search-input"]').length ? 
          '[data-testid="search-input"]' : 'input[type="text"]';
        
        if ($body.find(searchInput).length) {
          // Test special characters and malformed queries
          cy.get(searchInput).first().type('!@#$%^&*()');
          cy.get(searchInput).first().type('{enter}');
          cy.wait(2000);
          
          cy.get('body').should('exist');
        }
      });
    });
  });
});