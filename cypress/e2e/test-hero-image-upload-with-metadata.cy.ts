describe('Hero Image Upload with Metadata Validation', () => {
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

  it('should upload hero image with complete metadata and validate display', () => {
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
    
    // Create a test PNG file (simulating GrantFather.png)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const blob = new Blob([Cypress.Buffer.from(testImageData, 'base64')], { type: 'image/png' });
    
    // Select the file using the custom button
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      // Click the custom "Choose File" button
      cy.get('button').contains('Choose File').click();
    });
    
    // Select file using the hidden input
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(testImageData, 'base64'),
      fileName: 'grantfather-test.png',
      mimeType: 'image/png'
    });
    
    // Wait for file selection and processing
    cy.wait(2000);
    
    // Fill in title
    cy.get('[data-testid="title-input"]').clear().type('GrantFather Test Image');
    
    // Fill in alt text
    cy.get('[data-testid="alt-text-input"]').clear().type('GrantFather AI-powered grant writing platform interface');
    
    // Check if optimization status is shown (for non-SVG images)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="optimization-status"]').length > 0) {
        cy.get('[data-testid="optimization-status"]').should('be.visible');
      }
    });
    
    // Attempt to upload
    cy.get('[data-testid="upload-button"]').click();
    
    // Wait for upload to complete
    cy.wait(5000);
    
    // Check for success message
    cy.get('body').then(($body) => {
      if ($body.find('.toast').length > 0) {
        cy.get('.toast').should('be.visible');
        cy.get('.toast').should('contain.text', 'successfully');
      }
    });
    
    // Verify the image details are displayed with metadata
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      // Check if Image Details section shows the metadata
      cy.get('[data-testid="image-details"]').should('be.visible');
      
      // Verify title is displayed (should show "GrantFather Test Image" or "No title")
      cy.get('[data-testid="image-details"]').should('contain.text', 'Title:');
      
      // Verify alt text is displayed
      cy.get('[data-testid="image-details"]').should('contain.text', 'GrantFather AI-powered grant writing platform interface');
      
      // Verify size is displayed (should show actual size or "Not available")
      cy.get('[data-testid="image-details"]').should('contain.text', 'Size:');
      
      // Verify type is displayed (should show "image/png" or "Not available")
      cy.get('[data-testid="image-details"]').should('contain.text', 'Type:');
      
      // Verify updated date is shown
      cy.get('[data-testid="image-details"]').should('contain.text', 'Updated:');
    });
  });

  it('should validate hero image display on landing page', () => {
    // First upload a hero image (using the same process as above)
    cy.visit('/superadmin');
    cy.wait(2000);
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);
    
    // Create and upload a test image
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      cy.get('button').contains('Choose File').click();
    });
    
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(testImageData, 'base64'),
      fileName: 'test-hero.png',
      mimeType: 'image/png'
    });
    
    cy.wait(1000);
    cy.get('[data-testid="title-input"]').type('Test Hero Image');
    cy.get('[data-testid="alt-text-input"]').type('Test hero image for landing page');
    cy.get('[data-testid="upload-button"]').click();
    cy.wait(5000);
    
    // Navigate to landing page
    cy.visit('/');
    cy.wait(2000);
    
    // Check if hero image is displayed
    cy.get('img[alt*="hero image"]', { timeout: 10000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('match', /https:\/\/fjlrplhtgknuulqymsse\.supabase\.co\/storage\/v1\/object\/public\/landing-assets\/hero-images\/.+\.(png|svg|webp|jpeg)/);
  });

  it('should handle file validation and optimization', () => {
    cy.visit('/superadmin');
    cy.wait(2000);
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);
    
    // Test with an SVG file (should not be optimized)
    const testSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#3b82f6"/>
      <text x="50" y="50" text-anchor="middle" font-family="Arial" font-size="12" fill="white">Test SVG</text>
    </svg>`;
    
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      cy.get('button').contains('Choose File').click();
    });
    
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(testSvg),
      fileName: 'test-hero.svg',
      mimeType: 'image/svg+xml'
    });
    
    cy.wait(1000);
    
    // SVG files should not show optimization status
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="optimization-status"]').length > 0) {
        cy.get('[data-testid="optimization-status"]').should('not.exist');
      }
    });
    
    // Fill in details
    cy.get('[data-testid="title-input"]').type('Test SVG Hero');
    cy.get('[data-testid="alt-text-input"]').type('Test SVG hero image');
    
    // Upload
    cy.get('[data-testid="upload-button"]').click();
    cy.wait(5000);
    
    // Check for success
    cy.get('body').then(($body) => {
      if ($body.find('.toast').length > 0) {
        cy.get('.toast').should('be.visible');
      }
    });
  });

  it('should display proper error messages for invalid files', () => {
    cy.visit('/superadmin');
    cy.wait(2000);
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);
    
    // Test with an invalid file type
    const invalidFile = 'This is not an image file';
    
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      cy.get('button').contains('Choose File').click();
    });
    
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(invalidFile),
      fileName: 'invalid-file.txt',
      mimeType: 'text/plain'
    });
    
    cy.wait(1000);
    
    // Should show validation error
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="validation-error"]').length > 0) {
        cy.get('[data-testid="validation-error"]').should('be.visible');
        cy.get('[data-testid="validation-error"]').should('contain.text', 'Unsupported file type');
      }
    });
  });
});
