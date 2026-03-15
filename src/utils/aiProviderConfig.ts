// AI Provider Configuration Checker
// This utility helps identify which AI providers are available based on configured API keys

export interface AIProviderConfig {
  id: string;
  name: string;
  icon: string;
  isConfigured: boolean;
  comingSoon?: boolean;
  errorMessage?: string;
}

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
    comingSoon: true,
    errorMessage: 'Perplexity integration coming soon',
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    icon: '⚡',
    isConfigured: false,
    comingSoon: true,
    errorMessage: 'Grok integration coming soon',
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

// Helper function to get fallback provider if selected one is not configured
export function getFallbackProvider(selectedProvider: string): string {
  if (isProviderConfigured(selectedProvider)) {
    return selectedProvider;
  }
  
  // Return OpenAI as fallback since it's always configured
  return 'openai';
}
