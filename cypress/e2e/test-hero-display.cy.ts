describe('Hero Image Display Test', () => {
  it('should display hero image on landing page', () => {
    // Navigate to the landing page
    cy.visit('/');
    cy.wait(3000);
    
    // Check if there's a hero image
    cy.get('img').should('exist');
    
    // Check if the hero image has proper attributes
    cy.get('img').should('have.attr', 'alt');
    cy.get('img').should('have.attr', 'src');
    
    // Check if the image source is from Supabase storage
    cy.get('img').should('have.attr', 'src').and('include', 'supabase.co');
    
    // Check if the image loads successfully
    cy.get('img').should('be.visible');
    
    cy.log('✅ Hero image display test completed successfully!');
  });
});
