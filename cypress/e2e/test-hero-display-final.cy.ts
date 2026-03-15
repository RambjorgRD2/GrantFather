describe('Hero Image Display - Final Test', () => {
  it('should display hero image on landing page', () => {
    // Visit the landing page
    cy.visit('/');
    cy.wait(3000);
    
    // Check if the page loads
    cy.get('body').should('be.visible');
    
    // Check for hero image element
    cy.get('img[alt*="hero image"], img[alt*="GrantFather"], img[alt*="platform"]', { timeout: 10000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('not.contain', 'hero-platform-preview.svg'); // Should not be the fallback
    
    // Check that the image source is from Supabase storage
    cy.get('img[alt*="hero image"], img[alt*="GrantFather"], img[alt*="platform"]')
      .should('have.attr', 'src')
      .and('match', /https:\/\/fjlrplhtgknuulqymsse\.supabase\.co\/storage\/v1\/object\/public\/landing-assets\/hero-images\/.+\.(png|svg|webp|jpeg)/);
  });

  it('should have proper alt text for hero image', () => {
    cy.visit('/');
    cy.wait(3000);
    
    // Check for proper alt text
    cy.get('img[alt*="GrantFather AI-powered grant writing platform interface"]')
      .should('be.visible');
  });
});
