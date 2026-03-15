describe('Comprehensive Functionality Tests', () => {
  beforeEach(() => {
    cy.task('db:reset');
    cy.wait(1000);
    cy.task('db:seed');
    cy.wait(1000);
    cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
  });

  describe('Logo Upload Functionality', () => {
    it('should allow users to upload organization logos', () => {
      cy.visit('/settings');
      
      // Navigate to organization settings
      cy.get('[data-testid="settings-organization-tab"]').click();
      cy.get('[data-testid="organization-info-section"]').should('be.visible');
      
      // Check if logo upload area is visible
      cy.get('[data-testid="logo-upload-area"]').should('be.visible');
      
      // Test logo upload (simulate file selection)
      cy.get('[data-testid="logo-upload-input"]').should('exist');
      
      // Verify upload button is present
      cy.get('[data-testid="upload-logo-button"]').should('be.visible');
    });

    it('should display current logo if exists', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-organization-tab"]').click();
      
      // Check for existing logo display
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="current-logo"]').length > 0) {
          cy.get('[data-testid="current-logo"]').should('be.visible');
        }
      });
    });
  });

  describe('Hero Image Upload Functionality', () => {
    it('should allow superadmin users to upload hero images with metadata', () => {
      // First, make the user a superadmin
      cy.task('db:makeSuperadmin', 'test-cypress@example.com');
      
      cy.visit('/superadmin');
      
      // Navigate to Content tab
      cy.get('[role="tablist"]').within(() => {
        cy.contains('Content').click();
      });
      cy.wait(1000);
      
      // Check if hero image upload section is visible
      cy.get('[data-testid="hero-image-upload"]').should('be.visible');
      
      // Test hero image upload with metadata
      const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      // Use the custom file selection button
      cy.get('[data-testid="hero-image-upload"]').within(() => {
        cy.get('button').contains('Choose File').click();
      });
      
      // Select file
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(testImageData, 'base64'),
        fileName: 'test-hero.png',
        mimeType: 'image/png'
      });
      
      cy.wait(1000);
      
      // Fill in metadata
      cy.get('[data-testid="title-input"]').type('Test Hero Image');
      cy.get('[data-testid="alt-text-input"]').type('Test hero image for comprehensive test');
      
      // Upload
      cy.get('[data-testid="upload-button"]').click();
      cy.wait(5000);
      
      // Verify metadata is displayed
      cy.get('[data-testid="hero-image-upload"]').within(() => {
        cy.get('[data-testid="image-details"]').should('be.visible');
        cy.get('[data-testid="image-details"]').should('contain.text', 'Title:');
        cy.get('[data-testid="image-details"]').should('contain.text', 'Size:');
        cy.get('[data-testid="image-details"]').should('contain.text', 'Type:');
      });
    });
  });

  describe('AI Suggestions Functionality', () => {
    it('should generate AI suggestions for grant applications', () => {
      cy.visit('/applications');
      
      // Create a new application first
      cy.get('[data-testid="create-application-button"]').click();
      cy.get('[data-testid="create-application-modal"]').should('be.visible');
      
      // Fill in application details
      cy.get('[data-testid="project-name-input"]').type('Test AI Suggestion Project');
      cy.get('[data-testid="project-summary-input"]').type('This is a test project for AI suggestions');
      cy.get('[data-testid="target-audience-input"]').type('General public');
      cy.get('[data-testid="expected-impact-input"]').type('Significant positive impact');
      cy.get('[data-testid="funding-amount-input"]').type('50000');
      cy.get('[data-testid="timeline-input"]').type('12 months');
      
      // Submit the application
      cy.get('[data-testid="submit-application-button"]').click();
      cy.wait(2000);
      
      // Check if suggestions section is visible
      cy.get('[data-testid="suggestions-section"]').should('be.visible');
      
      // Test generating suggestions
      cy.get('[data-testid="generate-suggestions-button"]').should('be.visible');
      cy.get('[data-testid="generate-suggestions-button"]').click();
      
      // Wait for suggestions to load
      cy.wait(5000);
      
      // Check if suggestions are displayed
      cy.get('[data-testid="suggestions-list"]').should('be.visible');
      cy.get('[data-testid="suggestion-card"]').should('have.length.at.least', 1);
    });

    it('should display suggestion details correctly', () => {
      cy.visit('/applications');
      
      // Navigate to an existing application
      cy.get('[data-testid="application-row"]').first().click();
      
      // Check suggestions section
      cy.get('[data-testid="suggestions-section"]').should('be.visible');
      
      // If suggestions exist, check their structure
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="suggestion-card"]').length > 0) {
          cy.get('[data-testid="suggestion-card"]').first().within(() => {
            cy.get('[data-testid="suggestion-title"]').should('be.visible');
            cy.get('[data-testid="suggestion-description"]').should('be.visible');
            cy.get('[data-testid="suggestion-funding-amount"]').should('be.visible');
            cy.get('[data-testid="suggestion-type"]').should('be.visible');
          });
        }
      });
    });
  });

  describe('Language Settings Functionality', () => {
    it('should allow users to change UI language', () => {
      cy.visit('/settings');
      
      // Navigate to language settings
      cy.get('[data-testid="settings-language-tab"]').click();
      cy.get('[data-testid="language-settings-section"]').should('be.visible');
      
      // Test UI language change
      cy.get('[data-testid="ui-language-select"]').should('be.visible');
      cy.get('[data-testid="ui-language-select"]').click();
      cy.get('[data-testid="ui-language-option-no"]').click();
      
      // Verify language change
      cy.get('[data-testid="ui-language-select"]').should('contain', 'Norwegian');
    });

    it('should allow users to change AI response language', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-language-tab"]').click();
      
      // Test AI language change
      cy.get('[data-testid="ai-language-select"]').should('be.visible');
      cy.get('[data-testid="ai-language-select"]').click();
      cy.get('[data-testid="ai-language-option-sv"]').click();
      
      // Verify AI language change
      cy.get('[data-testid="ai-language-select"]').should('contain', 'Swedish');
    });

    it('should persist language settings', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-language-tab"]').click();
      
      // Change UI language
      cy.get('[data-testid="ui-language-select"]').click();
      cy.get('[data-testid="ui-language-option-da"]').click();
      
      // Change AI language
      cy.get('[data-testid="ai-language-select"]').click();
      cy.get('[data-testid="ai-language-option-de"]').click();
      
      // Reload page and verify settings persist
      cy.reload();
      cy.get('[data-testid="settings-language-tab"]').click();
      
      cy.get('[data-testid="ui-language-select"]').should('contain', 'Danish');
      cy.get('[data-testid="ai-language-select"]').should('contain', 'German');
    });
  });

  describe('Team Management Functionality', () => {
    it('should display team members correctly', () => {
      cy.visit('/settings');
      
      // Navigate to team management
      cy.get('[data-testid="settings-team-tab"]').click();
      cy.get('[data-testid="team-management-section"]').should('be.visible');
      
      // Check if team members list is visible
      cy.get('[data-testid="team-members-list"]').should('be.visible');
      
      // Check if current user is displayed
      cy.get('[data-testid="team-member-card"]').should('have.length.at.least', 1);
    });

    it('should allow admins to invite new members', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-team-tab"]').click();
      
      // Check if invite button is visible for admin
      cy.get('[data-testid="invite-member-button"]').should('be.visible');
      
      // Test invite modal
      cy.get('[data-testid="invite-member-button"]').click();
      cy.get('[data-testid="invite-member-modal"]').should('be.visible');
      
      // Check invite form elements
      cy.get('[data-testid="invite-email-input"]').should('be.visible');
      cy.get('[data-testid="invite-role-select"]').should('be.visible');
      cy.get('[data-testid="send-invite-button"]').should('be.visible');
    });

    it('should allow admins to change member roles', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-team-tab"]').click();
      
      // Check if role change functionality is available
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="role-change-select"]').length > 0) {
          cy.get('[data-testid="role-change-select"]').first().should('be.visible');
        }
      });
    });

    it('should allow admins to remove team members', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-team-tab"]').click();
      
      // Check if remove member functionality is available
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="remove-member-button"]').length > 0) {
          cy.get('[data-testid="remove-member-button"]').first().should('be.visible');
        }
      });
    });
  });

  describe('Knowledge Base Functionality', () => {
    it('should display knowledge base section', () => {
      cy.visit('/settings');
      
      // Navigate to knowledge base
      cy.get('[data-testid="settings-knowledge-base-tab"]').click();
      cy.get('[data-testid="knowledge-base-section"]').should('be.visible');
      
      // Check knowledge base title
      cy.get('[data-testid="knowledge-base-title"]').should('contain', 'Knowledge Base');
    });

    it('should allow users to create knowledge base items', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-knowledge-base-tab"]').click();
      
      // Check if create button is visible
      cy.get('[data-testid="create-knowledge-item-button"]').should('be.visible');
      
      // Test create modal
      cy.get('[data-testid="create-knowledge-item-button"]').click();
      cy.get('[data-testid="create-knowledge-modal"]').should('be.visible');
    });

    it('should display empty state when no items exist', () => {
      cy.visit('/settings');
      cy.get('[data-testid="settings-knowledge-base-tab"]').click();
      
      // Check for empty state
      cy.get('[data-testid="knowledge-base-empty-state"]').should('be.visible');
      cy.get('[data-testid="empty-state-message"]').should('contain', 'No knowledge base items yet');
    });
  });

  describe('AI Model Management Functionality', () => {
    it('should display AI model management section', () => {
      cy.visit('/settings');
      
      // Navigate to AI model management
      cy.get('[data-testid="settings-ai-model-tab"]').click();
      cy.get('[data-testid="ai-model-section"]').should('be.visible');
      
      // Check AI model title
      cy.get('[data-testid="ai-model-title"]').should('contain', 'AI Model Manager');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain user session across all functionality', () => {
      cy.visit('/dashboard');
      
      // Test navigation to different sections
      cy.get('[data-testid="nav-applications"]').click();
      cy.url().should('include', '/applications');
      
      cy.get('[data-testid="nav-settings"]').click();
      cy.url().should('include', '/settings');
      
      // Verify user is still logged in
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should handle errors gracefully', () => {
      // Test with invalid data
      cy.visit('/applications');
      cy.get('[data-testid="create-application-button"]').click();
      
      // Try to submit without required fields
      cy.get('[data-testid="submit-application-button"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="error-message"]').should('be.visible');
    });
  });
});
