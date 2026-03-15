export interface AIProvider {
  id: string;
  name: string;
  description: string;
  models: string[];
  requiresApiKey: boolean;
  icon?: string;
  comingSoon?: boolean;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Best for creative writing and general tasks',
    models: [
      'gpt-5-2025-08-07',
      'gpt-5-mini-2025-08-07',
      'gpt-5-nano-2025-08-07',
      'gpt-4.1-2025-04-14',
      'o3-2025-04-16',
      'o4-mini-2025-04-16',
      'gpt-4o',
      'gpt-4o-mini'
    ],
    requiresApiKey: true,
    icon: '🤖'
  },
  {
    id: 'anthropic',
    name: 'Claude',
    description: 'Excellent for reasoning and analysis',
    models: [
      'claude-opus-4-1-20250805',
      'claude-sonnet-4-5',
      'claude-sonnet-4-20250514',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-haiku-20241022'
    ],
    requiresApiKey: true,
    icon: '🎭'
  },
  {
    id: 'google',
    name: 'Gemini',
    description: 'Strong analytical and research capabilities',
    models: [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ],
    requiresApiKey: true,
    icon: '💎'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Real-time research and fact-checking',
    models: [
      'llama-3.1-sonar-huge-128k-online',
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-small-128k-online'
    ],
    requiresApiKey: true,
    icon: '🔍',
    comingSoon: true,
  },
  {
    id: 'grok',
    name: 'Grok',
    description: 'Real-time data and current events',
    models: [
      'grok-2-latest',
      'grok-2-vision-latest',
      'grok-beta'
    ],
    requiresApiKey: true,
    icon: '⚡',
    comingSoon: true,
  }
];

export const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', description: 'Formal, authoritative tone' },
  { id: 'compelling', label: 'Compelling', description: 'Persuasive and engaging' },
  { id: 'academic', label: 'Academic', description: 'Scholarly and research-focused' },
  { id: 'accessible', label: 'Accessible', description: 'Clear and easy to understand' },
  { id: 'urgent', label: 'Urgent', description: 'Emphasizes time-sensitivity' },
  { id: 'data-driven', label: 'Data-Driven', description: 'Focus on statistics and evidence' }
];

export const SECTION_RECOMMENDATIONS = {
  introduction: {
    providers: ['openai', 'anthropic'],
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-2025-08-07',
    reason: 'GPT-5 excels at creating compelling narratives and emotional hooks'
  },
  need_statement: {
    providers: ['anthropic', 'perplexity'],
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-2025-08-07',
    reason: 'GPT-5 is excellent for data analysis and evidence-based reasoning'
  },
  project_plan: {
    providers: ['anthropic', 'google'],
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-2025-08-07',
    reason: 'GPT-5 provides structured thinking and detailed planning'
  },
  budget: {
    providers: ['google', 'anthropic'],
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-2025-08-07',
    reason: 'GPT-5 excels at numerical analysis and detailed calculations'
  },
  outcomes: {
    providers: ['google', 'anthropic'],
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-2025-08-07',
    reason: 'GPT-5 is ideal for metrics, evaluation frameworks, and measurable outcomes'
  },
  conclusion: {
    providers: ['openai', 'anthropic'],
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-2025-08-07',
    reason: 'GPT-5 creates powerful, memorable conclusions with emotional impact'
  }
};

export const getProviderById = (id: string): AIProvider | undefined => {
  return AI_PROVIDERS.find(provider => provider.id === id);
};

export const getProviderModels = (providerId: string): string[] => {
  const provider = getProviderById(providerId);
  return provider?.models || [];
};

// Import the model updater for usage tracking
import { aiModelUpdater } from './aiModelUpdater';
import { supabase } from '@/integrations/supabase/client';

// Enhanced function to get provider models with usage tracking
export const getProviderModelsWithTracking = async (providerId: string): Promise<string[]> => {
  const provider = getProviderById(providerId);
  return provider?.models || [];
};

// Function to track model usage when a model is selected
export const trackModelUsage = async (providerId: string, model: string, sectionName?: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole) return;

    // Track usage in database
    await supabase.rpc('track_model_usage', {
      p_user_id: user.id,
      p_organization_id: userRole.organization_id,
      p_provider: providerId,
      p_model: model,
      p_section_name: sectionName || null
    });

    // Also track with aiModelUpdater for legacy support
    await aiModelUpdater.trackModelUsage(providerId, model);
  } catch (error) {
    console.error('Error tracking model usage:', error);
  }
};

// Function to get model usage statistics
export const getModelUsageStats = async () => {
  return [];
};

// Function to get models that are safe to remove (not in use)
export const getSafeToRemoveModels = async (): Promise<string[]> => {
  return await aiModelUpdater.getSafeToRemoveModels();
};

// Function to force update models
export const forceUpdateModels = async (): Promise<void> => {
  await aiModelUpdater.forceUpdate();
};

// Function to get update status
export const getModelUpdateStatus = () => {
  return aiModelUpdater.getUpdateStatus();
};