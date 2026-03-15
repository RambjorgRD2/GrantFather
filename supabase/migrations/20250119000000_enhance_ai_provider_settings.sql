-- Add AI provider and model columns to system_prompts table
ALTER TABLE system_prompts 
ADD COLUMN ai_provider text DEFAULT 'openai',
ADD COLUMN ai_model text DEFAULT 'gpt-4o';

-- Update existing records to use default OpenAI GPT-4o
UPDATE system_prompts 
SET ai_provider = 'openai', ai_model = 'gpt-4o'
WHERE ai_provider IS NULL OR ai_model IS NULL;

-- Add constraints and indexes
ALTER TABLE system_prompts 
ADD CONSTRAINT system_prompts_ai_provider_check 
CHECK (ai_provider IN ('openai', 'anthropic', 'google', 'perplexity', 'grok'));

CREATE INDEX IF NOT EXISTS idx_system_prompts_ai_provider ON system_prompts(ai_provider);
CREATE INDEX IF NOT EXISTS idx_system_prompts_ai_model ON system_prompts(ai_model);

-- Create function to get default system prompts with AI provider settings
CREATE OR REPLACE FUNCTION get_default_system_prompts(org_id uuid)
RETURNS TABLE (
  section text,
  prompt_text text,
  ai_provider text,
  ai_model text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.section,
    COALESCE(sp.prompt_text, s.default_prompt) as prompt_text,
    COALESCE(sp.ai_provider, 'openai') as ai_provider,
    COALESCE(sp.ai_model, 'gpt-4o') as ai_model
  FROM (
    VALUES 
      ('introduction', 'Create a compelling, award-winning introduction section for your grant application.

GRANT WRITING STRATEGY:
1. OPENING HOOK: Begin with a compelling statistic, story, or statement that immediately captures attention and creates emotional connection
2. CREDIBILITY ESTABLISHMENT: Demonstrate your organization''s proven track record, expertise, and organizational capacity
3. PROBLEM-SOLUTION ALIGNMENT: Clearly connect the identified need with your proposed solution
4. FUNDER MISSION ALIGNMENT: Show how this project directly supports the funder''s goals and values
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
- Set up compelling case for funding'),
      
      ('need_statement', 'Create a data-driven, compelling need statement for your grant application.

GRANT WRITING STRATEGY:
1. PROBLEM IDENTIFICATION: Use specific data, statistics, and research to quantify the scope and severity of the problem
2. COMMUNITY IMPACT: Demonstrate how this issue affects real people, families, and communities
3. URGENCY AND TIMELINESS: Show why immediate action is critical and why this moment is the right time
4. GAP ANALYSIS: Identify what''s currently missing and why existing solutions are insufficient
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
- Establish foundation for project justification'),
      
      ('project_plan', 'Create a comprehensive, evidence-based project plan for your grant application.

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
- Build confidence in project success'),
      
      ('budget', 'Create a comprehensive budget justification for your grant application.

GRANT WRITING STRATEGY:
1. COST-EFFECTIVENESS: Demonstrate maximum impact per dollar invested
2. DETAILED BREAKDOWN: Provide clear, itemized expenses with justifications
3. MATCHING FUNDS: Show organizational commitment through cost-sharing or in-kind contributions
4. SUSTAINABILITY: Explain how the project will continue beyond the grant period
5. COMPARATIVE VALUE: Show how your budget compares favorably to similar projects
6. TRANSPARENCY: Provide clear, honest, and detailed financial information

WRITING REQUIREMENTS:
- Present budget in clear, professional format
- Justify major expense categories
- Show cost-effectiveness and value for money
- Include matching funds or in-kind contributions
- Address sustainability and long-term funding
- Use professional budget terminology
- 3-4 paragraphs with clear structure

SUCCESS FACTORS:
- Demonstrate fiscal responsibility and accountability
- Show maximum impact per dollar invested
- Build confidence in financial management
- Establish sustainability beyond grant period
- Provide transparent, detailed financial planning'),
      
      ('outcomes', 'Create a compelling outcomes and evaluation section for your grant application.

GRANT WRITING STRATEGY:
1. MEASURABLE OUTCOMES: Define specific, quantifiable results and impacts
2. EVALUATION FRAMEWORK: Describe comprehensive assessment methodology
3. DATA COLLECTION: Outline systematic approach to gathering evidence
4. ACCOUNTABILITY MEASURES: Show how progress will be tracked and reported
5. LONG-TERM IMPACT: Demonstrate sustainable change beyond the project period
6. STAKEHOLDER BENEFITS: Clearly articulate who benefits and how

WRITING REQUIREMENTS:
- Define clear, measurable outcomes
- Describe robust evaluation methodology
- Include specific metrics and indicators
- Show accountability and transparency
- Demonstrate long-term sustainability
- Connect outcomes to funder priorities
- 3-4 paragraphs with clear structure

SUCCESS FACTORS:
- Establish clear success metrics
- Demonstrate accountability and transparency
- Show meaningful, measurable impact
- Build confidence in project success
- Connect outcomes to broader community benefits'),
      
      ('conclusion', 'Create a powerful, memorable conclusion for your grant application.

GRANT WRITING STRATEGY:
1. IMPACT SUMMARY: Reinforce the transformative potential of your project
2. URGENCY REINFORCEMENT: Emphasize why immediate funding is critical
3. PARTNERSHIP INVITATION: Position the funder as a key partner in creating change
4. CALL TO ACTION: Create compelling case for immediate funding decision
5. VISION ARTICULATION: Paint picture of positive future enabled by this grant
6. GRATITUDE EXPRESSION: Thank the funder for their consideration and partnership opportunity

WRITING REQUIREMENTS:
- Synthesize key points from entire application
- Reinforce alignment with funder priorities
- Create emotional connection and urgency
- End with strong, memorable statement
- Show gratitude and partnership mindset
- 2-3 paragraphs maximum
- Use confident, optimistic tone

SUCCESS FACTORS:
- Leave lasting positive impression
- Reinforce key value propositions
- Create urgency and timeliness for action
- Show clear ROI and maximum impact for funding investment
- Demonstrate innovation while building on proven methodologies
- Include stakeholder voices and community perspectives
- End with memorable, compelling message')
  ) AS s(section, default_prompt)
  LEFT JOIN system_prompts sp ON sp.organization_id = org_id AND sp.section = s.section;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_default_system_prompts(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_default_system_prompts(uuid) IS 'Returns default system prompts with AI provider settings for an organization, falling back to defaults if not customized';
