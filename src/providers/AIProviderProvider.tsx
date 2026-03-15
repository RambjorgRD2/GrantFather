import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import {
  AISettings,
  SectionAISettings,
  AIProviderContextType,
} from '@/types/grantApplication';
import { aiProviderService } from '@/services/aiProviderService';

const AIProviderContext = createContext<AIProviderContextType | undefined>(
  undefined
);

interface AIProviderProviderProps {
  children: React.ReactNode;
}

export function AIProviderProvider({ children }: AIProviderProviderProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [globalSettings, setGlobalSettings] = useState<AISettings>(
    aiProviderService.getDefaultSettings()
  );
  const [sectionSettings, setSectionSettings] = useState<SectionAISettings>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load AI settings from system_prompts table
  useEffect(() => {
    const loadAISettings = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const { data: systemPrompts, error } = await supabase
          .from('system_prompts')
          .select('section_name, prompt_template, ai_provider, ai_model')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error loading AI settings:', error);
          return;
        }

        const settings: SectionAISettings = {};
        systemPrompts?.forEach((prompt) => {
          settings[prompt.section_name] = {
            provider: prompt.ai_provider || 'openai',
            model: prompt.ai_model || 'gpt-4o-mini',
          };
        });

        setSectionSettings(settings);

        // Set global settings to the most common provider/model
        const providerCounts: { [key: string]: number } = {};
        const modelCounts: { [key: string]: number } = {};

        Object.values(settings).forEach(({ provider, model }) => {
          providerCounts[provider] = (providerCounts[provider] || 0) + 1;
          modelCounts[model] = (modelCounts[model] || 0) + 1;
        });

        const mostCommonProvider =
          Object.entries(providerCounts).sort(
            ([, a], [, b]) => b - a
          )[0]?.[0] || 'openai';

        const mostCommonModel =
          Object.entries(modelCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
          'gpt-4o-mini';

        setGlobalSettings({
          provider: mostCommonProvider,
          model: mostCommonModel,
        });
      } catch (error) {
        console.error('Error loading AI settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAISettings();
  }, [user?.id]);

  const updateGlobalSettings = (settings: AISettings) => {
    setGlobalSettings(settings);
  };

  const updateSectionSettings = async (
    section: string,
    settings: AISettings
  ) => {
    if (!user?.id) return;

    try {
      // Update local state
      setSectionSettings((prev) => ({
        ...prev,
        [section]: settings,
      }));

      // Database update temporarily disabled until ai_provider and ai_model columns are added
      // const { error } = await supabase.from('system_prompts').upsert(...)
    } catch (error) {
      console.error('Error updating AI settings:', error);
    }
  };

  const getSectionSettings = (section: string): AISettings => {
    return aiProviderService.getSectionSettings(
      section,
      sectionSettings,
      globalSettings
    );
  };

  const value: AIProviderContextType = {
    globalSettings,
    sectionSettings,
    updateGlobalSettings,
    updateSectionSettings,
    getSectionSettings,
    isLoading,
  };

  return (
    <AIProviderContext.Provider value={value}>
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProvider() {
  const context = useContext(AIProviderContext);
  if (context === undefined) {
    throw new Error('useAIProvider must be used within an AIProviderProvider');
  }
  return context;
}
