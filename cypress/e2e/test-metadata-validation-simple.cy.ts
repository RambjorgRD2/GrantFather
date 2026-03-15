describe('Hero Image Metadata Validation - Simple', () => {
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

  it('should validate database migration was successful', () => {
    // This test validates that the database migration added the new metadata fields
    // by checking that we can upload a hero image with metadata and it gets stored correctly
    
    // Use the Node.js script approach to test the Edge Function directly
    cy.task('db:makeSuperadmin', 'test-cypress@example.com');
    
    // Run the test script that validates metadata storage
    cy.exec('node scripts/test-hero-upload-with-metadata-fixed.js').then((result) => {
      expect(result.code).to.eq(0);
      expect(result.stdout).to.contain('SUCCESS! Hero image upload completed successfully!');
      expect(result.stdout).to.contain('Title: GrantFather Platform Interface');
      expect(result.stdout).to.contain('File Size:');
      expect(result.stdout).to.contain('10321640');
      expect(result.stdout).to.contain('MIME Type: image/png');
    });
  });

  it('should validate hero image display on landing page', () => {
    // First upload a hero image using the script
    cy.task('db:makeSuperadmin', 'test-cypress@example.com');
    
    cy.exec('node scripts/test-hero-upload-with-metadata-fixed.js').then((result) => {
      expect(result.code).to.eq(0);
      expect(result.stdout).to.contain('SUCCESS! Hero image upload completed successfully!');
    });
    
    // Wait a moment for the upload to complete
    cy.wait(2000);
    
    // Now check that the hero image is displayed on the landing page
    cy.visit('/');
    cy.wait(3000);
    
    // Check if hero image is displayed (using more flexible selector)
    cy.get('img[alt*="GrantFather"], img[alt*="platform"], img[alt*="hero"]', { timeout: 10000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('match', /https:\/\/fjlrplhtgknuulqymsse\.supabase\.co\/storage\/v1\/object\/public\/landing-assets\/hero-images\/.+\.(png|svg|webp|jpeg)/);
  });

  it('should validate metadata fields exist in database schema', () => {
    // This test validates that the database migration was successful
    // by running the test script that checks for metadata fields
    
    cy.task('db:makeSuperadmin', 'test-cypress@example.com');
    
    // Run the test script that validates the database schema
    cy.exec('node scripts/test-hero-upload-with-metadata-fixed.js').then((result) => {
      expect(result.code).to.eq(0);
      expect(result.stdout).to.contain('SUCCESS! Hero image upload completed successfully!');
      expect(result.stdout).to.contain('Title: GrantFather Platform Interface');
      expect(result.stdout).to.contain('File Size:');
      expect(result.stdout).to.contain('10321640');
      expect(result.stdout).to.contain('MIME Type: image/png');
      expect(result.stdout).to.contain('All available fields:');
    });
  });
});
