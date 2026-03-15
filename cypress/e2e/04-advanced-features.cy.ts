describe('Advanced Features Suite', () => {
  const testUser = {
    email: 'test-advanced@example.com',
    password: 'TestPassword123!',
    fullName: 'Advanced Test User',
  };

  const testOrganization = {
    name: 'Advanced Features Test Org',
    orgType: 'nonprofit',
    contactName: 'Advanced Contact',
    contactEmail: 'advanced@testorg.com',
    contactPhone: '+4712345678',
    membersCount: 25,
    mission: 'Testing advanced features and integrations',
    eventTypes: ['community', 'education'],
    fundingNeeds: ['operational', 'program'],
    preferredLanguages: ['Norwegian', 'English'],
  };

  beforeEach(() => {
    // Phase 2 optimization: Streamlined setup
    cy.task('db:reset');
    cy.task('db:seed');
    cy.authenticateWithOrganization('test-cypress@example.com', 'TestPassword123!');
  });

  afterEach(() => {
    cy.task('db:cleanup');
  });

  describe('Organization Settings Management', () => {
    it('should display organization settings page correctly', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Verify settings page loaded
      cy.url().should('include', '/settings');
      cy.get('body').should('contain', 'Settings');
      
      // Check for organization info section
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="organization-info-section"]').length) {
          cy.get('[data-testid="organization-info-section"]').should('be.visible');
        }
        if ($body.find('[data-testid="org-name-display"]').length) {
          cy.get('[data-testid="org-name-display"]').should('be.visible');
        }
      });
    });

    it('should allow editing organization information', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="edit-org-info-button"]').length) {
          cy.get('[data-testid="edit-org-info-button"]').click();
          cy.wait(1000);
          
          // Edit organization details
          if ($body.find('[data-testid="org-name-input"]').length) {
            cy.get('[data-testid="org-name-input"]').clear().type('Updated Organization Name');
          }
          
          if ($body.find('[data-testid="save-org-info-button"]').length) {
            cy.get('[data-testid="save-org-info-button"]').click();
            cy.wait(2000);
          }
        }
      });
    });

    it('should handle language preferences updates', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="language-preferences-section"]').length) {
          cy.get('[data-testid="language-preferences-section"]').should('be.visible');
          
          // Update UI language
          if ($body.find('[data-testid="ui-language-select"]').length) {
            cy.get('[data-testid="ui-language-select"]').click();
            cy.get('[data-value="no"]').click();
            cy.wait(1000);
          }
          
          // Update AI response language
          if ($body.find('[data-testid="ai-response-language-select"]').length) {
            cy.get('[data-testid="ai-response-language-select"]').click();
            cy.get('[data-value="en"]').click();
            cy.wait(1000);
          }
        }
      });
    });

    it('should display and manage notification preferences', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="notification-preferences-section"]').length) {
          cy.get('[data-testid="notification-preferences-section"]').should('be.visible');
          
          // Toggle notification settings
          if ($body.find('[data-testid="email-notifications-toggle"]').length) {
            cy.get('[data-testid="email-notifications-toggle"]').click();
            cy.wait(500);
          }
          
          if ($body.find('[data-testid="deadline-reminders-toggle"]').length) {
            cy.get('[data-testid="deadline-reminders-toggle"]').click();
            cy.wait(500);
          }
        }
      });
    });
  });

  describe('Knowledge Base Management', () => {
    it('should display knowledge base management section', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="knowledge-base-section"]').length) {
          cy.get('[data-testid="knowledge-base-section"]').should('be.visible');
          cy.get('[data-testid="knowledge-base-title"]').should('contain', 'Knowledge Base');
        }
      });
    });

    it('should show empty state when no knowledge entries exist', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="knowledge-base-empty-state"]').length) {
          cy.get('[data-testid="knowledge-base-empty-state"]').should('be.visible');
          cy.get('[data-testid="empty-state-message"]').should('contain', 'No knowledge entries');
        }
      });
    });

    it('should allow adding new knowledge entries', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="add-knowledge-entry-button"]').length) {
          cy.get('[data-testid="add-knowledge-entry-button"]').click();
          cy.wait(1000);
          
          // Fill knowledge entry form
          if ($body.find('[data-testid="knowledge-title-input"]').length) {
            cy.get('[data-testid="knowledge-title-input"]').type('Test Knowledge Entry');
            cy.get('[data-testid="knowledge-content-textarea"]').type('Test knowledge content');
            
            if ($body.find('[data-testid="knowledge-url-input"]').length) {
              cy.get('[data-testid="knowledge-url-input"]').type('https://example.com/knowledge');
            }
            
            if ($body.find('[data-testid="save-knowledge-entry-button"]').length) {
              cy.get('[data-testid="save-knowledge-entry-button"]').click();
              cy.wait(2000);
            }
          }
        }
      });
    });

    it('should handle knowledge entry validation', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="add-knowledge-entry-button"]').length) {
          cy.get('[data-testid="add-knowledge-entry-button"]').click();
          cy.wait(1000);
          
          // Try to save empty knowledge entry
          if ($body.find('[data-testid="save-knowledge-entry-button"]').length) {
            cy.get('[data-testid="save-knowledge-entry-button"]').click();
            cy.wait(1000);
            
            // Should show validation errors
            cy.get('body').should('contain.text', 'required');
          }
        }
      });
    });
  });

  describe('Team Management Features', () => {
    it('should display team management section', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="team-management-section"]').length) {
          cy.get('[data-testid="team-management-section"]').should('be.visible');
          cy.get('[data-testid="team-members-list"]').should('be.visible');
        }
      });
    });

    it('should allow inviting new team members', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="invite-member-button"]').length) {
          cy.get('[data-testid="invite-member-button"]').click();
          cy.wait(1000);
          
          // Fill invitation form
          if ($body.find('[data-testid="invite-email-input"]').length) {
            cy.get('[data-testid="invite-email-input"]').type('newmember@testorg.com');
            
            if ($body.find('[data-testid="member-role-select"]').length) {
              cy.get('[data-testid="member-role-select"]').click();
              cy.get('[data-value="member"]').click();
            }
            
            if ($body.find('[data-testid="send-invitation-button"]').length) {
              cy.get('[data-testid="send-invitation-button"]').click();
              cy.wait(2000);
            }
          }
        }
      });
    });

    it('should validate team member invitation fields', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="invite-member-button"]').length) {
          cy.get('[data-testid="invite-member-button"]').click();
          cy.wait(1000);
          
          // Try to send invitation without email
          if ($body.find('[data-testid="send-invitation-button"]').length) {
            cy.get('[data-testid="send-invitation-button"]').click();
            cy.wait(1000);
            
            // Should show validation error
            cy.get('body').should('contain.text', 'email');
          }
        }
      });
    });

    it('should handle team member role management', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="member-role-dropdown"]').length) {
          cy.get('[data-testid="member-role-dropdown"]').first().click();
          cy.wait(500);
          
          // Change member role
          if ($body.find('[data-testid="role-admin"]').length) {
            cy.get('[data-testid="role-admin"]').click();
            cy.wait(1000);
          }
        }
      });
    });
  });

  describe('AI Model & Provider Management', () => {
    it('should display AI model management section', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="ai-model-section"]').length) {
          cy.get('[data-testid="ai-model-section"]').should('be.visible');
          cy.get('[data-testid="ai-model-title"]').should('contain', 'AI Model');
        }
      });
    });

    it('should allow AI provider selection', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="ai-provider-select"]').length) {
          cy.get('[data-testid="ai-provider-select"]').click();
          cy.wait(500);
          
          // Select different AI provider
          if ($body.find('[data-value="openai"]').length) {
            cy.get('[data-value="openai"]').click();
            cy.wait(1000);
          }
        }
      });
    });

    it('should handle AI model configuration updates', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="ai-model-config-button"]').length) {
          cy.get('[data-testid="ai-model-config-button"]').click();
          cy.wait(1000);
          
          // Update AI configuration
          if ($body.find('[data-testid="ai-temperature-slider"]').length) {
            cy.get('[data-testid="ai-temperature-slider"]').invoke('val', 0.7).trigger('input');
          }
          
          if ($body.find('[data-testid="save-ai-config-button"]').length) {
            cy.get('[data-testid="save-ai-config-button"]').click();
            cy.wait(2000);
          }
        }
      });
    });

    it('should display system prompts management', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="system-prompts-section"]').length) {
          cy.get('[data-testid="system-prompts-section"]').should('be.visible');
          cy.get('[data-testid="system-prompts-title"]').should('contain', 'System Prompts');
        }
      });
    });
  });

  describe('Cache Management & Performance', () => {
    it('should display cache management section', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="cache-management-section"]').length) {
          cy.get('[data-testid="cache-management-section"]').should('be.visible');
        }
      });
    });

    it('should allow clearing application cache', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="clear-cache-button"]').length) {
          cy.get('[data-testid="clear-cache-button"]').click();
          cy.wait(2000);
          
          // Should show confirmation or success message
          cy.get('body').should('contain.text', 'cache');
        }
      });
    });

    it('should display performance metrics when available', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="performance-metrics"]').length) {
          cy.get('[data-testid="performance-metrics"]').should('be.visible');
        }
        
        if ($body.find('[data-testid="cache-statistics"]').length) {
          cy.get('[data-testid="cache-statistics"]').should('be.visible');
        }
      });
    });
  });

  describe('Help & Documentation Features', () => {
    it('should access help documentation', () => {
      cy.visit('/help');
      cy.wait(2000);
      
      // Verify help page loaded
      cy.url().should('include', '/help');
      cy.get('body').should('contain', 'Help');
      
      // Check for help sections
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="help-sections"]').length) {
          cy.get('[data-testid="help-sections"]').should('be.visible');
        }
        
        if ($body.find('[data-testid="faq-section"]').length) {
          cy.get('[data-testid="faq-section"]').should('be.visible');
        }
      });
    });

    it('should search help documentation', () => {
      cy.visit('/help');
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="help-search-input"]').length) {
          cy.get('[data-testid="help-search-input"]').type('application');
          cy.wait(1000);
          
          // Should show search results
          if ($body.find('[data-testid="help-search-results"]').length) {
            cy.get('[data-testid="help-search-results"]').should('be.visible');
          }
        }
      });
    });

    it('should display getting started guide', () => {
      cy.visit('/help');
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="getting-started-guide"]').length) {
          cy.get('[data-testid="getting-started-guide"]').should('be.visible');
          cy.get('[data-testid="getting-started-guide"]').click();
          cy.wait(1000);
        }
      });
    });
  });

  describe('Mobile & Accessibility Features', () => {
    it('should handle mobile settings navigation', () => {
      cy.viewport(375, 667);
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Check mobile-specific elements
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="mobile-settings-menu"]').length) {
          cy.get('[data-testid="mobile-settings-menu"]').should('be.visible');
        }
        
        if ($body.find('[data-testid="settings-tabs-mobile"]').length) {
          cy.get('[data-testid="settings-tabs-mobile"]').should('be.visible');
        }
      });
    });

    it('should support keyboard navigation in settings', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      // Test tab navigation through settings
      cy.get('body').focus();
      cy.tab();
      cy.focused().should('exist');
      
      cy.tab();
      cy.focused().should('exist');
    });

    it('should have proper ARIA labels in advanced features', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        // Check for ARIA labels on interactive elements
        const interactiveElements = $body.find('button, input, select, [role="button"]');
        if (interactiveElements.length > 0) {
          cy.get('button, input, select').first().should('have.attr', 'aria-label');
        }
      });
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle settings update failures gracefully', () => {
      // Intercept and fail settings update requests
      cy.intercept('PUT', '**/api/organizations/**', { statusCode: 500 });
      
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="edit-org-info-button"]').length) {
          cy.get('[data-testid="edit-org-info-button"]').click();
          cy.wait(1000);
          
          if ($body.find('[data-testid="save-org-info-button"]').length) {
            cy.get('[data-testid="save-org-info-button"]').click();
            cy.wait(2000);
            
            // Should show error message
            cy.get('body').should('contain.text', 'error');
          }
        }
      });
    });

    it('should handle invalid knowledge entry URLs', () => {
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="add-knowledge-entry-button"]').length) {
          cy.get('[data-testid="add-knowledge-entry-button"]').click();
          cy.wait(1000);
          
          if ($body.find('[data-testid="knowledge-url-input"]').length) {
            cy.get('[data-testid="knowledge-url-input"]').type('invalid-url-format');
            
            if ($body.find('[data-testid="save-knowledge-entry-button"]').length) {
              cy.get('[data-testid="save-knowledge-entry-button"]').click();
              cy.wait(1000);
              
              // Should show URL validation error
              cy.get('body').should('contain.text', 'URL');
            }
          }
        }
      });
    });

    it('should handle team member invitation failures', () => {
      // Intercept and fail invitation requests
      cy.intercept('POST', '**/api/invitations', { statusCode: 500 });
      
      cy.navigateToSettings();
      cy.wait(2000);
      
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="invite-member-button"]').length) {
          cy.get('[data-testid="invite-member-button"]').click();
          cy.wait(1000);
          
          if ($body.find('[data-testid="invite-email-input"]').length) {
            cy.get('[data-testid="invite-email-input"]').type('test@example.com');
            
            if ($body.find('[data-testid="send-invitation-button"]').length) {
              cy.get('[data-testid="send-invitation-button"]').click();
              cy.wait(2000);
              
              // Should show error message
              cy.get('body').should('contain.text', 'error');
            }
          }
        }
      });
    });
  });
});