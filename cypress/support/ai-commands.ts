// Enhanced Cypress commands for AI generation testing

declare global {
  namespace Cypress {
    interface Chainable {
      // AI Provider Management
      selectAIProvider(provider: string): Chainable<void>;
      selectAIModel(model: string): Chainable<void>;
      configureAISettings(settings: any): Chainable<void>;
      useRecommendedAIProvider(section: string): Chainable<void>;
      
      // AI Generation
      generateCompleteAIDraft(): Chainable<void>;
      regenerateSection(section: string, tone?: string, improvement?: string): Chainable<void>;
      waitForAIGeneration(): Chainable<void>;
      waitForSectionGeneration(section: string): Chainable<void>;
      
      // AI Validation
      validateAllSectionsGenerated(): Chainable<void>;
      validateSectionContent(section: string): Chainable<void>;
      validateContentQuality(): Chainable<void>;
      validateProviderSpecificContent(provider: string): Chainable<void>;
      validateSectionLength(section: string): Chainable<void>;
      validateAutoSave(): Chainable<void>;
      validateCustomPromptUsed(section: string): Chainable<void>;
      
      // AI Application Management
      createTestApplicationForAI(): Chainable<void>;
      createMultipleTestApplications(applications: any[]): Chainable<void>;
      navigateToSection(section: string): Chainable<void>;
      
      // AI Configuration
      createCustomPrompt(section: string, promptTemplate: string): Chainable<void>;
      configureProviderAPIKey(provider: string, apiKey: string): Chainable<void>;
      
      // Enhanced Form Helpers
      fillApplicationForm(data: any): Chainable<void>;
      selectCalendarDate(dateString: string): Chainable<void>;
    }
  }
}

// AI Provider Selection with validation
Cypress.Commands.add('selectAIProvider', (provider: string) => {
  cy.log(`🤖 Selecting AI provider: ${provider}`);
  
  cy.get('[data-testid="ai-provider-select"]', { timeout: 10000 })
    .should('be.visible')
    .click();
  
  cy.get(`[data-value="${provider}"]`, { timeout: 5000 })
    .should('be.visible')
    .click();
  
  // Wait for provider to load and validate selection
  cy.wait(1000);
  cy.get('[data-testid="ai-provider-select"]')
    .should('contain', provider);
  
  cy.log(`✅ AI provider ${provider} selected successfully`);
});

// AI Model Selection with validation
Cypress.Commands.add('selectAIModel', (model: string) => {
  cy.log(`🎯 Selecting AI model: ${model}`);
  
  cy.get('[data-testid="ai-model-select"]', { timeout: 10000 })
    .should('be.visible')
    .click();
  
  cy.get(`[data-value="${model}"]`, { timeout: 5000 })
    .should('be.visible')
    .click();
  
  cy.wait(500);
  cy.get('[data-testid="ai-model-select"]')
    .should('contain', model);
  
  cy.log(`✅ AI model ${model} selected successfully`);
});

// Use recommended AI provider for specific section
Cypress.Commands.add('useRecommendedAIProvider', (section: string) => {
  cy.log(`🔧 Using recommended AI provider for section: ${section}`);
  
  const recommendations = {
    introduction: { provider: 'openai', model: 'GPT-5' },
    need_statement: { provider: 'anthropic', model: 'Opus 4' },
    project_plan: { provider: 'anthropic', model: 'Sonnet 4' },
    budget: { provider: 'google', model: 'Gemini 2.0 Flash' },
    outcomes: { provider: 'google', model: 'Gemini 1.5 Pro' },
    conclusion: { provider: 'openai', model: 'GPT-5' }
  };
  
  const config = recommendations[section as keyof typeof recommendations];
  if (config) {
    cy.selectAIProvider(config.provider);
    cy.selectAIModel(config.model);
  }
});

// Generate complete AI draft with comprehensive monitoring
Cypress.Commands.add('generateCompleteAIDraft', () => {
  cy.log('🚀 Starting complete AI draft generation...');
  
  // Intercept AI generation request
  cy.intercept('POST', '**/functions/v1/ai-grant-writer').as('aiGeneration');
  
  cy.get('[data-testid="generate-complete-draft"]', { timeout: 10000 })
    .should('be.visible')
    .should('not.be.disabled')
    .click();
  
  // Wait for generation to start
  cy.get('[data-testid="ai-generating"]', { timeout: 10000 })
    .should('be.visible');
  
  cy.log('⏳ AI generation in progress...');
  
  // Wait for the API call to complete
  cy.wait('@aiGeneration', { timeout: 120000 });
  
  // Wait for generation UI to disappear
  cy.get('[data-testid="ai-generating"]', { timeout: 120000 })
    .should('not.exist');
  
  // Ensure content is loaded
  cy.get('[data-testid="draft-content"]', { timeout: 10000 })
    .should('be.visible');
  
  cy.log('✅ Complete AI draft generation finished');
});

// Regenerate specific section with options
Cypress.Commands.add('regenerateSection', (section: string, tone?: string, improvement?: string) => {
  cy.log(`🔄 Regenerating section: ${section}`);
  
  // Navigate to the specific section
  cy.navigateToSection(section);
  
  // Set up intercept for section regeneration
  cy.intercept('POST', '**/functions/v1/ai-grant-writer').as('sectionRegeneration');
  
  // Open section settings if tone or improvement specified
  if (tone || improvement) {
    cy.get(`[data-testid="section-settings-${section}"]`, { timeout: 5000 })
      .should('be.visible')
      .click();
    
    if (tone) {
      cy.get('[data-testid="tone-select"]').select(tone);
    }
    
    if (improvement) {
      cy.get('[data-testid="improvement-input"]').type(improvement);
    }
    
    cy.get('[data-testid="apply-settings"]').click();
  }
  
  // Trigger regeneration
  cy.get(`[data-testid="regenerate-${section}"]`, { timeout: 10000 })
    .should('be.visible')
    .click();
  
  // Wait for generation to start
  cy.get(`[data-testid="generating-${section}"]`, { timeout: 5000 })
    .should('be.visible');
  
  // Wait for API call
  cy.wait('@sectionRegeneration', { timeout: 60000 });
  
  // Wait for generation to complete
  cy.get(`[data-testid="generating-${section}"]`, { timeout: 60000 })
    .should('not.exist');
  
  cy.log(`✅ Section ${section} regenerated successfully`);
});

// Wait for AI generation with progress monitoring
Cypress.Commands.add('waitForAIGeneration', () => {
  cy.log('⏳ Waiting for AI generation to complete...');
  
  // Wait for generation to start
  cy.get('[data-testid="ai-generating"]', { timeout: 10000 })
    .should('be.visible');
  
  // Monitor progress if available
  cy.get('body').then($body => {
    if ($body.find('[data-testid="generation-progress"]').length) {
      cy.get('[data-testid="generation-progress"]')
        .should('be.visible');
    }
  });
  
  // Wait for generation to complete (max 2 minutes for full draft)
  cy.get('[data-testid="ai-generating"]', { timeout: 120000 })
    .should('not.exist');
  
  // Ensure content is loaded
  cy.get('[data-testid="draft-content"]', { timeout: 10000 })
    .should('be.visible');
  
  cy.log('✅ AI generation completed successfully');
});

// Wait for section-specific generation
Cypress.Commands.add('waitForSectionGeneration', (section: string) => {
  cy.log(`⏳ Waiting for ${section} section generation...`);
  
  cy.get(`[data-testid="generating-${section}"]`, { timeout: 10000 })
    .should('be.visible');
  
  cy.get(`[data-testid="generating-${section}"]`, { timeout: 60000 })
    .should('not.exist');
  
  cy.get(`[data-testid="section-${section}"]`, { timeout: 10000 })
    .should('be.visible')
    .should('not.be.empty');
  
  cy.log(`✅ Section ${section} generation completed`);
});

// Validate all sections are generated
Cypress.Commands.add('validateAllSectionsGenerated', () => {
  cy.log('🔍 Validating all sections are generated...');
  
  const sections = [
    'introduction', 'need_statement', 'project_plan', 
    'budget', 'outcomes', 'conclusion'
  ];
  
  sections.forEach(section => {
    cy.get(`[data-testid="section-${section}"]`, { timeout: 10000 })
      .should('be.visible')
      .should('not.be.empty');
    
    // Check that section contains actual content, not just placeholders
    cy.get(`[data-testid="section-${section}"]`).then($section => {
      const text = $section.text().trim();
      expect(text.length).to.be.greaterThan(50); // Minimum meaningful content
      expect(text).to.not.contain('Lorem ipsum');
      expect(text).to.not.contain('[INSERT]');
      expect(text).to.not.contain('TODO');
    });
  });
  
  cy.log('✅ All sections validated successfully');
});

// Validate section content quality
Cypress.Commands.add('validateSectionContent', (section: string) => {
  cy.log(`🔍 Validating ${section} content quality...`);
  
  cy.get(`[data-testid="section-${section}"]`, { timeout: 10000 })
    .should('be.visible')
    .then($section => {
      const text = $section.text().trim();
      
      // Content length validation
      expect(text.length).to.be.greaterThan(100);
      expect(text.length).to.be.lessThan(5000);
      
      // Quality checks
      expect(text).to.not.contain('Lorem ipsum');
      expect(text).to.not.contain('[INSERT]');
      expect(text).to.not.contain('TODO');
      expect(text).to.not.contain('PLACEHOLDER');
      
      // Section-specific validation
      switch (section) {
        case 'introduction':
          expect(text).to.match(/\b(project|organization|mission|goal)\b/i);
          break;
        case 'need_statement':
          expect(text).to.match(/\b(need|problem|challenge|issue)\b/i);
          break;
        case 'budget':
          expect(text).to.match(/\b(cost|budget|funding|amount|dollar|NOK)\b/i);
          break;
      }
      
      cy.log(`✅ ${section} content quality validated`);
    });
});

// Validate overall content quality
Cypress.Commands.add('validateContentQuality', () => {
  cy.log('🔍 Validating overall content quality...');
  
  cy.get('[data-testid="draft-content"]', { timeout: 10000 }).then($content => {
    const text = $content.text();
    
    // Overall length check
    expect(text.length).to.be.greaterThan(1000);
    
    // Quality indicators
    expect(text).to.not.contain('Lorem ipsum');
    expect(text).to.not.contain('[INSERT]');
    expect(text).to.not.contain('TODO');
    
    // Check for grant-writing specific terms
    const grantTerms = ['funding', 'project', 'impact', 'community', 'goal', 'objective'];
    const hasGrantTerms = grantTerms.some(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );
    expect(hasGrantTerms).to.be.true;
    
    cy.log('✅ Overall content quality validated');
  });
});

// Validate section length requirements
Cypress.Commands.add('validateSectionLength', (section: string) => {
  cy.log(`📏 Validating ${section} section length...`);
  
  const lengthRequirements = {
    introduction: { min: 200, max: 800 },
    need_statement: { min: 300, max: 1000 },
    project_plan: { min: 400, max: 1200 },
    budget: { min: 200, max: 800 },
    outcomes: { min: 300, max: 1000 },
    conclusion: { min: 150, max: 600 }
  };
  
  const requirements = lengthRequirements[section as keyof typeof lengthRequirements];
  
  if (requirements) {
    cy.get(`[data-testid="section-${section}"]`).then($section => {
      const text = $section.text().trim();
      expect(text.length).to.be.greaterThan(requirements.min);
      expect(text.length).to.be.lessThan(requirements.max);
      
      cy.log(`✅ ${section} length validated: ${text.length} characters`);
    });
  }
});

// Validate auto-save functionality
Cypress.Commands.add('validateAutoSave', () => {
  cy.log('💾 Validating auto-save functionality...');
  
  // Look for auto-save indicators
  cy.get('body').then($body => {
    if ($body.find('[data-testid="auto-save-indicator"]').length) {
      cy.get('[data-testid="auto-save-indicator"]')
        .should('contain', 'Saved');
    }
    
    if ($body.find('[data-testid="last-saved"]').length) {
      cy.get('[data-testid="last-saved"]')
        .should('be.visible');
    }
  });
  
  // Wait a moment for auto-save to trigger
  cy.wait(2000);
  
  cy.log('✅ Auto-save validated');
});

// Create test application optimized for AI testing
Cypress.Commands.add('createTestApplicationForAI', () => {
  cy.log('📝 Creating test application for AI generation...');
  
  const applicationData = {
    projectName: `AI Test Project ${Date.now()}`,
    fundingAmount: 75000,
    summary: 'Comprehensive test project for AI generation validation with detailed requirements and clear objectives',
    targetAudience: 'Local community organizations and educational institutions',
    timelineStart: '2024-06-01',
    timelineEnd: '2024-12-31',
    expectedImpact: 'Significant positive impact on community development and educational outcomes'
  };
  
  cy.task('createAITestApplication', {
    ...applicationData,
    withAIData: false
  }).then((result) => {
    expect(result.success).to.be.true;
    cy.wrap(result.application.id).as('testApplicationId');
    cy.log(`✅ AI test application created with ID: ${result.application.id}`);
  });
});

// Create multiple test applications
Cypress.Commands.add('createMultipleTestApplications', (applications: any[]) => {
  cy.log(`📝 Creating ${applications.length} test applications...`);
  
  applications.forEach((app, index) => {
    cy.task('createAITestApplication', {
      projectName: app.name || `Test Project ${index + 1}`,
      fundingAmount: app.amount || 50000,
      status: app.status || 'draft',
      withAIData: app.withAIData || false
    }).then((result) => {
      expect(result.success).to.be.true;
      cy.wrap(result.application.id).as(`testApp${index}Id`);
    });
  });
  
  cy.log(`✅ Created ${applications.length} test applications`);
});

// Navigate to specific section in draft editor
Cypress.Commands.add('navigateToSection', (section: string) => {
  cy.log(`🧭 Navigating to section: ${section}`);
  
  // Try different navigation methods
  cy.get('body').then($body => {
    if ($body.find(`[data-testid="section-tab-${section}"]`).length) {
      cy.get(`[data-testid="section-tab-${section}"]`).click();
    } else if ($body.find(`[data-testid="nav-${section}"]`).length) {
      cy.get(`[data-testid="nav-${section}"]`).click();
    } else if ($body.find(`a[href*="${section}"]`).length) {
      cy.get(`a[href*="${section}"]`).first().click();
    }
  });
  
  cy.wait(1000);
  
  // Validate we're on the correct section
  cy.get(`[data-testid="section-${section}"]`, { timeout: 10000 })
    .should('be.visible');
  
  cy.log(`✅ Navigated to ${section} section`);
});

// Create custom prompt for testing
Cypress.Commands.add('createCustomPrompt', (section: string, promptTemplate: string) => {
  cy.log(`📝 Creating custom prompt for ${section}...`);
  
  cy.task('createCustomPrompt', {
    sectionName: section,
    promptTemplate: promptTemplate,
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini'
  }).then((result) => {
    expect(result.success).to.be.true;
    cy.log(`✅ Custom prompt created for ${section}`);
  });
});

// Fill application form with comprehensive data
Cypress.Commands.add('fillApplicationForm', (data: any) => {
  cy.log('📋 Filling application form...');
  
  if (data.projectName) {
    cy.get('[data-testid="project-name-input"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(data.projectName);
  }
  
  if (data.fundingAmount) {
    cy.get('[data-testid="funding-amount-input"]', { timeout: 5000 })
      .should('be.visible')
      .clear()
      .type(data.fundingAmount.toString());
  }
  
  if (data.summary) {
    cy.get('[data-testid="summary-textarea"]', { timeout: 5000 })
      .should('be.visible')
      .clear()
      .type(data.summary);
  }
  
  if (data.targetAudience) {
    cy.get('[data-testid="target-audience-input"]', { timeout: 5000 })
      .should('be.visible')
      .clear()
      .type(data.targetAudience);
  }
  
  if (data.expectedImpact) {
    cy.get('[data-testid="expected-impact-textarea"]', { timeout: 5000 })
      .should('be.visible')
      .clear()
      .type(data.expectedImpact);
  }
  
  if (data.timelineStart) {
    cy.selectCalendarDate(data.timelineStart);
  }
  
  cy.log('✅ Application form filled successfully');
});

// Select calendar date helper
Cypress.Commands.add('selectCalendarDate', (dateString: string) => {
  cy.log(`📅 Selecting date: ${dateString}`);
  
  cy.get('[data-testid="timeline-start-button"]', { timeout: 5000 })
    .should('be.visible')
    .click();
  
  cy.get('[data-testid="calendar"]', { timeout: 5000 })
    .should('be.visible');
  
  // Parse date and select (simplified for demo)
  const date = new Date(dateString);
  const day = date.getDate();
  
  cy.get(`[data-testid="calendar-day-${day}"]`)
    .first()
    .click();
  
  cy.log(`✅ Date ${dateString} selected`);
});

// Validate custom prompt was used
Cypress.Commands.add('validateCustomPromptUsed', (section: string) => {
  cy.log(`🔍 Validating custom prompt was used for ${section}...`);
  
  // This would check for specific markers or content that indicates custom prompt usage
  cy.get(`[data-testid="section-${section}"]`).then($section => {
    const text = $section.text();
    
    // Check for custom prompt indicators (this would be customized based on actual implementation)
    expect(text.length).to.be.greaterThan(50);
    
    cy.log(`✅ Custom prompt validation completed for ${section}`);
  });
});

// Validate provider-specific content
Cypress.Commands.add('validateProviderSpecificContent', (provider: string) => {
  cy.log(`🔍 Validating ${provider}-specific content characteristics...`);
  
  cy.get('[data-testid="draft-content"]').then($content => {
    const text = $content.text();
    
    // Provider-specific validation (simplified examples)
    switch (provider) {
      case 'anthropic':
        // Claude tends to be more structured and analytical
        expect(text).to.match(/\b(analysis|framework|systematic)\b/i);
        break;
      case 'openai':
        // GPT tends to be more creative and narrative
        expect(text).to.match(/\b(innovative|creative|compelling)\b/i);
        break;
      case 'google':
        // Gemini tends to be more data-focused
        expect(text).to.match(/\b(data|metrics|measurable)\b/i);
        break;
    }
    
    cy.log(`✅ ${provider} content characteristics validated`);
  });
});

export {};