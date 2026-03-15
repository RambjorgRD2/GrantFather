import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, RotateCcw, Sparkles, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import {
  AI_PROVIDERS,
  SECTION_RECOMMENDATIONS,
  getProviderById,
  getProviderModels,
  trackModelUsage,
} from '@/services/aiProviders';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/hooks/useOrganization';

interface SystemPrompt {
  id: string;
  section_name: string;
  prompt_template: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface SectionSettings {
  prompt: string;
  provider: string;
  model: string;
}

const SECTION_DESCRIPTIONS = {
  introduction:
    'Sets the tone and introduces your organization and project purpose',
  need_statement: 'Explains the problem your project will address',
  project_plan: 'Details the activities, timeline, and implementation approach',
  budget: 'Justifies expenses and demonstrates cost-effectiveness',
  outcomes: 'Describes expected results, impact, and success metrics',
  conclusion: 'Summarizes key points and makes the final case for funding',
};

const DEFAULT_PROMPTS = {
  introduction:
    "Write a compelling introduction for a grant application. The introduction should clearly state the organization's mission, the purpose of the project, and why it deserves funding. Make it engaging and professional.",
  need_statement:
    'Write a detailed need statement that clearly identifies the problem or issue that this project will address. Include relevant statistics, evidence, and community impact. Make it persuasive and data-driven.',
  project_plan:
    'Create a comprehensive project plan that outlines the activities, timeline, methodology, and approach for achieving the project goals. Be specific about implementation steps and deliverables.',
  budget:
    'Develop a detailed budget section that justifies all expenses and shows how funds will be used efficiently. Include cost-effectiveness analysis and explain how the budget aligns with project goals.',
  outcomes:
    'Describe the expected outcomes and impact of the project. Include measurable goals, success metrics, evaluation methods, and long-term sustainability plans.',
  conclusion:
    'Write a strong conclusion that summarizes the key points, reinforces the value proposition, and makes a compelling final case for funding. End with a clear call to action.',
};

export function SystemPromptsSettings() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [sectionSettings, setSectionSettings] = useState<
    Record<string, SectionSettings>
  >({});
  const queryClient = useQueryClient();

  const { data: systemPrompts, isLoading } = useQuery({
    queryKey: ['system-prompts', user?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('user_id', user?.id)
        .order('section_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Initialize section settings when data loads
  React.useEffect(() => {
    const sections = [
      'introduction',
      'need_statement',
      'project_plan',
      'budget',
      'outcomes',
      'conclusion',
    ];
    const settingsMap: Record<string, SectionSettings> = {};

    sections.forEach((section) => {
      const existingPrompt = systemPrompts?.find(
        (p) => p.section_name === section
      );
      const recommendation =
        SECTION_RECOMMENDATIONS[
          section as keyof typeof SECTION_RECOMMENDATIONS
        ];

      if (existingPrompt) {
        // Use existing data
        settingsMap[section] = {
          prompt: existingPrompt.prompt_template,
          provider: recommendation?.defaultProvider || 'openai',
          model: recommendation?.defaultModel || 'gpt-4o',
        };
      } else {
        // Use defaults from recommendations
        settingsMap[section] = {
          prompt:
            DEFAULT_PROMPTS[section as keyof typeof DEFAULT_PROMPTS] || '',
          provider: recommendation?.defaultProvider || 'openai',
          model: recommendation?.defaultModel || 'gpt-4o',
        };
      }
    });

    setSectionSettings(settingsMap);
  }, [systemPrompts]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const updates = Object.entries(sectionSettings).map(
        ([section, settings]) => ({
          user_id: user?.id,
          section_name: section,
          prompt_template: settings.prompt,
        })
      );

      const promises = updates.map(async (update) => {
        const { error } = await supabase.from('system_prompts').upsert(update, {
          onConflict: 'user_id,section_name',
        });

        if (error) throw error;
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('System prompts updated successfully!');
      queryClient.invalidateQueries({
        queryKey: ['system-prompts', organization?.id],
      });
    },
    onError: (error) => {
      console.error('Error updating system prompts:', error);
      toast.error('Failed to update system prompts. Please try again.');
    },
  });

  const handleSave = () => {
    upsertMutation.mutate();
  };

  const handleReset = (sectionName: string) => {
    const recommendation =
      SECTION_RECOMMENDATIONS[
        sectionName as keyof typeof SECTION_RECOMMENDATIONS
      ];
    setSectionSettings((prev) => ({
      ...prev,
      [sectionName]: {
        prompt:
          DEFAULT_PROMPTS[sectionName as keyof typeof DEFAULT_PROMPTS] || '',
        provider: recommendation?.defaultProvider || 'openai',
        model: recommendation?.defaultModel || 'gpt-4o',
      },
    }));
  };

  const handleResetAll = () => {
    const sections = [
      'introduction',
      'need_statement',
      'project_plan',
      'budget',
      'outcomes',
      'conclusion',
    ];
    const settingsMap: Record<string, SectionSettings> = {};

    sections.forEach((section) => {
      const recommendation =
        SECTION_RECOMMENDATIONS[
          section as keyof typeof SECTION_RECOMMENDATIONS
        ];
      settingsMap[section] = {
        prompt: DEFAULT_PROMPTS[section as keyof typeof DEFAULT_PROMPTS] || '',
        provider: recommendation?.defaultProvider || 'openai',
        model: recommendation?.defaultModel || 'gpt-4o',
      };
    });

    setSectionSettings(settingsMap);
  };

  const handlePromptChange = (sectionName: string, value: string) => {
    setSectionSettings((prev) => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        prompt: value,
      },
    }));
  };

  const handleProviderChange = (sectionName: string, provider: string) => {
    const providerModels = getProviderModels(provider);
    const defaultModel = providerModels[0] || 'gpt-4o';

    setSectionSettings((prev) => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        provider,
        model: defaultModel,
      },
    }));
  };

  const handleModelChange = async (sectionName: string, model: string) => {
    const settings = sectionSettings[sectionName];
    if (settings?.provider) {
      // Track model usage when a model is selected
      await trackModelUsage(settings.provider, model);
    }

    setSectionSettings((prev) => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        model,
      },
    }));
  };

  if (isLoading) {
    return <div>Loading system prompts...</div>;
  }

  const sections = Object.keys(DEFAULT_PROMPTS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI System Prompts</h3>
          <p className="text-sm text-muted-foreground">
            Customize the AI prompts and providers used to generate different
            sections of your grant applications.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleResetAll}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsertMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {upsertMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((sectionName) => {
          const settings = sectionSettings[sectionName];
          const recommendation =
            SECTION_RECOMMENDATIONS[
              sectionName as keyof typeof SECTION_RECOMMENDATIONS
            ];
          const selectedProvider = getProviderById(
            settings?.provider || 'openai'
          );
          const availableModels = getProviderModels(
            settings?.provider || 'openai'
          );

          return (
            <Card key={sectionName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize flex items-center gap-2">
                      {sectionName.replace('_', ' ')}
                      {recommendation && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {
                        SECTION_DESCRIPTIONS[
                          sectionName as keyof typeof SECTION_DESCRIPTIONS
                        ]
                      }
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(sectionName)}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Provider Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`provider-${sectionName}`}>
                      AI Provider
                    </Label>
                    <Select
                      value={settings?.provider || 'openai'}
                      onValueChange={(value) =>
                        handleProviderChange(sectionName, value)
                      }
                    >
                      <SelectTrigger id={`provider-${sectionName}`}>
                        <SelectValue placeholder="Select AI Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            <div className="flex items-center gap-2">
                              <span>{provider.icon}</span>
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`model-${sectionName}`}>Model</Label>
                    <Select
                      value={settings?.model || 'gpt-4o'}
                      onValueChange={(value) =>
                        handleModelChange(sectionName, value)
                      }
                    >
                      <SelectTrigger id={`model-${sectionName}`}>
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recommendation Alert */}
                {recommendation && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Recommended:</strong> {recommendation.reason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Prompt Template */}
                <div className="space-y-2">
                  <Label htmlFor={`prompt-${sectionName}`}>
                    Prompt Template
                  </Label>
                  <Textarea
                    id={`prompt-${sectionName}`}
                    value={settings?.prompt || ''}
                    onChange={(e) =>
                      handlePromptChange(sectionName, e.target.value)
                    }
                    placeholder={`Enter prompt template for ${sectionName.replace(
                      '_',
                      ' '
                    )}...`}
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={upsertMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {upsertMutation.isPending ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
