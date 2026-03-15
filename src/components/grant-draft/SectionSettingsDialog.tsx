import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, RotateCcw, Sparkles, Info, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  AI_PROVIDERS,
  SECTION_RECOMMENDATIONS,
  getProviderById,
  getProviderModels,
  trackModelUsage,
} from '@/services/aiProviders';
import { useAuth } from '@/providers/AuthProvider';
import { useAIProvider } from '@/providers/AIProviderProvider';

interface SectionSettings {
  prompt: string;
  provider: string;
  model: string;
}

const SECTION_DESCRIPTIONS = {
  introduction: 'Sets the tone and introduces your organization and project purpose',
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

interface SectionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: string;
  sectionLabel: string;
}

export function SectionSettingsDialog({
  open,
  onOpenChange,
  sectionKey,
  sectionLabel,
}: SectionSettingsDialogProps) {
  const { user } = useAuth();
  const { getSectionSettings, updateSectionSettings } = useAIProvider();
  const [settings, setSettings] = useState<SectionSettings>({
    prompt: '',
    provider: 'openai',
    model: 'gpt-4o-mini',
  });
  const queryClient = useQueryClient();

  // Initialize settings when component mounts or section changes
  useEffect(() => {
    if (sectionKey) {
      const currentSettings = getSectionSettings(sectionKey);
      const recommendation = SECTION_RECOMMENDATIONS[sectionKey as keyof typeof SECTION_RECOMMENDATIONS];
      
      // Load existing prompt from database
      const loadPrompt = async () => {
        try {
          const { data } = await supabase
            .from('system_prompts')
            .select('*')
            .eq('user_id', user?.id)
            .eq('section_name', sectionKey)
            .single();
          
          setSettings({
            prompt: data?.prompt_template || DEFAULT_PROMPTS[sectionKey as keyof typeof DEFAULT_PROMPTS] || '',
            provider: data?.ai_provider || currentSettings.provider || recommendation?.defaultProvider || 'openai',
            model: data?.ai_model || currentSettings.model || recommendation?.defaultModel || 'gpt-4o-mini',
          });
        } catch (error) {
          // Use defaults if no existing prompt
          setSettings({
            prompt: DEFAULT_PROMPTS[sectionKey as keyof typeof DEFAULT_PROMPTS] || '',
            provider: currentSettings.provider || recommendation?.defaultProvider || 'openai',
            model: currentSettings.model || recommendation?.defaultModel || 'gpt-4o-mini',
          });
        }
      };
      
      loadPrompt();
    }
  }, [sectionKey, user?.id, getSectionSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const { error } = await supabase.from('system_prompts').upsert({
        user_id: user.id,
        section_name: sectionKey,
        prompt_template: settings.prompt,
        ai_provider: settings.provider,
        ai_model: settings.model,
      }, {
        onConflict: 'user_id,section_name',
      });

      if (error) throw error;

      // Update the AI provider context
      updateSectionSettings(sectionKey, {
        provider: settings.provider,
        model: settings.model,
      });
    },
    onSuccess: () => {
      toast.success('Section settings saved!');
      queryClient.invalidateQueries({ queryKey: ['system-prompts'] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving section settings:', error);
      toast.error('Failed to save settings. Please try again.');
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    const recommendation = SECTION_RECOMMENDATIONS[sectionKey as keyof typeof SECTION_RECOMMENDATIONS];
    setSettings({
      prompt: DEFAULT_PROMPTS[sectionKey as keyof typeof DEFAULT_PROMPTS] || '',
      provider: recommendation?.defaultProvider || 'openai',
      model: recommendation?.defaultModel || 'gpt-4o-mini',
    });
  };

  const handleProviderChange = (provider: string) => {
    const providerModels = getProviderModels(provider);
    const defaultModel = providerModels[0] || 'gpt-4o-mini';
    setSettings(prev => ({
      ...prev,
      provider,
      model: defaultModel,
    }));
  };

  const handleModelChange = async (model: string) => {
    if (settings.provider) {
      await trackModelUsage(settings.provider, model);
    }
    setSettings(prev => ({
      ...prev,
      model,
    }));
  };

  const recommendation = SECTION_RECOMMENDATIONS[sectionKey as keyof typeof SECTION_RECOMMENDATIONS];
  const selectedProvider = getProviderById(settings.provider);
  const availableModels = getProviderModels(settings.provider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize flex items-center gap-2">
            {sectionLabel} Settings
            {recommendation && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Recommended
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {SECTION_DESCRIPTIONS[sectionKey as keyof typeof SECTION_DESCRIPTIONS]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* AI Provider Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">AI Provider</Label>
                <Select value={settings.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="h-11">
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
                <Label className="text-sm font-medium">Model</Label>
                <Select value={settings.model} onValueChange={handleModelChange}>
                  <SelectTrigger className="h-11">
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
          <div className="space-y-3">
            <Label className="text-sm font-medium">System Prompt Template</Label>
            <Textarea
              value={settings.prompt}
              onChange={(e) => setSettings(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder={`Enter the AI prompt template for generating ${sectionLabel.toLowerCase()} content...`}
              className="min-h-[300px] resize-none text-sm leading-relaxed"
              rows={12}
            />
            <p className="text-xs text-muted-foreground">
              This prompt will guide the AI when generating content for the {sectionLabel.toLowerCase()} section.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}