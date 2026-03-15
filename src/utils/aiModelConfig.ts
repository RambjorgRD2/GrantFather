// AI Model Configuration with Valid Models
// This utility helps identify which AI providers and models are available

export interface AIProviderConfig {
  id: string;
  name: string;
  icon: string;
  isConfigured: boolean;
  errorMessage?: string;
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  isRecommended?: boolean;
}

// Valid OpenAI Models (as of 2025)
export const VALID_OPENAI_MODELS = [
  'gpt-5-2025-08-07',
  'gpt-5-mini-2025-08-07',
  'gpt-5-nano-2025-08-07',
  'gpt-4.1-2025-04-14',
  'gpt-4.1-mini-2025-04-14',
  'gpt-4o-mini',
  'gpt-4o',
  'o3-2025-04-16',
  'o4-mini-2025-04-16',
] as const;

export const OPENAI_MODELS: AIModelConfig[] = [
  {
    id: 'gpt-5-2025-08-07',
    name: 'GPT-5',
    provider: 'openai',
    description: 'Most capable flagship model',
    isRecommended: true,
  },
  {
    id: 'gpt-5-mini-2025-08-07',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'Fast and efficient',
  },
  {
    id: 'gpt-5-nano-2025-08-07',
    name: 'GPT-5 Nano',
    provider: 'openai',
    description: 'Fastest and most cost-effective',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Legacy model - fast and affordable',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Legacy model - more capable',
  },
];

export const AI_PROVIDERS_CONFIG: AIProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI GPT',
    icon: '🤖',
    isConfigured: true, // OpenAI is always available as default
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🎭',
    isConfigured: false,
    errorMessage: 'ANTHROPIC_API_KEY not configured',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    icon: '💎',
    isConfigured: false,
    errorMessage: 'GOOGLE_AI_API_KEY not configured',
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    icon: '🔍',
    isConfigured: false,
    errorMessage: 'PERPLEXITY_API_KEY not configured',
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    icon: '⚡',
    isConfigured: false,
    errorMessage: 'GROK_API_KEY not configured',
  },
];

export function getConfiguredProviders(): AIProviderConfig[] {
  return AI_PROVIDERS_CONFIG.filter(provider => provider.isConfigured);
}

export function getProviderConfig(providerId: string): AIProviderConfig | undefined {
  return AI_PROVIDERS_CONFIG.find(provider => provider.id === providerId);
}

export function isProviderConfigured(providerId: string): boolean {
  const provider = getProviderConfig(providerId);
  return provider?.isConfigured || false;
}

export function getProviderErrorMessage(providerId: string): string | undefined {
  const provider = getProviderConfig(providerId);
  return provider?.errorMessage;
}

export function getFallbackProvider(selectedProvider: string): string {
  if (isProviderConfigured(selectedProvider)) {
    return selectedProvider;
  }
  return 'openai';
}

export function getModelsForProvider(providerId: string): AIModelConfig[] {
  if (providerId === 'openai') {
    return OPENAI_MODELS;
  }
  return [];
}

export function isValidModel(providerId: string, modelId: string): boolean {
  if (providerId === 'openai') {
    return VALID_OPENAI_MODELS.includes(modelId as any);
  }
  return false;
}

export function getDefaultModelForProvider(providerId: string): string {
  if (providerId === 'openai') {
    return 'gpt-5-2025-08-07';
  }
  return 'gpt-4o-mini';
}
