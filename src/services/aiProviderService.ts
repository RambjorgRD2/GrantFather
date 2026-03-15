/**
 * Optimized AI Provider Management Service
 * Centralized management of AI providers, models, and settings
 */

import { AIProvider, AISettings, SectionAISettings } from '@/types/grantApplication';

export interface AIProviderConfig {
  id: string;
  name: string;
  description: string;
  models: string[];
  requiresApiKey: boolean;
  icon?: string;
  baseUrl?: string;
  maxTokens?: number;
  supportedFeatures?: string[];
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  costPerToken?: number;
  capabilities: string[];
}

export class AIProviderService {
  private static instance: AIProviderService;
  private providers: Map<string, AIProviderConfig> = new Map();
  private models: Map<string, ModelConfig> = new Map();
  private defaultSettings: AISettings = {
    provider: 'openai',
    model: 'gpt-4o-mini',
  };

  public static getInstance(): AIProviderService {
    if (!AIProviderService.instance) {
      AIProviderService.instance = new AIProviderService();
    }
    return AIProviderService.instance;
  }

  constructor() {
    this.initializeProviders();
    this.initializeModels();
  }

  /**
   * Initialize available AI providers
   */
  private initializeProviders(): void {
    const providerConfigs: AIProviderConfig[] = [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'Best for creative writing and general tasks',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        requiresApiKey: true,
        icon: '🤖',
        baseUrl: 'https://api.openai.com/v1',
        maxTokens: 128000,
        supportedFeatures: ['chat', 'completion', 'embeddings'],
      },
      {
        id: 'anthropic',
        name: 'Claude',
        description: 'Excellent for reasoning and analysis',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
        requiresApiKey: true,
        icon: '🎭',
        baseUrl: 'https://api.anthropic.com/v1',
        maxTokens: 200000,
        supportedFeatures: ['chat', 'completion'],
      },
      {
        id: 'google',
        name: 'Gemini',
        description: 'Strong analytical and research capabilities',
        models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
        requiresApiKey: true,
        icon: '💎',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        maxTokens: 1000000,
        supportedFeatures: ['chat', 'completion', 'vision'],
      },
      {
        id: 'perplexity',
        name: 'Perplexity',
        description: 'Real-time research and fact-checking',
        models: ['sonar-huge-online', 'sonar-large-online', 'sonar-small-online'],
        requiresApiKey: true,
        icon: '🔍',
        baseUrl: 'https://api.perplexity.ai',
        maxTokens: 128000,
        supportedFeatures: ['chat', 'completion', 'research'],
      },
      {
        id: 'grok',
        name: 'Grok',
        description: 'Real-time data and current events',
        models: ['grok-2', 'grok-2-vision', 'grok-beta'],
        requiresApiKey: true,
        icon: '⚡',
        baseUrl: 'https://api.x.ai/v1',
        maxTokens: 128000,
        supportedFeatures: ['chat', 'completion', 'real-time'],
      },
    ];

    providerConfigs.forEach(config => {
      this.providers.set(config.id, config);
    });
  }

  /**
   * Initialize available models
   */
  private initializeModels(): void {
    const modelConfigs: ModelConfig[] = [
      // OpenAI Models
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        maxTokens: 128000,
        capabilities: ['chat', 'completion', 'vision'],
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        maxTokens: 128000,
        capabilities: ['chat', 'completion'],
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        maxTokens: 128000,
        capabilities: ['chat', 'completion', 'vision'],
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        maxTokens: 16384,
        capabilities: ['chat', 'completion'],
      },
      // Claude Models
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        maxTokens: 200000,
        capabilities: ['chat', 'completion'],
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        maxTokens: 200000,
        capabilities: ['chat', 'completion'],
      },
      // Gemini Models
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        maxTokens: 1000000,
        capabilities: ['chat', 'completion', 'vision'],
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        maxTokens: 1000000,
        capabilities: ['chat', 'completion', 'vision'],
      },
      // Perplexity Models
      {
        id: 'sonar-huge-online',
        name: 'Sonar Huge Online',
        provider: 'perplexity',
        maxTokens: 128000,
        capabilities: ['chat', 'completion', 'research'],
      },
      {
        id: 'sonar-large-online',
        name: 'Sonar Large Online',
        provider: 'perplexity',
        maxTokens: 128000,
        capabilities: ['chat', 'completion', 'research'],
      },
      // Grok Models
      {
        id: 'grok-2',
        name: 'Grok 2',
        provider: 'grok',
        maxTokens: 128000,
        capabilities: ['chat', 'completion', 'real-time'],
      },
    ];

    modelConfigs.forEach(config => {
      this.models.set(config.id, config);
    });
  }

  /**
   * Get all available providers
   */
  public getProviders(): AIProvider[] {
    return Array.from(this.providers.values()).map(provider => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      models: provider.models,
      requiresApiKey: provider.requiresApiKey,
      icon: provider.icon,
    }));
  }

  /**
   * Get provider by ID
   */
  public getProvider(providerId: string): AIProviderConfig | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get models for a specific provider
   */
  public getModelsForProvider(providerId: string): ModelConfig[] {
    return Array.from(this.models.values()).filter(
      model => model.provider === providerId
    );
  }

  /**
   * Get model configuration
   */
  public getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }

  /**
   * Validate AI settings
   */
  public validateSettings(settings: AISettings): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if provider exists
    const provider = this.getProvider(settings.provider);
    if (!provider) {
      errors.push(`Provider '${settings.provider}' is not available`);
      return { isValid: false, errors, warnings };
    }

    // Check if model exists and belongs to provider
    const model = this.getModel(settings.model);
    if (!model) {
      errors.push(`Model '${settings.model}' is not available`);
      return { isValid: false, errors, warnings };
    }

    if (model.provider !== settings.provider) {
      errors.push(`Model '${settings.model}' does not belong to provider '${settings.provider}'`);
      return { isValid: false, errors, warnings };
    }

    // Check API key requirement
    if (provider.requiresApiKey) {
      warnings.push(`Provider '${settings.provider}' requires an API key`);
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Get recommended settings for a specific use case
   */
  public getRecommendedSettings(useCase: 'creative' | 'analytical' | 'research' | 'general'): AISettings {
    const recommendations: Record<string, AISettings> = {
      creative: { provider: 'openai', model: 'gpt-4o' },
      analytical: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      research: { provider: 'perplexity', model: 'sonar-huge-online' },
      general: { provider: 'openai', model: 'gpt-4o-mini' },
    };

    return recommendations[useCase] || this.defaultSettings;
  }

  /**
   * Get default settings
   */
  public getDefaultSettings(): AISettings {
    return { ...this.defaultSettings };
  }

  /**
   * Update default settings
   */
  public setDefaultSettings(settings: AISettings): void {
    this.defaultSettings = { ...settings };
  }

  /**
   * Get settings for a specific section with fallbacks
   */
  public getSectionSettings(
    section: string,
    sectionSettings: SectionAISettings,
    globalSettings: AISettings
  ): AISettings {
    return sectionSettings[section] || globalSettings;
  }

  /**
   * Merge settings with validation
   */
  public mergeSettings(
    baseSettings: AISettings,
    overrideSettings: Partial<AISettings>
  ): AISettings {
    const merged = { ...baseSettings, ...overrideSettings };
    const validation = this.validateSettings(merged);
    
    if (!validation.isValid) {
      console.warn('Invalid AI settings:', validation.errors);
      return baseSettings;
    }

    return merged;
  }

  /**
   * Get provider capabilities
   */
  public getProviderCapabilities(providerId: string): string[] {
    const provider = this.getProvider(providerId);
    return provider?.supportedFeatures || [];
  }

  /**
   * Check if provider supports a specific feature
   */
  public supportsFeature(providerId: string, feature: string): boolean {
    const capabilities = this.getProviderCapabilities(providerId);
    return capabilities.includes(feature);
  }

  /**
   * Get cost estimate for a request
   */
  public getCostEstimate(
    providerId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number | null {
    const model = this.getModel(modelId);
    if (!model?.costPerToken) {
      return null;
    }

    return (inputTokens + outputTokens) * model.costPerToken;
  }
}

// Export singleton instance
export const aiProviderService = AIProviderService.getInstance();

// Export React hook for easy use
export function useAIProviderService() {
  return {
    getProviders: aiProviderService.getProviders.bind(aiProviderService),
    getProvider: aiProviderService.getProvider.bind(aiProviderService),
    getModelsForProvider: aiProviderService.getModelsForProvider.bind(aiProviderService),
    getModel: aiProviderService.getModel.bind(aiProviderService),
    validateSettings: aiProviderService.validateSettings.bind(aiProviderService),
    getRecommendedSettings: aiProviderService.getRecommendedSettings.bind(aiProviderService),
    getDefaultSettings: aiProviderService.getDefaultSettings.bind(aiProviderService),
    setDefaultSettings: aiProviderService.setDefaultSettings.bind(aiProviderService),
    getSectionSettings: aiProviderService.getSectionSettings.bind(aiProviderService),
    mergeSettings: aiProviderService.mergeSettings.bind(aiProviderService),
    getProviderCapabilities: aiProviderService.getProviderCapabilities.bind(aiProviderService),
    supportsFeature: aiProviderService.supportsFeature.bind(aiProviderService),
    getCostEstimate: aiProviderService.getCostEstimate.bind(aiProviderService),
  };
}
