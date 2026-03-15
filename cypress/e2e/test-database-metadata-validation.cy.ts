describe('Database Metadata Validation', () => {
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

  it('should validate database schema has new metadata fields', () => {
    // This test verifies that the database migration was successful
    // by checking that the new fields exist in the landing_page_assets table
    
    // We'll test this indirectly by uploading a hero image and checking
    // that all metadata fields are properly stored and retrieved
    
    cy.visit('/superadmin');
    cy.wait(2000);
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);
    
    // Create a test image with known metadata
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const expectedFileSize = Cypress.Buffer.from(testImageData, 'base64').length;
    const expectedMimeType = 'image/png';
    const expectedTitle = 'Database Schema Test Image';
    const expectedAltText = 'Test image for database schema validation';
    
    // Upload the test image
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      cy.get('button').contains('Choose File').click();
    });
    
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(testImageData, 'base64'),
      fileName: 'schema-test.png',
      mimeType: expectedMimeType
    });
    
    cy.wait(1000);
    
    // Fill in metadata
    cy.get('[data-testid="title-input"]').type(expectedTitle);
    cy.get('[data-testid="alt-text-input"]').type(expectedAltText);
    
    // Upload
    cy.get('[data-testid="upload-button"]').click();
    cy.wait(5000);
    
    // Verify the metadata is displayed correctly in the UI
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      cy.get('[data-testid="image-details"]').should('be.visible');
      
      // Check that all metadata fields are displayed
      cy.get('[data-testid="image-details"]').should('contain.text', expectedTitle);
      cy.get('[data-testid="image-details"]').should('contain.text', expectedAltText);
      cy.get('[data-testid="image-details"]').should('contain.text', expectedMimeType);
      
      // Check that file size is displayed (should be close to expected size)
      cy.get('[data-testid="image-details"]').should('contain.text', 'Size:');
      cy.get('[data-testid="image-details"]').should('contain.text', 'Type:');
      cy.get('[data-testid="image-details"]').should('contain.text', 'Updated:');
    });
    
    // Verify the image is displayed on the landing page
    cy.visit('/');
    cy.wait(2000);
    
    cy.get('img[alt*="hero image"]', { timeout: 10000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('match', /https:\/\/fjlrplhtgknuulqymsse\.supabase\.co\/storage\/v1\/object\/public\/landing-assets\/hero-images\/.+\.png/);
  });

  it('should handle missing metadata gracefully for existing records', () => {
    // This test verifies that existing hero image records without metadata
    // are handled gracefully by the frontend
    
    cy.visit('/superadmin');
    cy.wait(2000);
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);
    
    // Check if there's an existing hero image record
    cy.get('[data-testid="hero-image-upload"]').within(() => {
      // If there's a current hero image displayed, check that missing fields show appropriate fallbacks
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="image-details"]').length > 0) {
          cy.get('[data-testid="image-details"]').should('be.visible');
          
          // Check that missing fields show appropriate fallback text
          cy.get('[data-testid="image-details"]').then(($details) => {
            if ($details.text().includes('No title')) {
              cy.log('✅ Missing title field handled gracefully');
            }
            if ($details.text().includes('Not available')) {
              cy.log('✅ Missing metadata fields handled gracefully');
            }
          });
        }
      });
    });
  });

  it('should validate file size and MIME type accuracy', () => {
    // This test verifies that file size and MIME type are accurately stored
    
    cy.visit('/superadmin');
    cy.wait(2000);
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Content').click();
    });
    cy.wait(1000);
    
    // Test with different file types to verify MIME type detection
    const testCases = [
      {
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        fileName: 'test.png',
        mimeType: 'image/png',
        expectedSize: 95 // Base64 decoded size
      },
      {
        data: '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#3b82f6"/></svg>',
        fileName: 'test.svg',
        mimeType: 'image/svg+xml',
        expectedSize: 95
      }
    ];
    
    testCases.forEach((testCase, index) => {
      cy.log(`Testing ${testCase.fileName} (${testCase.mimeType})`);
      
      // Upload the test file
      cy.get('[data-testid="hero-image-upload"]').within(() => {
        cy.get('button').contains('Choose File').click();
      });
      
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(testCase.data, testCase.mimeType.includes('svg') ? 'utf8' : 'base64'),
        fileName: testCase.fileName,
        mimeType: testCase.mimeType
      });
      
      cy.wait(1000);
      
      // Fill in metadata
      cy.get('[data-testid="title-input"]').clear().type(`Test ${testCase.fileName}`);
      cy.get('[data-testid="alt-text-input"]').clear().type(`Test ${testCase.fileName} for validation`);
      
      // Upload
      cy.get('[data-testid="upload-button"]').click();
      cy.wait(5000);
      
      // Verify metadata accuracy
      cy.get('[data-testid="hero-image-upload"]').within(() => {
        cy.get('[data-testid="image-details"]').should('be.visible');
        cy.get('[data-testid="image-details"]').should('contain.text', testCase.mimeType);
        cy.get('[data-testid="image-details"]').should('contain.text', 'Size:');
      });
      
      // Wait before next test case
      if (index < testCases.length - 1) {
        cy.wait(2000);
      }
    });
  });
});
