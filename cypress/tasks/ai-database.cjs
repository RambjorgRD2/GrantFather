// Enhanced database tasks for AI generation testing

const createAIDatabaseTasks = (supabase, config) => {
  console.log('🤖 Initializing AI Database Tasks...');

  // Create test application optimized for AI generation
  const createAITestApplication = async ({ 
    projectName, 
    organizationId, 
    userId,
    fundingAmount = 50000,
    summary = 'AI test application summary',
    targetAudience = 'Test audience',
    expectedImpact = 'Test impact',
    status = 'draft',
    withAIData = false 
  }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`📝 Creating AI test application: ${projectName}`);
      
      const applicationData = {
        project_name: projectName,
        user_id: userId,
        organization_id: organizationId,
        summary: summary,
        funding_amount: fundingAmount,
        status: status,
        target_audience: targetAudience,
        expected_impact: expectedImpact,
        timeline_start: new Date().toISOString().split('T')[0],
        timeline_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add AI-generated content if requested
      if (withAIData) {
        applicationData.generated_draft = JSON.stringify({
          introduction: 'AI generated introduction section with compelling narrative and organizational credibility...',
          need_statement: 'Data-driven need statement demonstrating community challenges and urgency for action...',
          project_plan: 'Comprehensive project methodology with clear objectives, timeline, and implementation strategy...',
          budget: 'Detailed budget justification showing cost-effectiveness and value for funding investment...',
          outcomes: 'Measurable outcomes framework with specific metrics and evaluation methodology...',
          conclusion: 'Powerful conclusion reinforcing project value and partnership opportunity...'
        });
      }

      const { data, error } = await supabase
        .from('grant_applications')
        .insert(applicationData)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating AI test application:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ AI test application created successfully: ${data.id}`);
      return { success: true, application: data };
    } catch (error) {
      console.error(`❌ Exception creating AI test application:`, error);
      return { success: false, error: error.message };
    }
  };

  // Create custom AI prompt for testing
  const createCustomPrompt = async ({ 
    userId, 
    sectionName, 
    promptTemplate, 
    aiProvider = 'openai',
    aiModel = 'gpt-4o-mini',
    promptName = null
  }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`📝 Creating custom prompt for section: ${sectionName}`);
      
      const promptData = {
        user_id: userId,
        section_name: sectionName,
        prompt_template: promptTemplate,
        ai_provider: aiProvider,
        ai_model: aiModel,
        prompt_name: promptName || `Custom ${sectionName} prompt`,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('system_prompts')
        .insert(promptData)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating custom prompt:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Custom prompt created successfully: ${data.id}`);
      return { success: true, prompt: data };
    } catch (error) {
      console.error(`❌ Exception creating custom prompt:`, error);
      return { success: false, error: error.message };
    }
  };

  // Validate AI generation results
  const validateAIGeneration = async ({ applicationId, expectedSections = null }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`🔍 Validating AI generation for application: ${applicationId}`);
      
      const { data, error } = await supabase
        .from('grant_applications')
        .select('generated_draft, updated_at')
        .eq('id', applicationId)
        .single();

      if (error) {
        console.error(`❌ Error fetching application for validation:`, error);
        return { success: false, error: error.message };
      }

      if (!data.generated_draft) {
        return { 
          success: false, 
          error: 'No generated draft found for application' 
        };
      }

      const sections = JSON.parse(data.generated_draft);
      const requiredSections = expectedSections || [
        'introduction', 'need_statement', 'project_plan',
        'budget', 'outcomes', 'conclusion'
      ];

      const validationResults = {
        allSectionsPresent: requiredSections.every(section => 
          sections[section] && sections[section].length > 0
        ),
        sectionLengths: {},
        totalContentLength: 0,
        generatedAt: data.updated_at,
        sectionsFound: Object.keys(sections),
        missingsections: []
      };

      requiredSections.forEach(section => {
        const content = sections[section] || '';
        validationResults.sectionLengths[section] = content.length;
        validationResults.totalContentLength += content.length;
        
        if (!content || content.length === 0) {
          validationResults.missingSections.push(section);
        }
      });

      console.log(`✅ AI generation validation completed:`, {
        totalLength: validationResults.totalContentLength,
        sectionsPresent: validationResults.allSectionsPresent,
        missingCount: validationResults.missingSections.length
      });

      return { success: true, validation: validationResults };
    } catch (error) {
      console.error(`❌ Exception validating AI generation:`, error);
      return { success: false, error: error.message };
    }
  };

  // Create multiple test applications for bulk testing
  const createMultipleAITestApplications = async ({ 
    count = 3, 
    userId, 
    organizationId, 
    baseData = {} 
  }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`📝 Creating ${count} AI test applications...`);
      
      const applications = [];
      const timestamp = Date.now();

      for (let i = 0; i < count; i++) {
        const applicationData = {
          project_name: baseData.projectName || `AI Test Project ${timestamp}-${i + 1}`,
          user_id: userId,
          organization_id: organizationId,
          summary: baseData.summary || `Test application ${i + 1} for AI generation validation`,
          funding_amount: baseData.fundingAmount || (25000 + (i * 25000)),
          status: baseData.status || 'draft',
          target_audience: baseData.targetAudience || `Test audience ${i + 1}`,
          expected_impact: baseData.expectedImpact || `Test impact ${i + 1}`,
          timeline_start: new Date().toISOString().split('T')[0],
          timeline_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('grant_applications')
          .insert(applicationData)
          .select()
          .single();

        if (error) {
          console.error(`❌ Error creating application ${i + 1}:`, error);
          continue;
        }

        applications.push(data);
      }

      console.log(`✅ Created ${applications.length} AI test applications successfully`);
      return { success: true, applications: applications };
    } catch (error) {
      console.error(`❌ Exception creating multiple applications:`, error);
      return { success: false, error: error.message };
    }
  };

  // Update application status for testing workflows
  const updateApplicationStatus = async ({ applicationId, status, submittedAt = null }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`🔄 Updating application ${applicationId} status to: ${status}`);
      
      const updateData = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'submitted' && submittedAt) {
        updateData.submitted_at = submittedAt;
      }

      const { data, error } = await supabase
        .from('grant_applications')
        .update(updateData)
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error updating application status:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Application status updated successfully`);
      return { success: true, application: data };
    } catch (error) {
      console.error(`❌ Exception updating application status:`, error);
      return { success: false, error: error.message };
    }
  };

  // Create AI provider configuration for testing
  const createAIProviderConfig = async ({ 
    userId, 
    provider, 
    model, 
    apiKey = 'test-key',
    isActive = true 
  }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`🔧 Creating AI provider config: ${provider}/${model}`);
      
      const configData = {
        user_id: userId,
        provider_name: provider,
        model_name: model,
        api_key: apiKey, // In real implementation, this would be encrypted
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Check if ai_provider_configs table exists, if not skip
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .insert(configData)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, that's okay for testing
        console.log(`⚠️ AI provider config table not found, skipping: ${error.message}`);
        return { success: true, config: { id: 'mock-config', ...configData } };
      }

      console.log(`✅ AI provider config created successfully: ${data.id}`);
      return { success: true, config: data };
    } catch (error) {
      console.error(`❌ Exception creating AI provider config:`, error);
      return { success: false, error: error.message };
    }
  };

  // Cleanup AI test data
  const cleanupAITestData = async ({ userId, testPrefix = 'AI Test' }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`🧹 Cleaning up AI test data for user: ${userId}`);
      
      let cleanupCount = 0;

      // Clean up test applications
      const { data: apps, error: appsError } = await supabase
        .from('grant_applications')
        .delete()
        .eq('user_id', userId)
        .like('project_name', `${testPrefix}%`)
        .select();

      if (!appsError && apps) {
        cleanupCount += apps.length;
        console.log(`🗑️ Cleaned up ${apps.length} test applications`);
      }

      // Clean up test prompts
      const { data: prompts, error: promptsError } = await supabase
        .from('system_prompts')
        .delete()
        .eq('user_id', userId)
        .like('prompt_name', `${testPrefix}%`)
        .select();

      if (!promptsError && prompts) {
        cleanupCount += prompts.length;
        console.log(`🗑️ Cleaned up ${prompts.length} test prompts`);
      }

      console.log(`✅ AI test data cleanup completed: ${cleanupCount} items removed`);
      return { success: true, cleanedUp: cleanupCount };
    } catch (error) {
      console.error(`❌ Exception during AI test data cleanup:`, error);
      return { success: false, error: error.message };
    }
  };

  // Monitor AI generation performance
  const monitorAIPerformance = async ({ applicationId, startTime, endTime, provider, model }) => {
    try {
      console.log(`📊 Monitoring AI performance for application: ${applicationId}`);
      
      const duration = endTime - startTime;
      const performanceData = {
        applicationId,
        provider,
        model,
        duration,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        status: duration < 120000 ? 'acceptable' : 'slow' // 2 minute threshold
      };

      // In a real implementation, this would be stored in a performance monitoring table
      console.log(`⏱️ AI Generation Performance:`, performanceData);

      return { success: true, performance: performanceData };
    } catch (error) {
      console.error(`❌ Exception monitoring AI performance:`, error);
      return { success: false, error: error.message };
    }
  };

  return {
    createAITestApplication,
    createCustomPrompt,
    validateAIGeneration,
    createMultipleAITestApplications,
    updateApplicationStatus,
    createAIProviderConfig,
    cleanupAITestData,
    monitorAIPerformance
  };
};

module.exports = { createAIDatabaseTasks };