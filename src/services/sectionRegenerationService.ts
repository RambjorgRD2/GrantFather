import { supabase } from '@/integrations/supabase/client';
import { errorHandlingService } from './errorHandlingService';
import { cacheService, CacheKeys } from './cacheService';
import { performanceService } from './performanceService';
import { 
  ApplicationContext, 
  SectionRegenerationRequest, 
  SectionRegenerationResponse,
  GrantSectionKey 
} from '@/types/grantApplication';

export interface SectionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SectionRegenerationService {
  private static instance: SectionRegenerationService;

  public static getInstance(): SectionRegenerationService {
    if (!SectionRegenerationService.instance) {
      SectionRegenerationService.instance = new SectionRegenerationService();
    }
    return SectionRegenerationService.instance;
  }

  /**
   * Validates if a section can be regenerated based on application data completeness
   */
  public async validateSection(
    sectionKey: string,
    application: ApplicationContext
  ): Promise<SectionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields for any section regeneration
    const requiredFields = ['project_name', 'summary'];
    const missingRequired = requiredFields.filter(field => !application[field as keyof ApplicationContext]);
    
    if (missingRequired.length > 0) {
      errors.push(`Missing required fields: ${missingRequired.join(', ')}`);
    }

    // Organization data validation
    if (!application.organizations?.name || !application.organizations?.mission) {
      errors.push('Organization name and mission are required');
    }

    // Section-specific validation
    switch (sectionKey) {
      case 'budget':
        if (!application.funding_amount) {
          warnings.push('Funding amount not specified - using placeholder values');
        }
        break;
      case 'project_plan':
        if (!application.timeline_start || !application.timeline_end) {
          warnings.push('Project timeline not specified - using placeholder dates');
        }
        break;
      case 'outcomes':
        if (!application.expected_impact) {
          warnings.push('Expected impact not specified - using generic impact description');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Builds a section-specific prompt with context and tone instructions
   */
  public buildSectionPrompt(
    section: string,
    context: ApplicationContext,
    tone?: string,
    improvement?: string
  ): string {
    const sectionConfig = this.getSectionConfiguration(section);
    const toneInstructions = this.getToneInstructions(tone);
    const improvementInstructions = this.getImprovementInstructions(improvement);

    const projectContext = this.buildProjectContext(context);
    
    return `${sectionConfig.promptTemplate}

${projectContext}

${toneInstructions}

${improvementInstructions}

CRITICAL INSTRUCTIONS:
- Generate content ONLY for this specific project using the exact details provided above
- DO NOT create generic or fictional content
- DO NOT invent additional project details, statistics, or examples
- Use ONLY the organization name, mission, and project details provided
- Base all content on the actual project summary and target audience specified
- Reference the exact funding amount and timeline provided
- Focus on the specific expected impact described above
- If any detail is missing, acknowledge it and work with available information`;
  }

  /**
   * Processes AI response and applies section-specific optimizations
   */
  public processAIResponse(response: string, section: string): string {
    // Remove any markdown formatting that might interfere with display
    const processedContent = response
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '');

    // Return clean AI response without appended generic phrases
    return processedContent.trim();
  }

  /**
   * PHASE 5: Regenerates a specific section using the edge function with progress callback
   */
  public async regenerateSection(
    request: SectionRegenerationRequest,
    onProgress?: (message: string) => void
  ): Promise<SectionRegenerationResponse> {
    const startTime = performance.now();
    const TIMEOUT_MS = 45000; // 45 seconds
    
    try {
      // PHASE 5: Notify progress
      onProgress?.('Preparing AI generation...');
      
      // Check cache first with proper key including tone and improvement
      const cacheKey = this.buildCacheKey(request);
      
      const cachedResponse = cacheService.get<SectionRegenerationResponse>(cacheKey);
      if (cachedResponse) {
        performanceService.trackAuthPerformance(
          `ai_generation:${request.section}`,
          performance.now() - startTime,
          true
        );
        return cachedResponse;
      }
      
      // PHASE 5: Notify progress
      onProgress?.('Loading application data...');
      
      // Get application context
      const { data: application, error: appError } = await supabase
        .from('grant_applications')
        .select(`
          *,
          organizations!fk_grant_applications_organization_id (
            name,
            mission,
            org_type,
            contact_name,
            contact_email,
            members_count,
            ui_language,
            ai_response_language
          )
        `)
        .eq('id', request.applicationId)
        .single();

      if (appError || !application) {
        throw new Error(`Failed to fetch application: ${appError?.message || 'Application not found'}`);
      }

      // Validate section can be regenerated  
      // Create safe organization context
      const defaultOrg = { name: 'Unknown Organization', org_type: 'nonprofit', mission: 'No mission provided' };
      
      const context: ApplicationContext = {
        ...application,
        organizations: defaultOrg
      };
      
      const validation = await this.validateSection(String(request.section), context);
      if (!validation.isValid) {
        return {
          success: false,
          section: request.section,
          content: '',
          error: validation.errors.join(', ')
        };
      }

      // Create timeout promise factory
      const makeTimeout = () => new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI generation timed out after 45 seconds. Please try again with a simpler prompt or different model.')), TIMEOUT_MS);
      });

      const invokeEdgeFunction = (provider: string, model: string) =>
        Promise.race([
          supabase.functions.invoke('ai-grant-writer', {
            body: {
              applicationId: request.applicationId,
              section: request.section,
              tone: request.tone || 'formal',
              aiProvider: provider,
              model,
              improvement: request.improvement,
            },
          }),
          makeTimeout(),
        ]);

      // PHASE 5: Notify progress
      onProgress?.('Calling AI provider...');

      const primaryProvider = request.aiProvider || 'anthropic';
      const primaryModel = request.model || 'claude-sonnet-4-5';

      let result = await invokeEdgeFunction(primaryProvider, primaryModel);

      // Provider fallback: if primary fails and it wasn't already OpenAI, retry with gpt-4o-mini
      if (result.error && primaryProvider !== 'openai') {
        onProgress?.('Primary provider unavailable — retrying with OpenAI...');
        result = await invokeEdgeFunction('openai', 'gpt-4o-mini');
      }

      const { data, error: functionError } = result;

      // PHASE 5: Notify progress
      onProgress?.('Processing AI response...');

      // Validate response exists
      if (!data) {
        throw new Error('Edge function returned null response');
      }
      
      // Validate response structure
      if (typeof data !== 'object') {
        throw new Error('Edge function returned invalid response format');
      }

      // Check for error in response
      if (functionError) {
        throw new Error(functionError.message || 'Edge function error');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to regenerate section');
      }

      // Validate content exists and is not empty
      if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('AI generated empty content. Please try again.');
      }

      // Process the response content
      const processedContent = this.processAIResponse(data.content, String(request.section));
      
      // Final validation of processed content
      if (!processedContent || processedContent.trim().length === 0) {
        throw new Error('Content processing resulted in empty output');
      }

      const response: SectionRegenerationResponse = {
        success: true,
        section: request.section,
        content: processedContent
      };

      // Cache the response
      cacheService.set(cacheKey, response, 10 * 60 * 1000); // 10 minutes

      // Track performance
      performanceService.trackAuthPerformance(
        `ai_generation:${request.section}`,
        performance.now() - startTime,
        true
      );

      return response;

    } catch (error) {
      // Track performance for failed requests — error details captured below
      
      // Track performance for failed requests
      performanceService.trackAuthPerformance(
        `ai_generation:${request.section}`,
        performance.now() - startTime,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      const errorDetails = errorHandlingService.handleAIError(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'SectionRegenerationService',
          action: 'regenerateSection',
          applicationId: request.applicationId,
        },
        undefined, // No retry function for this level
        0 // No retries at this level
      );

      return {
        success: false,
        section: request.section,
        content: '',
        error: error instanceof Error ? error.message : 'An error occurred during section regeneration'
      };
    }
  }

  /**
   * Builds cache key including all parameters that affect the output
   */
  private buildCacheKey(request: SectionRegenerationRequest): string {
    return `ai_response:${request.applicationId}:${request.section}:${request.aiProvider}:${request.model}:${request.tone || 'default'}:${request.improvement || 'none'}`;
  }

  /**
   * Gets section-specific configuration including prompts and settings
   */
  private getSectionConfiguration(section: string) {
    const configs = {
      introduction: {
        promptTemplate: `Create a compelling, award-winning introduction section that immediately captures attention and establishes credibility.

GRANT WRITING STRATEGY:
1. OPENING HOOK: Begin with a compelling statistic, story, or statement that immediately captures attention
2. CREDIBILITY ESTABLISHMENT: Demonstrate proven track record, expertise, and organizational capacity
3. PROBLEM-SOLUTION ALIGNMENT: Clearly connect the identified need with your proposed solution
4. FUNDER MISSION ALIGNMENT: Show how this project directly supports the funder's goals and values
5. VALUE PROPOSITION: Articulate the unique value and competitive advantage of your approach

WRITING REQUIREMENTS:
- Professional tone with emotional resonance
- Data-driven credibility statements
- Clear stakeholder benefit articulation
- Compelling narrative flow
- 2-3 paragraphs maximum
- End with a strong transition to the need statement

SUCCESS FACTORS:
- Create immediate funder engagement
- Establish organizational trust and competence
- Demonstrate clear understanding of the problem
- Show alignment with funder priorities
- Set up compelling case for funding`,
        maxTokens: 800,
        temperature: 0.7
      },
      need_statement: {
        promptTemplate: `Create a data-driven, compelling need statement that quantifies the problem and creates urgency.

GRANT WRITING STRATEGY:
1. PROBLEM IDENTIFICATION: Use specific data, statistics, and research to quantify the scope and severity
2. COMMUNITY IMPACT: Demonstrate how this issue affects real people, families, and communities
3. URGENCY AND TIMELINESS: Show why immediate action is critical and why this moment is the right time
4. GAP ANALYSIS: Identify what's currently missing and why existing solutions are insufficient
5. STAKEHOLDER VOICES: Incorporate perspectives from affected communities, experts, and partners
6. EVIDENCE-BASED ARGUMENTATION: Use research, studies, and data to support your claims

WRITING REQUIREMENTS:
- Lead with compelling statistics or research findings
- Include specific examples and case studies
- Demonstrate comprehensive understanding of the problem
- Show clear connection between problem and proposed solution
- Use emotional storytelling while maintaining credibility
- 3-4 paragraphs with clear structure

SUCCESS FACTORS:
- Make the problem feel urgent and solvable
- Demonstrate deep understanding of root causes
- Show clear connection to funder priorities
- Build emotional investment in the solution
- Establish foundation for project justification`,
        maxTokens: 1000,
        temperature: 0.7
      },
      project_plan: {
        promptTemplate: `Create a comprehensive, evidence-based project plan with clear methodology and implementation strategy.

GRANT WRITING STRATEGY:
1. SMART OBJECTIVES: Define Specific, Measurable, Achievable, Relevant, and Time-bound goals
2. EVIDENCE-BASED METHODOLOGY: Use proven approaches backed by research and best practices
3. IMPLEMENTATION FRAMEWORK: Provide clear step-by-step process with milestones and deliverables
4. RISK MITIGATION: Identify potential challenges and demonstrate proactive solutions
5. TEAM EXPERTISE: Highlight key personnel, qualifications, and capacity
6. INNOVATION INTEGRATION: Show how your approach builds on or improves existing methods
7. PARTNERSHIP STRATEGY: Demonstrate collaboration with stakeholders and community partners

WRITING REQUIREMENTS:
- Start with clear project objectives and outcomes
- Provide detailed methodology with rationale
- Include specific timeline with key milestones
- Demonstrate team capacity and expertise
- Show innovation and best practice integration
- Address potential risks and mitigation strategies
- 4-5 paragraphs with clear structure

SUCCESS FACTORS:
- Demonstrate clear path from problem to solution
- Show evidence-based approach and methodology
- Establish credibility through team expertise
- Demonstrate innovation and best practices
- Build confidence in project success`,
        maxTokens: 1200,
        temperature: 0.7
      },
      budget: {
        promptTemplate: `Create a comprehensive budget justification that demonstrates cost-effectiveness and value for money.

GRANT WRITING STRATEGY:
1. COST-EFFECTIVENESS ANALYSIS: Demonstrate how your budget maximizes impact per dollar spent
2. LEVERAGING AND MATCHING: Show additional resources, in-kind contributions, and partnership funding
3. DETAILED LINE-ITEM JUSTIFICATION: Provide clear rationale for each major expense category
4. ADMINISTRATIVE VS. PROGRAM OPTIMIZATION: Show appropriate balance between direct services and overhead
5. MULTI-YEAR SUSTAINABILITY: Demonstrate how this funding builds toward long-term success
6. VALUE FOR MONEY: Show how your approach delivers superior outcomes compared to alternatives

WRITING REQUIREMENTS:
- Start with overall budget philosophy and approach
- Provide detailed breakdown of major expense categories
- Justify each major line item with clear rationale
- Show cost-effectiveness and value for money
- Demonstrate leveraging of additional resources
- Address sustainability and long-term impact
- 3-4 paragraphs with clear structure

SUCCESS FACTORS:
- Demonstrate fiscal responsibility and transparency
- Show maximum impact for funding investment
- Build confidence in financial management
- Demonstrate sustainability and scalability
- Show clear connection between costs and outcomes`,
        maxTokens: 1000,
        temperature: 0.7
      },
      outcomes: {
        promptTemplate: `Create a comprehensive outcomes and evaluation framework with measurable results and accountability.

GRANT WRITING STRATEGY:
1. LOGIC MODEL FRAMEWORK: Show clear connection between inputs, activities, outputs, and outcomes
2. SMART MEASURABLE OUTCOMES: Define Specific, Measurable, Achievable, Relevant, and Time-bound results
3. MIXED-METHODS EVALUATION: Combine quantitative and qualitative data collection approaches
4. DATA COLLECTION PROTOCOLS: Specify how, when, and by whom data will be collected
5. REPORTING AND ACCOUNTABILITY: Demonstrate clear reporting mechanisms and transparency
6. LONG-TERM IMPACT ASSESSMENT: Show how short-term outcomes lead to sustainable change
7. CONTINUOUS IMPROVEMENT: Demonstrate how evaluation results inform program refinement

WRITING REQUIREMENTS:
- Start with clear outcome framework and logic model
- Define specific, measurable outcomes with targets
- Describe evaluation methodology and data collection
- Show reporting protocols and accountability measures
- Demonstrate long-term impact and sustainability
- Include continuous improvement mechanisms
- 4-5 paragraphs with clear structure

SUCCESS FACTORS:
- Demonstrate clear path to measurable impact
- Show rigorous evaluation and accountability
- Build confidence in outcome achievement
- Demonstrate sustainability and scalability
- Show commitment to continuous improvement`,
        maxTokens: 1200,
        temperature: 0.7
      },
      conclusion: {
        promptTemplate: `Create a compelling, action-oriented conclusion that inspires immediate support and partnership.

GRANT WRITING STRATEGY:
1. COMPELLING CALL TO ACTION: Create urgency and inspire immediate support
2. FUNDER PARTNERSHIP VISION: Show the funder as a key partner in transformation
3. COMMUNITY TRANSFORMATION PROMISE: Paint a vivid picture of the future impact
4. LEGACY AND IMPACT REINFORCEMENT: Emphasize the lasting change this funding will create
5. PROFESSIONAL CLOSING: End with gratitude and confidence in partnership success
6. EMOTIONAL RESONANCE: Connect with funder values and mission

WRITING REQUIREMENTS:
- Reinforce key value propositions and unique advantages
- Create compelling vision of future impact
- Show clear connection between funding and transformation
- Demonstrate confidence in success and partnership
- Include specific call to action for funder
- End with gratitude and partnership vision
- 2-3 paragraphs with powerful closing

SUCCESS FACTORS:
- Inspire immediate action and support
- Create emotional investment in success
- Demonstrate confidence and competence
- Show clear value for funder investment
- End with memorable, compelling message`,
        maxTokens: 800,
        temperature: 0.7
      }
    };

    return configs[section as keyof typeof configs] || configs.introduction;
  }

  /**
   * Builds project context string for prompts
   */
  private buildProjectContext(context: ApplicationContext): string {
    return `
CRITICAL CONTEXT - USE ONLY THIS SPECIFIC PROJECT DATA:

PROJECT DETAILS:
- Project Name: "${context.project_name}"
- Organization: "${context.organizations.name}" (${context.organizations.org_type})
- Organization Mission: "${context.organizations.mission}"
- Project Summary: "${context.summary}"
- Target Audience: "${context.target_audience}"
- Timeline: ${context.timeline_start} to ${context.timeline_end}
- Funding Amount: ${context.funding_amount} NOK
- Expected Impact: "${context.expected_impact}"`;
  }

  /**
   * Gets tone-specific instructions
   */
  private getToneInstructions(tone?: string): string {
    const toneInstructions = {
      formal: `Use formal, professional language with sophisticated vocabulary and academic tone. 
        - Employ precise, technical terminology appropriate for institutional funders
        - Maintain authoritative voice while demonstrating expertise
        - Use complex sentence structures that convey professionalism
        - Include data-driven language and evidence-based statements
        - Balance formality with accessibility for diverse audiences`,
      
      persuasive: `Use compelling, persuasive language that creates urgency and emotional investment.
        - Employ powerful action verbs and dynamic language
        - Create emotional resonance through storytelling and vivid examples
        - Use rhetorical devices (repetition, parallel structure, contrast)
        - Emphasize impact, urgency, and transformative potential
        - Build momentum through progressive argumentation
        - Include compelling statistics and evidence to support claims`,
      
      concise: `Be extremely concise and direct, focusing on key points without unnecessary elaboration.
        - Use short, impactful sentences and clear structure
        - Eliminate redundancy and unnecessary words
        - Lead with most important information first
        - Use bullet points and lists where appropriate
        - Focus on actionable outcomes and measurable results
        - Maintain clarity while maximizing information density`,
      
      academic: `Use academic writing style with evidence-based language and scholarly tone.
        - Employ research-based language and citation-style references
        - Use theoretical frameworks and conceptual models
        - Include methodological rigor and systematic analysis
        - Demonstrate deep understanding of field-specific knowledge
        - Balance theoretical sophistication with practical application
        - Use peer-reviewed research and authoritative sources`,
      
      conversational: `Use a warm, conversational tone while maintaining professionalism and credibility.
        - Employ inclusive, accessible language that builds connection
        - Use personal stories and relatable examples
        - Create dialogue-like flow that engages the reader
        - Balance warmth with competence and reliability
        - Use "we" and "you" to create partnership feeling
        - Maintain professional standards while being approachable`,
      
      strategic: `Use strategic, business-oriented language that emphasizes ROI and competitive advantage.
        - Employ business terminology and strategic frameworks
        - Emphasize cost-effectiveness and value proposition
        - Use competitive analysis and market positioning language
        - Demonstrate strategic thinking and long-term vision
        - Include risk assessment and mitigation strategies
        - Show clear path to sustainable impact and scalability`,
      
      innovative: `Use forward-thinking, innovative language that emphasizes creativity and breakthrough potential.
        - Employ cutting-edge terminology and emerging concepts
        - Emphasize innovation, creativity, and breakthrough approaches
        - Use visionary language that paints future possibilities
        - Demonstrate disruptive thinking and paradigm shifts
        - Include experimental methodologies and pilot programs
        - Show how this approach transforms existing paradigms`
    };

    return tone ? `\n\nTONE INSTRUCTION: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.formal}` : '';
  }

  /**
   * Gets improvement-specific instructions
   */
  private getImprovementInstructions(improvement?: string): string {
    const improvementInstructions = {
      compelling: `Make the content more compelling and engaging:
        - Add stronger emotional hooks and storytelling elements
        - Use more vivid language and concrete examples
        - Create stronger urgency and call-to-action elements
        - Enhance the narrative flow and reader engagement`,
      
      clarity: `Improve clarity and readability:
        - Simplify complex sentences and technical jargon
        - Use clearer structure and better organization
        - Add transitional phrases for better flow
        - Ensure each paragraph has a clear main point`,
      
      evidence: `Add more evidence and data-driven content:
        - Include specific statistics, research findings, or case studies
        - Add quantitative data where appropriate
        - Reference authoritative sources and best practices
        - Provide concrete examples and proof points`,
      
      concise: `Make the content more concise and focused:
        - Eliminate redundant or unnecessary information
        - Use shorter, more impactful sentences
        - Focus on the most important points
        - Remove filler words and phrases`
    };

    return improvement ? `\n\nIMPROVEMENT INSTRUCTION: ${improvementInstructions[improvement as keyof typeof improvementInstructions] || ''}` : '';
  }

  // Removed section-specific hardcoded optimization methods to avoid generic appended phrases
}

// Export singleton instance
export const sectionRegenerationService = SectionRegenerationService.getInstance();
