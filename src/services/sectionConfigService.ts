export interface SectionSettings {
  sectionKey: string;
  displayName: string;
  description: string;
  recommendedAIProvider: string;
  recommendedModel: string;
  maxTokens: number;
  temperature: number;
  toneOptions: string[];
  improvementOptions: string[];
  validationRules: string[];
  tips: string[];
}

export interface AISettings {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export class SectionConfigService {
  private static instance: SectionConfigService;

  public static getInstance(): SectionConfigService {
    if (!SectionConfigService.instance) {
      SectionConfigService.instance = new SectionConfigService();
    }
    return SectionConfigService.instance;
  }

  /**
   * Gets comprehensive settings for a specific section
   */
  public getSectionSettings(sectionKey: string): SectionSettings {
    const settings = this.getAllSectionSettings();
    return settings[sectionKey] || settings.introduction;
  }

  /**
   * Gets recommended AI provider and model for a specific section
   */
  public getRecommendedAISettings(section: string): AISettings {
    const sectionSettings = this.getSectionSettings(section);
    
    return {
      provider: sectionSettings.recommendedAIProvider,
      model: sectionSettings.recommendedModel,
      maxTokens: sectionSettings.maxTokens,
      temperature: sectionSettings.temperature
    };
  }

  /**
   * Gets tone options available for a specific section
   */
  public getToneOptions(section: string): string[] {
    const sectionSettings = this.getSectionSettings(section);
    return sectionSettings.toneOptions;
  }

  /**
   * Gets improvement options available for a specific section
   */
  public getImprovementOptions(section: string): string[] {
    const sectionSettings = this.getSectionSettings(section);
    return sectionSettings.improvementOptions;
  }

  /**
   * Gets validation rules for a specific section
   */
  public getValidationRules(section: string): string[] {
    const sectionSettings = this.getSectionSettings(section);
    return sectionSettings.validationRules;
  }

  /**
   * Gets helpful tips for a specific section
   */
  public getSectionTips(section: string): string[] {
    const sectionSettings = this.getSectionSettings(section);
    return sectionSettings.tips;
  }

  /**
   * Gets all available sections with their configurations
   */
  public getAllSections(): { key: string; name: string; description: string }[] {
    const settings = this.getAllSectionSettings();
    return Object.entries(settings).map(([key, setting]) => ({
      key,
      name: setting.displayName,
      description: setting.description
    }));
  }

  /**
   * Checks if a tone is appropriate for a specific section
   */
  public isToneAppropriateForSection(tone: string, section: string): boolean {
    const sectionSettings = this.getSectionSettings(section);
    return sectionSettings.toneOptions.includes(tone);
  }

  /**
   * Gets the best AI provider for a specific section based on content type
   */
  public getOptimalAIProvider(section: string, contentComplexity: 'simple' | 'moderate' | 'complex' = 'moderate'): string {
    const sectionSettings = this.getSectionSettings(section);
    
    // Override based on content complexity
    switch (contentComplexity) {
      case 'complex':
        return 'openai'; // Best for complex reasoning
      case 'simple':
        return 'anthropic'; // Good for straightforward content
      default:
        return sectionSettings.recommendedAIProvider;
    }
  }

  /**
   * Gets section-specific prompts and configurations
   */
  private getAllSectionSettings(): Record<string, SectionSettings> {
    return {
      introduction: {
        sectionKey: 'introduction',
        displayName: 'Introduction',
        description: 'Compelling opening that captures attention and establishes credibility',
        recommendedAIProvider: 'openai',
        recommendedModel: 'gpt-4o-mini',
        maxTokens: 800,
        temperature: 0.7,
        toneOptions: ['formal', 'persuasive', 'conversational', 'strategic'],
        improvementOptions: ['compelling', 'clarity', 'evidence', 'concise'],
        validationRules: [
          'Must include organization name and mission',
          'Should establish credibility and expertise',
          'Must connect to the problem being addressed',
          'Should end with transition to need statement'
        ],
        tips: [
          'Start with a compelling hook - statistic, story, or powerful statement',
          'Demonstrate your organization\'s proven track record',
          'Show alignment with funder\'s mission and values',
          'Keep it concise but impactful - 2-3 paragraphs maximum',
          'End with a strong transition that leads into the need statement'
        ]
      },
      need_statement: {
        sectionKey: 'need_statement',
        displayName: 'Need Statement',
        description: 'Data-driven problem identification that creates urgency and demonstrates understanding',
        recommendedAIProvider: 'openai',
        recommendedModel: 'gpt-5-2025-08-07',
        maxTokens: 1000,
        temperature: 0.7,
        toneOptions: ['persuasive', 'academic', 'formal', 'conversational'],
        improvementOptions: ['evidence', 'clarity', 'compelling', 'concise'],
        validationRules: [
          'Must include specific data or statistics',
          'Should demonstrate community impact',
          'Must show urgency and timeliness',
          'Should identify gaps in current solutions',
          'Must connect problem to proposed solution'
        ],
        tips: [
          'Lead with compelling statistics or research findings',
          'Show how the problem affects real people and families',
          'Demonstrate why immediate action is critical',
          'Include stakeholder perspectives and community voices',
          'Use emotional storytelling while maintaining credibility',
          'Show clear connection between problem and your solution'
        ]
      },
      project_plan: {
        sectionKey: 'project_plan',
        displayName: 'Project Plan',
        description: 'Comprehensive methodology and implementation strategy with clear objectives',
        recommendedAIProvider: 'openai',
        recommendedModel: 'gpt-4o-mini',
        maxTokens: 1200,
        temperature: 0.6,
        toneOptions: ['formal', 'academic', 'strategic', 'concise'],
        improvementOptions: ['clarity', 'evidence', 'concise', 'compelling'],
        validationRules: [
          'Must include SMART objectives',
          'Should provide detailed methodology',
          'Must include timeline with milestones',
          'Should demonstrate team expertise',
          'Must address potential risks and mitigation',
          'Should show innovation and best practices'
        ],
        tips: [
          'Start with clear, measurable project objectives',
          'Provide detailed methodology with rationale',
          'Include specific timeline with key milestones',
          'Demonstrate team capacity and expertise',
          'Show how your approach builds on proven methods',
          'Address potential challenges and solutions',
          'Demonstrate collaboration with partners'
        ]
      },
      budget: {
        sectionKey: 'budget',
        displayName: 'Budget',
        description: 'Cost-effective budget justification that demonstrates value for money',
        recommendedAIProvider: 'openai',
        recommendedModel: 'gpt-5-2025-08-07',
        maxTokens: 1000,
        temperature: 0.6,
        toneOptions: ['strategic', 'formal', 'concise', 'persuasive'],
        improvementOptions: ['evidence', 'clarity', 'concise', 'compelling'],
        validationRules: [
          'Must demonstrate cost-effectiveness',
          'Should show leveraging of additional resources',
          'Must justify major expense categories',
          'Should show appropriate overhead balance',
          'Must demonstrate sustainability',
          'Should show clear ROI and value'
        ],
        tips: [
          'Start with overall budget philosophy and approach',
          'Provide detailed breakdown of major expense categories',
          'Justify each major line item with clear rationale',
          'Show cost-effectiveness and value for money',
          'Demonstrate leveraging of additional resources',
          'Address sustainability and long-term impact',
          'Show clear connection between costs and outcomes'
        ]
      },
      outcomes: {
        sectionKey: 'outcomes',
        displayName: 'Outcomes',
        description: 'Measurable results and evaluation framework with accountability measures',
        recommendedAIProvider: 'openai',
        recommendedModel: 'gpt-4o-mini',
        maxTokens: 1200,
        temperature: 0.6,
        toneOptions: ['academic', 'formal', 'strategic', 'concise'],
        improvementOptions: ['evidence', 'clarity', 'compelling', 'concise'],
        validationRules: [
          'Must include SMART measurable outcomes',
          'Should describe evaluation methodology',
          'Must specify data collection protocols',
          'Should show reporting and accountability',
          'Must demonstrate long-term impact',
          'Should include continuous improvement'
        ],
        tips: [
          'Start with clear outcome framework and logic model',
          'Define specific, measurable outcomes with targets',
          'Describe evaluation methodology and data collection',
          'Show reporting protocols and accountability measures',
          'Demonstrate long-term impact and sustainability',
          'Include continuous improvement mechanisms',
          'Show how short-term outcomes lead to lasting change'
        ]
      },
      conclusion: {
        sectionKey: 'conclusion',
        displayName: 'Conclusion',
        description: 'Compelling closing that inspires action and reinforces partnership vision',
        recommendedAIProvider: 'openai',
        recommendedModel: 'gpt-5-2025-08-07',
        maxTokens: 800,
        temperature: 0.8,
        toneOptions: ['persuasive', 'conversational', 'strategic', 'formal'],
        improvementOptions: ['compelling', 'clarity', 'evidence', 'concise'],
        validationRules: [
          'Must include compelling call to action',
          'Should show funder as key partner',
          'Must paint vision of future impact',
          'Should demonstrate confidence in success',
          'Must end with gratitude and partnership',
          'Should create emotional investment'
        ],
        tips: [
          'Reinforce key value propositions and unique advantages',
          'Create compelling vision of future impact',
          'Show clear connection between funding and transformation',
          'Demonstrate confidence in success and partnership',
          'Include specific call to action for funder',
          'End with gratitude and partnership vision',
          'Create emotional investment in the project\'s success'
        ]
      }
    };
  }

  /**
   * Gets section-specific prompt templates
   */
  public getSectionPromptTemplate(section: string): string {
    const templates = {
      introduction: `Create a compelling, award-winning introduction section that immediately captures attention and establishes credibility.

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

      need_statement: `Create a data-driven, compelling need statement that quantifies the problem and creates urgency.

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

      project_plan: `Create a comprehensive, evidence-based project plan with clear methodology and implementation strategy.

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

      budget: `Create a comprehensive budget justification that demonstrates cost-effectiveness and value for money.

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

      outcomes: `Create a comprehensive outcomes and evaluation framework with measurable results and accountability.

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

      conclusion: `Create a compelling, action-oriented conclusion that inspires immediate support and partnership.

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

    return templates[section as keyof typeof templates] || templates.introduction;
  }
}

// Export singleton instance
export const sectionConfigService = SectionConfigService.getInstance();
