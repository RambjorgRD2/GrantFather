import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { callAIProvider, isProviderAvailable } from './multi-provider-support.ts';

// PHASE 3: Deployment Version Tracking
const FUNCTION_VERSION = '2.0.1';
const DEPLOYMENT_TIMESTAMP = new Date().toISOString();

console.log(`[AI-GRANT-WRITER] ✅ Function deployed - Version: ${FUNCTION_VERSION}, Time: ${DEPLOYMENT_TIMESTAMP}`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Valid OpenAI models
const VALID_OPENAI_MODELS = [
  'gpt-5-2025-08-07',
  'gpt-5-mini-2025-08-07',
  'gpt-5-nano-2025-08-07',
  'gpt-4.1-2025-04-14',
  'gpt-4.1-mini-2025-04-14',
  'gpt-4o-mini',
  'gpt-4o',
  'o3-2025-04-16',
  'o4-mini-2025-04-16',
];

// Validate model name
function validateModel(model: string, provider: string): string {
  if (provider === 'openai') {
    if (!VALID_OPENAI_MODELS.includes(model)) {
      console.error(`[AI-GRANT-WRITER] Invalid OpenAI model: ${model}`);
      console.log(`[AI-GRANT-WRITER] Valid models: ${VALID_OPENAI_MODELS.join(', ')}`);
      // Return default model instead of throwing to maintain functionality
      return 'gpt-5-2025-08-07';
    }
  }
  return model;
}

// Check if model requires max_completion_tokens instead of max_tokens
function requiresMaxCompletionTokens(model: string): boolean {
  const newModels = [
    'gpt-5-2025-08-07',
    'gpt-5-mini-2025-08-07',
    'gpt-5-nano-2025-08-07',
    'gpt-4.1-2025-04-14',
    'gpt-4.1-mini-2025-04-14',
    'o3-2025-04-16',
    'o4-mini-2025-04-16',
  ];
  return newModels.includes(model);
}

// Build OpenAI request body with correct parameters based on model
function buildOpenAIRequest(model: string, messages: any[], section: string | undefined) {
  const baseRequest: any = {
    model,
    messages,
  };
  
  const tokenLimit = section ? 1000 : 3000;
  
  // Newer models use max_completion_tokens and don't support temperature
  if (requiresMaxCompletionTokens(model)) {
    baseRequest.max_completion_tokens = tokenLimit;
    // Temperature not supported - defaults to 1.0
  } else {
    // Legacy models use max_tokens and support temperature
    baseRequest.max_tokens = tokenLimit;
    baseRequest.temperature = 0.7;
  }
  
  return baseRequest;
}

// AI Grant Writer - Enhanced with retry logic and comprehensive error handling
// Retry utility with exponential backoff
async function callOpenAIWithRetry(requestBody: any, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI-GRANT-WRITER] OpenAI API call attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log(`[AI-GRANT-WRITER] OpenAI response status: ${response.status}`);
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json();
      
      // Don't retry on 401 (bad key) or 400 (bad request)
      if (response.status === 401 || response.status === 400) {
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      // Retry on 429 (rate limit) or 5xx (server errors)
      if (attempt < maxRetries && (response.status === 429 || response.status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[AI-GRANT-WRITER] Retry attempt ${attempt}/${maxRetries} after ${delay}ms due to status ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new Error(`OpenAI API failed: ${errorData.error?.message || response.statusText}`);
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`[AI-GRANT-WRITER] All ${maxRetries} attempts failed:`, error);
        throw error;
      }
      console.log(`[AI-GRANT-WRITER] Attempt ${attempt} failed, retrying...`);
    }
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[AI-GRANT-WRITER] Request ${requestId} - START`);
  console.log(`[AI-GRANT-WRITER] Method: ${req.method}`);
  
  // Declare section outside try-catch for error handling access
  let section: string | undefined;
  let applicationId: string | undefined;
  
  // PHASE 3: Enhanced health check endpoint with version info
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return new Response(JSON.stringify({
      status: 'healthy',
      version: FUNCTION_VERSION,
      deployed_at: DEPLOYMENT_TIMESTAMP,
      timestamp: new Date().toISOString(),
      openaiKeyConfigured: !!Deno.env.get('OPENAI_API_KEY'),
      anthropicKeyConfigured: !!Deno.env.get('ANTHROPIC_API_KEY'),
      googleKeyConfigured: !!Deno.env.get('GOOGLE_AI_API_KEY'),
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!,
        },
      },
    });

    const requestBody = await req.json();
    ({ applicationId, section } = requestBody);
    let { tone = 'formal', regenerate = false, aiProvider = 'openai', model = 'gpt-4o-mini', improvement } = requestBody;
    
    // Validate and normalize model name
    model = validateModel(model, aiProvider);
    console.log(`[AI-GRANT-WRITER] Using model: ${model} (provider: ${aiProvider})`);
    
    console.log(`[AI-GRANT-WRITER] Request ${requestId}:`, {
      applicationId,
      section: section || 'full_draft',
      provider: aiProvider,
      model,
      tone,
      userId: 'pending_auth',
      timestamp: new Date().toISOString()
    });

    // Enhanced validation with detailed error messages
    if (!applicationId) {
      throw new Error('applicationId is required');
    }

    if (typeof applicationId !== 'string') {
      throw new Error('applicationId must be a string');
    }

    // Validate section if provided
    if (section && typeof section !== 'string') {
      throw new Error('section must be a string');
    }

    // Validate tone if provided
    if (tone && typeof tone !== 'string') {
      throw new Error('tone must be a string');
    }

    // Validate AI provider if provided
    if (aiProvider && typeof aiProvider !== 'string') {
      throw new Error('aiProvider must be a string');
    }

    // Validate model if provided
    if (model && typeof model !== 'string') {
      throw new Error('model must be a string');
    }

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`[AI-GRANT-WRITER] Request ${requestId} - Auth failed:`, authError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Unauthorized - Please log in to generate grant content',
        timestamp: new Date().toISOString(),
        requestId,
        section: section || null
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[AI-GRANT-WRITER] Request ${requestId} - User authenticated: ${user.id}`);

    // Get application data with organization info
    const { data: application, error: appError } = await supabase
      .from('grant_applications')
      .select(`
        *,
        organizations!fk_grant_applications_organization_id (
          name, 
          mission, 
          org_type,
          ui_language,
          ai_response_language
        )
      `)
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      console.error(`[AI-GRANT-WRITER] Request ${requestId} - Application not found:`, appError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Grant application not found or you do not have access to it',
        timestamp: new Date().toISOString(),
        requestId,
        section: section || null
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[AI-GRANT-WRITER] Request ${requestId} - Application loaded:`, {
      projectName: application.project_name,
      organizationId: application.organization_id
    });

    // Enhanced application data validation
    const validateApplicationData = () => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Required fields validation
      const requiredFields = ['project_name', 'summary'];
      const missingRequiredFields = requiredFields.filter(field => !application[field]);
      
      if (missingRequiredFields.length > 0) {
        errors.push(`Missing required application data: ${missingRequiredFields.join(', ')}. Please complete the project name and summary before generating content.`);
      }
      
      // Organization data validation with defaults
      if (!application.organizations) {
        warnings.push('Organization data not loaded. Using default values.');
        application.organizations = {
          name: 'Organization',
          mission: 'Making a positive impact',
          org_type: 'nonprofit'
        };
      } else {
        if (!application.organizations.name) {
          application.organizations.name = 'Organization';
          warnings.push('Organization name missing. Using default.');
        }
        if (!application.organizations.mission) {
          application.organizations.mission = 'Making a positive impact';
          warnings.push('Organization mission missing. Using default.');
        }
      }
      
      // Optional fields with helpful defaults
      const optionalFields = [
        'target_audience',
        'timeline_start', 
        'timeline_end',
        'funding_amount',
        'expected_impact'
      ];
      
      const missingOptionalFields = optionalFields.filter(field => !application[field]);
      
      if (missingOptionalFields.length > 0) {
        warnings.push(`Missing optional fields: ${missingOptionalFields.join(', ')}. Using default values.`);
        
        // Set default values for missing fields
        if (!application.target_audience) {
          application.target_audience = 'Target beneficiaries and stakeholders';
        }
        if (!application.timeline_start) {
          application.timeline_start = 'Project start date';
        }
        if (!application.timeline_end) {
          application.timeline_end = 'Project completion date';
        }
        if (!application.funding_amount) {
          application.funding_amount = 'Funding amount to be determined';
        }
        if (!application.expected_impact) {
          application.expected_impact = 'Positive impact on target community';
        }
      }
      
      // Section-specific validation
      if (section) {
        switch (section) {
          case 'budget':
            if (!application.funding_amount || application.funding_amount === 'Funding amount to be determined') {
              warnings.push('Funding amount not specified - budget section may be less specific');
            }
            break;
          case 'project_plan':
            if (!application.timeline_start || application.timeline_start === 'Project start date') {
              warnings.push('Project timeline not specified - timeline details may be generic');
            }
            break;
          case 'outcomes':
            if (!application.expected_impact || application.expected_impact === 'Positive impact on target community') {
              warnings.push('Expected impact not specified - outcomes may be less specific');
            }
            break;
        }
      }
      
      // Log warnings for debugging
      if (warnings.length > 0) {
        console.log('Validation warnings:', warnings);
      }
      
      // Throw error if there are critical issues
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }
    };

    // Validate data before generation
    validateApplicationData();

    // Get relevant knowledge base items for context
    const { data: knowledgeItems } = await supabase
      .from('knowledge_base')
      .select('title, content, document_type')
      .eq('organization_id', application.organization_id)
      .eq('is_active', true)
      .limit(3);

    // Build knowledge context
    const knowledgeContext = knowledgeItems?.length ? 
      `\n\nORGANIZATION KNOWLEDGE:\n${knowledgeItems.map(item => 
        `${item.document_type.toUpperCase()}: ${item.title}\n${item.content}`
      ).join('\n\n')}` : '';

    // Get language preference
    const responseLanguage = application.organizations.ai_response_language || 'en';
    const languageInstruction = responseLanguage !== 'en' ? 
      `\n\nIMPORTANT: Respond in ${responseLanguage === 'no' ? 'Norwegian' : responseLanguage === 'sv' ? 'Swedish' : responseLanguage === 'da' ? 'Danish' : responseLanguage}. Use natural, professional language appropriate for grant applications in this language.` : '';

    // Query for custom prompt from system_prompts table
    let customPromptData = null;
    if (section && user.id) {
      const { data: promptData } = await supabase
        .from('system_prompts')
        .select('prompt_template, ai_provider, ai_model')
        .eq('user_id', user.id)
        .eq('section_name', section)
        .maybeSingle();
      
      if (promptData) {
        customPromptData = promptData;
        console.log(`[AI-GRANT-WRITER] Request ${requestId} - Using custom prompt for section: ${section}`);
        
        // Override AI provider/model if specified in custom prompt
        if (promptData.ai_provider) {
          aiProvider = promptData.ai_provider;
          console.log(`[AI-GRANT-WRITER] Request ${requestId} - Override AI provider from prompt: ${aiProvider}`);
        }
        if (promptData.ai_model) {
          model = promptData.ai_model;
          console.log(`[AI-GRANT-WRITER] Request ${requestId} - Override model from prompt: ${model}`);
        }
      }
    }

    // Build section-specific prompt with enhanced context
    const buildSectionPrompt = (sectionName: string) => {
      // Use custom prompt if available
      if (customPromptData?.prompt_template) {
        return `${customPromptData.prompt_template}

ORGANIZATION CONTEXT:
- Organization: ${application.organizations.name} (${application.organizations.org_type})
- Mission: ${application.organizations.mission}
- Project: ${application.project_name}
- Summary: ${application.summary}
- Target Audience: ${application.target_audience}
- Funding Amount: ${application.funding_amount || 'To be determined'}
- Timeline: ${application.timeline_start || 'TBD'} to ${application.timeline_end || 'TBD'}
- Expected Impact: ${application.expected_impact}`;
      }
      
      // Otherwise use default section prompts
      const sectionPrompts = {
        introduction: `Create a compelling, award-winning introduction section for "${application.project_name}" by ${application.organizations.name}.

ORGANIZATION CONTEXT:
- Organization: ${application.organizations.name} (${application.organizations.org_type})
- Mission: ${application.organizations.mission}
- Project: ${application.project_name}
- Target Audience: ${application.target_audience}

GRANT WRITING STRATEGY:
1. OPENING HOOK: Begin with a compelling statistic, story, or statement that immediately captures attention
2. CREDIBILITY ESTABLISHMENT: Demonstrate ${application.organizations.name}'s proven track record and expertise
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

        need_statement: `Create a data-driven, compelling need statement for "${application.project_name}".

PROJECT CONTEXT:
- Project: ${application.project_name}
- Target Audience: ${application.target_audience}
- Expected Impact: ${application.expected_impact}

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

        project_plan: `Create a comprehensive, evidence-based project plan for "${application.project_name}".

PROJECT DETAILS:
- Project: ${application.project_name}
- Timeline: ${application.timeline_start} to ${application.timeline_end}
- Target Audience: ${application.target_audience}
- Expected Impact: ${application.expected_impact}

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

        budget: `Create a comprehensive budget justification for "${application.project_name}".

BUDGET CONTEXT:
- Requested Amount: ${application.funding_amount} NOK
- Project Timeline: ${application.timeline_start} to ${application.timeline_end}
- Project: ${application.project_name}

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

        outcomes: `Create a comprehensive outcomes and evaluation framework for "${application.project_name}".

EVALUATION CONTEXT:
- Project: ${application.project_name}
- Target Audience: ${application.target_audience}
- Timeline: ${application.timeline_start} to ${application.timeline_end}
- Expected Impact: ${application.expected_impact}

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

        conclusion: `Create a compelling, action-oriented conclusion for "${application.project_name}" by ${application.organizations.name}.

CONCLUSION CONTEXT:
- Organization: ${application.organizations.name}
- Project: ${application.project_name}
- Expected Impact: ${application.expected_impact}
- Funding Amount: ${application.funding_amount} NOK

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
- End with memorable, compelling message`
      };

      return sectionPrompts[sectionName] || sectionPrompts.introduction;
    };

    // Enhanced tone and style instructions
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

    // Improvement instructions
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

    // Build the final prompt
    const projectContext = `
CRITICAL CONTEXT - USE ONLY THIS SPECIFIC PROJECT DATA:

PROJECT DETAILS:
- Project Name: "${application.project_name}"
- Organization: "${application.organizations.name}" (${application.organizations.org_type})
- Organization Mission: "${application.organizations.mission}"
- Project Summary: "${application.summary}"
- Target Audience: "${application.target_audience}"
- Timeline: ${application.timeline_start} to ${application.timeline_end}
- Funding Amount: ${application.funding_amount} NOK
- Expected Impact: "${application.expected_impact}"${knowledgeContext}${languageInstruction}

IMPORTANT INSTRUCTIONS:
- Generate content ONLY for this specific project using the exact details provided above
- DO NOT create generic or fictional content
- DO NOT invent additional project details, statistics, or examples
- Use ONLY the organization name, mission, and project details provided
- Base all content on the actual project summary and target audience specified
- Reference the exact funding amount and timeline provided
- Focus on the specific expected impact described above
- If any detail is missing, acknowledge it and work with available information`;

    const basePrompt = section ? buildSectionPrompt(section) : 
      `Generate a complete, award-winning grant application with the following sections: Introduction, Need Statement, Project Plan, Budget, Outcomes, and Conclusion.

GRANT WRITING BEST PRACTICES:
- Use compelling storytelling and emotional resonance
- Include specific, measurable outcomes and data-driven arguments
- Demonstrate clear value proposition and competitive advantage
- Show evidence-based methodology and proven approaches
- Create urgency and timeliness for immediate action
- Build confidence through organizational credibility and expertise
- Use professional tone with strategic positioning
- Include clear calls to action and partnership vision

SUCCESS FACTORS:
- Create immediate funder engagement and emotional investment
- Demonstrate clear path from problem to solution to impact
- Show maximum ROI and value for funding investment
- Build trust through transparency and accountability
- Inspire action through compelling vision and partnership`;

    const toneInstruction = tone ? `\n\nTONE INSTRUCTION: ${toneInstructions[tone] || toneInstructions.formal}` : "";
    const improvementInstruction = improvement ? `\n\nIMPROVEMENT INSTRUCTION: ${improvementInstructions[improvement] || ''}` : "";
    const finalPrompt = basePrompt + projectContext + toneInstruction + improvementInstruction;

    console.log(`[AI-GRANT-WRITER] Request ${requestId} - Calling AI provider:`, {
      provider: aiProvider,
      model: model || 'gpt-5-2025-08-07',
      promptLength: finalPrompt.length,
      maxTokens: section ? 1000 : 3000
    });

    // Check if provider is available
    if (!isProviderAvailable(aiProvider)) {
      console.error(`[AI-GRANT-WRITER] Request ${requestId} - Provider ${aiProvider} not available (missing API key)`);
      return new Response(
        JSON.stringify({ 
          error: `${aiProvider.toUpperCase()} API key not configured. Please add ${aiProvider.toUpperCase()}_API_KEY in Supabase Edge Function Secrets.`,
          provider: aiProvider,
          availableProviders: ['openai']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Call AI provider with multi-provider support
    const aiResponse = await callAIProvider({
      provider: aiProvider,
      model: model || 'gpt-5-2025-08-07',
      messages: [
        { 
          role: 'system', 
          content: `You are an award-winning grant writer with 20+ years of experience securing millions in funding for nonprofit organizations. You specialize in:

GRANT WRITING EXPERTISE:
- Proven track record of 85%+ success rate in grant applications
- Expertise in storytelling, emotional resonance, and funder psychology
- Deep understanding of evidence-based argumentation and data integration
- Mastery of professional grant writing structure and persuasive techniques
- Experience with government, foundation, and corporate funders

WRITING APPROACH:
- Create compelling narratives that connect emotionally with funders
- Use data-driven arguments backed by research and statistics
- Demonstrate clear value propositions and competitive advantages
- Build confidence through organizational credibility and expertise
- Include specific, measurable outcomes and accountability frameworks
- Use professional tone with strategic positioning and psychological triggers

SUCCESS STRATEGIES:
- Lead with compelling hooks that immediately engage funders
- Create urgency and timeliness for immediate action
- Show clear ROI and maximum impact for funding investment
- Demonstrate innovation while building on proven methodologies
- Include stakeholder voices and community perspectives
- End with powerful calls to action and partnership vision

Write professionally and follow award-winning grant writing best practices that have secured millions in funding.

CRITICAL INSTRUCTION: Always use ONLY the specific project details and organization information provided in the prompt. Do not invent or create fictional content, statistics, or examples. Base all content on the actual project data provided.`
        },
        { role: 'user', content: finalPrompt }
      ],
      maxTokens: section ? 1000 : 3000,
      temperature: 0.7
    });
    
    const content = aiResponse.content;
    
    // PHASE 2: Log raw AI response structure for debugging
    console.log(`[AI-GRANT-WRITER] Request ${requestId} - Raw AI response structure:`, {
      hasContent: !!content,
      contentType: typeof content,
      contentPreview: content?.substring(0, 100),
      responseKeys: Object.keys(aiResponse)
    });
    
    // PHASE 2: Validate content is not empty
    if (!content || content.trim().length === 0) {
      console.error(`[AI-GRANT-WRITER] Request ${requestId} - AI returned empty content:`, {
        section: section || 'full_draft',
        provider: aiProvider,
        model,
        responseReceived: !!aiResponse,
        usage: aiResponse.usage
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'AI generated empty content. Please try again or adjust your prompt.',
        section: section || null,
        timestamp: new Date().toISOString(),
        requestId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[AI-GRANT-WRITER] Request ${requestId} - Content generated:`, {
      contentLength: content.length,  // Now guaranteed > 0
      section: section || 'full_draft',
      provider: aiProvider,
      model,
      usage: aiResponse.usage,
      success: true
    });

    // If generating a single section, return standardized response
    if (section) {
      return new Response(JSON.stringify({ 
        success: true,
        section,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        aiProvider: aiProvider,
        model: model
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse sections and update application
    const sections = {
      introduction: content.split('INTRODUCTION:')[1]?.split('STATEMENT OF NEED:')[0]?.trim() || '',
      need_statement: content.split('STATEMENT OF NEED:')[1]?.split('PROJECT PLAN:')[0]?.trim() || '',
      project_plan: content.split('PROJECT PLAN:')[1]?.split('BUDGET:')[0]?.trim() || '',
      budget: content.split('BUDGET:')[1]?.split('EXPECTED OUTCOMES:')[0]?.trim() || '',
      outcomes: content.split('EXPECTED OUTCOMES:')[1]?.split('CONCLUSION:')[0]?.trim() || '',
      conclusion: content.split('CONCLUSION:')[1]?.trim() || '',
    };

    // Update application with generated content
    await supabase
      .from('grant_applications')
      .update({ 
        generated_draft: JSON.stringify(sections),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    return new Response(JSON.stringify({ 
      success: true,
      sections 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[AI-GRANT-WRITER] Request ${requestId} - Error:`, {
      message: error.message,
      stack: error.stack,
      section: section || null,
      applicationId
    });
    
    // Enhanced error response with more details
    const errorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred while generating grant content',
      timestamp: new Date().toISOString(),
      requestId,
      section: section || null
    };
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Unauthorized') || error.message.includes('log in')) {
      statusCode = 401;
    } else if (error.message.includes('not found') || error.message.includes('do not have access')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('must be') || error.message.includes('Missing required')) {
      statusCode = 400;
    } else if (error.message.includes('API key') || error.message.includes('invalid_api_key')) {
      statusCode = 500;
      errorResponse.error = 'OpenAI API key is invalid or missing. Please contact support.';
    }
    
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});