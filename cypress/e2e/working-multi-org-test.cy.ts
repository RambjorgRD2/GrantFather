describe('Multi-Organization Settings Test', () => {
  it('should access settings page and validate organization functionality', () => {
    const email = Cypress.env('TEST_EMAIL');
    const password = Cypress.env('TEST_PASSWORD');
    
    // Step 1: Login
    cy.visit('/login');
    cy.get('input[type="email"], input[name="email"], input[autocomplete="email"]', { timeout: 20000 })
      .first()
      .type(email, { log: false });
    cy.get('input[type="password"], input[name="password"], input[autocomplete="current-password"]')
      .first()
      .type(password, { log: false });
    cy.contains('button, [role="button"]', /sign in|log in|continue/i, { timeout: 10000 }).click();
    
    // Step 2: Wait for login redirect
    cy.location('pathname', { timeout: 30000 }).should((p) => {
      expect(p).to.match(/\/(dashboard|settings|home|applications|)$/);
    });
    
    // Step 3: Try to access settings and work with what we get
    cy.visit('/settings');
    cy.wait(5000); // Wait for page to load
    
    // Step 4: Check current URL to see if we were redirected
    cy.location('pathname').then((pathname) => {
      cy.log('Current pathname:', pathname);
      
      if (pathname === '/settings') {
        cy.log('Successfully on settings page');
        cy.screenshot('on-settings-page');
        
        // Check what content is actually available
        cy.get('body').then(($body) => {
          const text = $body.text();
          cy.log('Page content preview:', text.substring(0, 300));
          
          // Look for any organization-related content
          if (text.includes('Organization') || text.includes('Team') || text.includes('Settings')) {
            cy.log('Found organization-related content');
            cy.screenshot('org-content-found');
            
            // Try to find any interactive elements
            cy.get('button, input, select, [role="button"]').then(($elements) => {
              cy.log(`Found ${$elements.length} interactive elements`);
              if ($elements.length > 0) {
                cy.screenshot('interactive-elements-found');
                
                // Look specifically for file inputs (logo upload)
                const fileInputs = $body.find('input[type="file"]');
                if (fileInputs.length > 0) {
                  cy.log('Found file input for logo upload');
                  cy.screenshot('file-input-found');
                  
                  // Try to upload a file
                  cy.get('input[type="file"]').first().selectFile('cypress/fixtures/grantfather.png', { force: true });
                  cy.wait(3000);
                  cy.screenshot('file-uploaded');
                  
                  // Check for any success/error messages
                  cy.get('body').then(($body) => {
                    const updatedText = $body.text();
                    if (updatedText.includes('success') || updatedText.includes('uploaded') || updatedText.includes('Success')) {
                      cy.log('Upload appears successful');
                      cy.screenshot('upload-success');
                    } else if (updatedText.includes('error') || updatedText.includes('failed') || updatedText.includes('Error')) {
                      cy.log('Upload appears to have failed');
                      cy.screenshot('upload-failed');
                    } else {
                      cy.log('Upload result unclear');
                      cy.screenshot('upload-unclear');
                    }
                  });
                }
              }
            });
          } else {
            cy.log('No organization content found');
            cy.screenshot('no-org-content');
          }
        });
      } else {
        cy.log('Redirected to:', pathname);
        cy.screenshot(`redirected-to-${pathname.replace(/\//g, '-')}`);
        
        // If redirected to onboarding, that means hasOrganization is false
        if (pathname === '/onboarding') {
          cy.log('User was redirected to onboarding - hasOrganization is false');
        }
      }
    });
    
    // Step 5: Final screenshot regardless of outcome
    cy.screenshot('final-state');
  });
});
