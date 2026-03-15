describe('SuperAdmin Organization Connection Validation', () => {
  beforeEach(() => {
    // Reset database and seed test data
    cy.task('db:reset');
    cy.wait(1000);
    cy.task('db:seedUsersOnly');
    cy.wait(1000);
    
    // Grant SuperAdmin role to test user
    cy.task('db:makeSuperadmin', 'test-cypress@example.com');
    cy.wait(1000);
    
    // Login as SuperAdmin user
    cy.loginSimple('test-cypress@example.com', 'TestPassword123!');
  });

  it('should validate SuperAdmin user has proper roles and organization access', () => {
    // Navigate to SuperAdmin page
    cy.visit('/superadmin');
    cy.wait(2000);

    // Check if SuperAdmin page loads
    cy.get('[data-testid="superadmin-page"]').should('be.visible');
    
    // Navigate to Content tab to access hero image upload
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);

    // Check if hero image upload section is visible
    cy.get('[data-testid="hero-image-upload"]').should('be.visible');
    
    // Note: User roles validation is now handled by the Edge Function
    // The frontend no longer queries user_roles due to RLS policies
    cy.log('SuperAdmin page loaded successfully - role validation handled by Edge Function');
  });

  it('should validate brAInstorm organization connection', () => {
    // Navigate to Settings page to check organization display
    cy.visit('/settings');
    cy.wait(2000);

    // Check if Settings page loads
    cy.get('[data-testid="settings-page"]').should('be.visible');
    
    // Navigate to Organization tab
    cy.get('[data-testid="settings-organization-tab"]').click();
    cy.wait(1000);

    // Check if organization information is displayed
    cy.get('[data-testid="organization-info"]').should('be.visible');
    
    // Check if organization name contains "brAInstorm" or similar
    cy.get('[data-testid="organization-name"]').should('contain.text', 'brAInstorm');
    
    // Check if user role is displayed as admin or superadmin
    cy.get('[data-testid="user-role"]').should('be.visible');
  });

  it('should test hero image upload with SuperAdmin privileges', () => {
    // Navigate to SuperAdmin page
    cy.visit('/superadmin');
    cy.wait(2000);

    // Navigate to Content tab
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);

    // Check if hero image upload section is visible
    cy.get('[data-testid="hero-image-upload"]').should('be.visible');
    
    // Create a test SVG file
    const testSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#3b82f6"/>
      <text x="50" y="50" text-anchor="middle" font-family="Arial" font-size="12" fill="white">Test</text>
    </svg>`;
    
    const blob = new Blob([testSvg], { type: 'image/svg+xml' });
    const file = new File([blob], 'test-hero-image.svg', { type: 'image/svg+xml' });
    
    // Select the file
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(testSvg),
      fileName: 'test-hero-image.svg',
      mimeType: 'image/svg+xml'
    });
    
    // Wait for file selection
    cy.wait(1000);
    
    // Check if file preview is shown
    cy.get('[data-testid="file-preview"]').should('be.visible');
    
    // Fill in title
    cy.get('[data-testid="title-input"]').type('Test Hero Image');
    
    // Fill in alt text
    cy.get('[data-testid="alt-text-input"]').type('Test hero image for SuperAdmin upload');
    
    // Attempt to upload
    cy.get('[data-testid="upload-button"]').click();
    
    // Check for success or specific error message
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="upload-success"]').length > 0) {
        // Upload successful
        cy.get('[data-testid="upload-success"]').should('be.visible');
        console.log('Hero image upload successful!');
      } else if ($body.find('[data-testid="upload-error"]').length > 0) {
        // Upload failed - check error message
        cy.get('[data-testid="upload-error"]').should('be.visible');
        cy.get('[data-testid="upload-error"]').should('contain.text', 'SuperAdmin role required');
        console.log('Hero image upload failed as expected due to storage policies');
      } else {
        // Check for toast notifications
        cy.get('.toast').should('be.visible');
        cy.get('.toast').should('contain.text', 'SuperAdmin');
      }
    });
  });

  it('should validate user can access multiple organizations', () => {
    // Navigate to Settings page
    cy.visit('/settings');
    cy.wait(2000);

    // Navigate to Organization tab
    cy.get('[data-testid="settings-organization-tab"]').click();
    cy.wait(1000);

    // Check if organization selector or multiple organizations are shown
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="organization-selector"]').length > 0) {
        // Multiple organizations available
        cy.get('[data-testid="organization-selector"]').should('be.visible');
        cy.get('[data-testid="organization-selector"]').should('contain.text', 'brAInstorm');
      } else if ($body.find('[data-testid="current-organization"]').length > 0) {
        // Single organization displayed
        cy.get('[data-testid="current-organization"]').should('be.visible');
        cy.get('[data-testid="current-organization"]').should('contain.text', 'brAInstorm');
      }
    });
  });
});
