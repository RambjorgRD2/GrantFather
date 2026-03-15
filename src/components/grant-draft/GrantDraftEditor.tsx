import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useAIProvider } from '@/providers/AIProviderProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AIProviderSelector } from './AIProviderSelector';
import { DataSourceDocs } from './DataSourceDocs';
import { FullScreenPreview } from './FullScreenPreview';
import { GrantDraftPreview } from './GrantDraftPreview';
import { SectionAIToolbar } from './SectionAIToolbar';
import { SectionSettingsButton } from './SectionSettingsButton';
import { SectionSettingsDialog } from './SectionSettingsDialog';
import { sectionRegenerationService } from '@/services/sectionRegenerationService';
import { sectionConfigService } from '@/services/sectionConfigService';
import { generateGrantPDF } from './PDFGenerator';
import { MobileSectionCollapse } from './MobileSectionCollapse';
import { GrantPortalIntegration } from './GrantPortalIntegration';
import { SystemPromptsSettings } from '@/components/settings/SystemPromptsSettings';
import { AIWriterWelcome } from '@/components/onboarding/AIWriterWelcome';
import { ApplicationProgress } from '@/components/onboarding/ApplicationProgress';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResizableSidebar } from './ResizableSidebar';
import { SectionNavigation } from './SectionNavigation';
import {
  Loader2,
  Save,
  Download,
  Send,
  Eye,
  EyeOff,
  Maximize,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertCircle,
  Info,
  ArrowLeft,
  Settings,
  Wand2,
  FileText,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useErrorHandler } from '@/services/errorHandlingService';
import {
  LoadingOverlay,
  useLoadingOverlay,
} from '@/components/ui/LoadingOverlay';
import { ProgressStep } from '@/components/ui/ProgressIndicator';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

import { GrantSection, GrantApplication } from '@/types/grantApplication';

const sectionLabels = {
  introduction: 'Intro',
  need_statement: 'Need',
  project_plan: 'Plan',
  budget: 'Budget',
  outcomes: 'Impact',
  conclusion: 'Result',
};

const inspirationalQuotes = [
  "Those who don't quit, win.",
  "Winners lose more than losers.",
  "Every 'no' brings you closer to a 'yes'.",
  "Great things never come from comfort zones.",
  "The only way to do great work is to love what you do.",
  "Persistence is the twin sister of excellence.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Innovation distinguishes between a leader and a follower.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Your passion is waiting for your courage to catch up.",
  "Funding follows purpose—make yours undeniable.",
  "Every grant rejected is a lesson learned.",
  "The best time to start was yesterday. The next best time is now.",
  "Clarity of vision attracts resources.",
  "Impact begins with a well-told story.",
];

const toneOptions = [
  { value: 'formal', label: 'Formal' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'concise', label: 'Concise' },
  { value: 'academic', label: 'Academic' },
  { value: 'conversational', label: 'Conversational' },
];

export function GrantDraftEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalSettings, getSectionSettings } = useAIProvider();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { handleError } = useErrorHandler();
  const {
    show: showLoading,
    hide: hideLoading,
    updateProgress,
    setCurrentStepId,
  } = useLoadingOverlay();
  const performanceMetrics = usePerformanceMonitor('GrantDraftEditor');

  const [sections, setSections] = useState<GrantSection>({
    introduction: '',
    need_statement: '',
    project_plan: '',
    budget: '',
    outcomes: '',
    conclusion: '',
  });
  const [activeTab, setActiveTab] = useState('introduction');
  const [showPreview, setShowPreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [selectedAIProvider, setSelectedAIProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5');
  // PHASE 3: Use ref instead of state to prevent re-renders
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [settingsSection, setSettingsSection] = useState<{
    key: string;
    label: string;
  } | null>(null);
  
  // PHASE 3: Track generation errors for recovery
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastMutationParams, setLastMutationParams] = useState<any>(null);
  
  // PHASE 4: Track stuck generation state
  const [isGenerationStuck, setIsGenerationStuck] = useState(false);

  // Remove sidebar width state (no longer needed)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('section_sidebar_open') !== 'false';
  });

  // Collapsible sections state
  const [portalIntegrationOpen, setPortalIntegrationOpen] = useState(() => {
    return localStorage.getItem('portal_integration_open') === 'true';
  });
  const [dataSourceDocsOpen, setDataSourceDocsOpen] = useState(() => {
    return localStorage.getItem('data_source_docs_open') === 'true';
  });

  // Inspirational quote for loading screen
  const [currentQuote, setCurrentQuote] = useState('');
  // PHASE 1: Track if quote has been set to prevent loop
  const quoteSetRef = React.useRef(false);
  // PHASE 5: Track generation progress
  const [generationProgress, setGenerationProgress] = useState<string>('');
  // PHASE 4: Track if component is mounted
  const isMountedRef = React.useRef(true);

  // Check if this is first-time user from quick start
  useEffect(() => {
    const isWelcome = searchParams.get('welcome') === 'true';
    const hasSeenWelcome = localStorage.getItem('ai_writer_welcome_completed');

    if (isWelcome && !hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, [searchParams]);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('section_sidebar_open', sidebarOpen.toString());
  }, [sidebarOpen]);

  // Save collapsible state to localStorage
  useEffect(() => {
    localStorage.setItem(
      'portal_integration_open',
      portalIntegrationOpen.toString()
    );
  }, [portalIntegrationOpen]);

  useEffect(() => {
    localStorage.setItem(
      'data_source_docs_open',
      dataSourceDocsOpen.toString()
    );
  }, [dataSourceDocsOpen]);

  // Fetch application data
  const {
    data: application,
    isLoading,
    error: queryError,
  } = useQuery<GrantApplication>({
    queryKey: ['grant-application', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grant_applications')
        .select('*')
        .eq('id', id!)
        .eq('user_id', user?.id!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as GrantApplication;
    },
    enabled: !!id && !!user,
  });

  // Load saved AI provider/model from system_prompts for current section
  useEffect(() => {
    if (!user?.id || !activeTab) return;
    
    const loadSectionSettings = async () => {
      const { data } = await supabase
        .from('system_prompts')
        .select('ai_provider, ai_model')
        .eq('user_id', user.id)
        .eq('section_name', activeTab)
        .maybeSingle();
      
      if (data?.ai_provider) {
        setSelectedAIProvider(data.ai_provider);
      }
      if (data?.ai_model) {
        setSelectedModel(data.ai_model);
      }
    };
    
    loadSectionSettings();
  }, [user?.id, activeTab]);

  // Load sections from application data
  useEffect(() => {
    if (application?.generated_draft) {
      try {
        let parsedSections;

        // Handle different data types for generated_draft
        if (typeof application.generated_draft === 'string') {
          // If it's a string, try to parse it as JSON
          parsedSections = JSON.parse(application.generated_draft);
        } else if (typeof application.generated_draft === 'object') {
          // If it's already an object, check if it has the expected structure
          const draft = application.generated_draft as any;

          // Check if it's the old format (created_via, funding_amount)
          if (draft.created_via || draft.funding_amount !== undefined) {
            console.warn(
              'Found old generated_draft format, clearing for regeneration'
            );
            // Clear the old format so it can be regenerated properly
            setSections({
              introduction: '',
              need_statement: '',
              project_plan: '',
              budget: '',
              outcomes: '',
              conclusion: '',
            });
            return;
          }

          // If it has the expected section structure, use it
          if (
            draft.introduction ||
            draft.need_statement ||
            draft.project_plan
          ) {
            parsedSections = draft;
          } else {
            console.warn('Unexpected generated_draft object structure:', draft);
            setSections({
              introduction: '',
              need_statement: '',
              project_plan: '',
              budget: '',
              outcomes: '',
              conclusion: '',
            });
            return;
          }
        } else {
          console.warn(
            'Unexpected generated_draft type:',
            typeof application.generated_draft
          );
          setSections({
            introduction: '',
            need_statement: '',
            project_plan: '',
            budget: '',
            outcomes: '',
            conclusion: '',
          });
          return;
        }

        // Validate that parsedSections has the expected structure
        if (parsedSections && typeof parsedSections === 'object') {
          setSections(parsedSections);
        } else {
          console.warn('Parsed sections is not an object:', parsedSections);
          setSections({
            introduction: '',
            need_statement: '',
            project_plan: '',
            budget: '',
            outcomes: '',
            conclusion: '',
          });
        }
      } catch (error) {
        console.error('Error parsing generated draft:', error);
        // Set empty sections on error
        setSections({
          introduction: '',
          need_statement: '',
          project_plan: '',
          budget: '',
          outcomes: '',
          conclusion: '',
        });
      }
    }
  }, [application]);

  // Generate draft mutation
  const generateDraftMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'ai-grant-writer',
        {
          body: {
            applicationId: id,
            aiProvider: globalSettings.provider,
            model: globalSettings.model,
          },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSections(data.sections);
      toast({
        title: 'Draft generated successfully',
        description: 'Your grant application draft has been created.',
      });
      // PHASE 3: Don't invalidate queries - just update local state
      // This prevents unnecessary org refetch
    },
    onError: (error: any) => {
      console.error('Draft generation error:', error);
      
      let errorMessage = 'Failed to generate draft. Please try again.';
      
      // Check if it's a FunctionsHttpError with response data
      if (error?.context?.body) {
        const errorBody = error.context.body;
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Add helpful context for common errors
      if (errorMessage.includes('API key')) {
        errorMessage += ' Please contact your administrator.';
      } else if (errorMessage.includes('Unauthorized')) {
        errorMessage += ' Please try logging in again.';
      }
      
      toast({
        title: 'Error generating draft',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Regenerate section mutation using new service layer
  const regenerateSectionMutation = useMutation({
    mutationFn: async ({
      section,
      tone,
      improvement,
    }: {
      section: string;
      tone?: string;
      improvement?: string;
    }) => {
      // Store params for potential retry
      setLastMutationParams({ section, tone, improvement });
      
      // Check if user has custom system_prompts for this section
      const { data: customPrompt } = await supabase
        .from('system_prompts')
        .select('ai_provider, ai_model')
        .eq('user_id', user?.id)
        .eq('section_name', section)
        .maybeSingle();

      // Use user-selected provider/model, fallback to custom prompt, then to defaults
      const aiProvider = selectedAIProvider || customPrompt?.ai_provider || 'openai';
      const model = selectedModel || customPrompt?.ai_model || 'gpt-5-2025-08-07';

      // PHASE 5: Add progress callback
      const response = await sectionRegenerationService.regenerateSection(
        {
          applicationId: id!,
          section,
          tone: (tone || 'formal') as 'formal' | 'persuasive' | 'concise' | 'academic' | 'conversational',
          aiProvider,
          model,
          improvement,
        },
        (progressMessage) => {
          if (isMountedRef.current) {
            setGenerationProgress(progressMessage);
          }
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to regenerate section');
      }

      return response;
    },
    retry: false, // PHASE 2: Disable retries - fail fast to prevent freeze
    onSuccess: (data) => {
      if (!isMountedRef.current) return;
      
      setGenerationError(null);
      setCurrentQuote('');
      setIsGenerationStuck(false);
      setGenerationProgress('');
      quoteSetRef.current = false;
      
      setSections((prev) => ({
        ...prev,
        [data.section]: data.content,
      }));

      toast({
        title: 'Section regenerated',
        description: `The ${
          sectionLabels[data.section as keyof typeof sectionLabels]
        } section has been updated and will auto-save.`,
      });
      
      // PHASE 2: Don't invalidate queries - prevents unnecessary refetch
    },
    onError: (error: Error) => {
      // PHASE 5: Enhanced categorized error handling
      console.error('❌ AI generation failed:', {
        error: error.message,
        section: lastMutationParams?.section,
        provider: selectedAIProvider,
        model: selectedModel,
        timestamp: new Date().toISOString()
      });
      
      setGenerationError(error.message);
      setCurrentQuote('');
      setIsGenerationStuck(false);
      
      // Categorize error type
      const errorType = categorizeError(error);
      
      switch (errorType) {
        case 'timeout':
          toast({
            title: 'Generation Timed Out',
            description: 'The AI took too long to respond. Try a simpler prompt or different model.',
            variant: 'destructive',
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedModel('gpt-4.1-2025-04-14');
                  if (lastMutationParams) {
                    regenerateSectionMutation.mutate(lastMutationParams);
                  }
                }}
              >
                Retry with GPT-4.1
              </Button>
            ),
          });
          break;
          
        case 'reasoning_error':
          toast({
            title: 'Reasoning Model Error',
            description: 'GPT-5 had trouble. Try GPT-4.1 or GPT-5-mini instead.',
            variant: 'destructive',
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedModel('gpt-4.1-2025-04-14');
                  setSelectedAIProvider('openai');
                  if (lastMutationParams) {
                    regenerateSectionMutation.mutate(lastMutationParams);
                  }
                }}
              >
                Retry with GPT-4.1
              </Button>
            ),
          });
          break;
          
        case 'api_key_error':
          toast({
            title: 'API Configuration Error',
            description: 'AI service not configured. Please contact support.',
            variant: 'destructive',
          });
          break;
          
        case 'empty_content':
          toast({
            title: 'Empty Response',
            description: 'AI returned no content. Try rephrasing your prompt.',
            variant: 'destructive',
          });
          break;
          
        default:
          toast({
            title: 'Generation Failed',
            description: error.message || 'Please try again.',
            variant: 'destructive',
          });
      }
    },
  });

  // PHASE 4: Component mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // PHASE 4: Watchdog timer with mounted guard
  useEffect(() => {
    let watchdogTimer: NodeJS.Timeout | null = null;
    
    if (regenerateSectionMutation.isPending) {
      // Set watchdog for 60 seconds (backup to edge function timeout)
      watchdogTimer = setTimeout(() => {
        // PHASE 4: Guard against unmounted component
        if (!isMountedRef.current) return;
        
        console.error('⚠️ Generation watchdog triggered - resetting stuck state');
        setIsGenerationStuck(true);
        setCurrentQuote('');
        setGenerationProgress('');
        
        toast({
          title: 'Generation Taking Too Long',
          description: 'This is taking longer than expected. You can cancel and try again.',
          variant: 'destructive',
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (!isMountedRef.current) return;
                
                // Force reset mutation state
                queryClient.setQueryData(['regenerate-mutation-state'], null);
                setIsGenerationStuck(false);
                setCurrentQuote('');
                setGenerationError(null);
                setGenerationProgress('');
                quoteSetRef.current = false;
                
                toast({
                  title: 'Reset Complete',
                  description: 'You can try regenerating again.',
                });
              }}
            >
              Reset
            </Button>
          ),
        });
      }, 60000);
    } else {
      setIsGenerationStuck(false);
      // Clear timer immediately when not pending
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
    }
    
    return () => {
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
      }
    };
  }, [regenerateSectionMutation.isPending, queryClient, toast]);

  // PHASE 5: Helper function to categorize errors
  const categorizeError = (error: Error): string => {
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return 'timeout';
    }
    if (error.message.includes('reasoning') || error.message.includes('no output')) {
      return 'reasoning_error';
    }
    if (error.message.includes('API key') || error.message.includes('not configured')) {
      return 'api_key_error';
    }
    if (error.message.includes('empty content') || error.message.includes('Empty Response')) {
      return 'empty_content';
    }
    return 'unknown';
  };

  // Update application mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async (updates: Partial<GrantApplication>) => {
      if (!id) throw new Error('Application ID is required');

      const { data, error } = await supabase
        .from('grant_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update application');
      }

      return data;
    },
    onSuccess: () => {
      // PHASE 2: Remove query invalidation - local state already updated
      console.log('✅ Application auto-saved successfully');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update application',
        variant: 'destructive',
      });
    },
  });

  // PHASE 1: Fix quote management loop - remove currentQuote from deps
  useEffect(() => {
    if (regenerateSectionMutation.isPending && !quoteSetRef.current) {
      const randomQuote = inspirationalQuotes[
        Math.floor(Math.random() * inspirationalQuotes.length)
      ];
      setCurrentQuote(randomQuote);
      quoteSetRef.current = true;
    } else if (!regenerateSectionMutation.isPending) {
      setCurrentQuote('');
      setGenerationProgress('');
      quoteSetRef.current = false;
    }
  }, [regenerateSectionMutation.isPending]);

  // Auto-save functionality
  const saveChanges = async () => {
    try {
      const { error } = await supabase
        .from('grant_applications')
        .update({
          generated_draft: JSON.stringify(sections),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('user_id', user?.id!);

      if (error) throw error;
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  const handleSectionChange = (section: keyof GrantSection, value: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: value,
    }));

    // PHASE 3: Clear existing timer using ref
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new auto-save timer
    autoSaveTimerRef.current = setTimeout(saveChanges, 2000);
  };

  // PHASE 3: Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleRegenerateSection = (tone?: string) => {
    regenerateSectionMutation.mutate({
      section: activeTab,
      tone,
    });
  };

  const handleImproveWriting = (improvement: string) => {
    if (
      !sections[activeTab as keyof GrantSection] ||
      regenerateSectionMutation.isPending
    )
      return;

    // Use the new service layer for improvements
    regenerateSectionMutation.mutate({
      section: activeTab,
      improvement,
    });
  };

  const downloadPDF = () => {
    if (!application) {
      toast({ title: 'Error', description: 'Application data not loaded yet.', variant: 'destructive' });
      return;
    }
    const hasContent = Object.values(sections).some((v) => v.trim().length > 0);
    if (!hasContent) {
      toast({ title: 'Nothing to export', description: 'Generate at least one section before downloading.' });
      return;
    }
    try {
      generateGrantPDF(sections, {
        project_name: application.project_name,
        funding_amount: application.funding_amount,
        timeline_start: application.timeline_start,
        timeline_end: application.timeline_end,
        organizations: application.organizations ?? { name: '', org_type: '' },
      });
      toast({ title: 'PDF downloaded', description: `${application.project_name}.pdf saved.` });
    } catch (err) {
      toast({ title: 'PDF failed', description: 'Could not generate the PDF. Please try again.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <main className="container py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  if (queryError) {
    return (
      <main className="container py-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium mb-2">
              Error loading application
            </p>
            <p className="text-muted-foreground mb-4">
              {queryError.message ||
                'An error occurred while loading the application.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => navigate('/applications')}
                variant="outline"
              >
                Back to Applications
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!application) {
    return (
      <main className="container py-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium mb-2">Application not found</p>
            <p className="text-muted-foreground mb-4">
              This application may not exist or you may not have access to it.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => navigate('/applications')}
                variant="outline"
              >
                Back to Applications
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Create progress steps for onboarding
  const progressSteps = [
    {
      id: 'setup',
      label: 'Project Setup',
      completed: true,
    },
    {
      id: 'generate',
      label: 'Generate First Section',
      completed: !!sections.introduction,
      current: !sections.introduction,
    },
    {
      id: 'review',
      label: 'Review & Customize',
      completed: Object.values(sections).filter(Boolean).length >= 3,
      current:
        !!sections.introduction &&
        Object.values(sections).filter(Boolean).length < 3,
    },
    {
      id: 'complete',
      label: 'Complete Application',
      completed: Object.values(sections).every(Boolean),
      current:
        Object.values(sections).filter(Boolean).length >= 3 &&
        !Object.values(sections).every(Boolean),
    },
  ];

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        handleError(error, {
          component: 'GrantDraftEditor',
          action: 'render',
          applicationId: id,
        });
      }}
    >
      <main className="container py-6">
        <div
          className={`mb-6 flex items-center ${
            isMobile ? 'flex-col gap-4' : 'justify-between'
          }`}
        >
          <div
            className={`flex items-center gap-4 ${isMobile ? 'w-full' : ''}`}
          >
            <Button
              variant="ghost"
              size={isMobile ? 'default' : 'icon'}
              onClick={() => navigate('/applications')}
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              <ArrowLeft className="h-4 w-4" />
              {isMobile && <span className="ml-2">Back</span>}
            </Button>
            <div className={isMobile ? 'flex-1' : ''}>
              <h1
                className={`font-semibold tracking-tight ${
                  isMobile ? 'text-xl' : 'text-2xl'
                }`}
              >
                Grant Draft Editor
              </h1>
              <p
                className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}
              >
                {application.project_name} •{' '}
                {application.organizations?.name || 'Organization'}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 ${
              isMobile ? 'w-full flex-wrap' : ''
            }`}
          >
            {!isMobile && (
              <Button
                variant="outline"
                onClick={() => setShowIntegrations(!showIntegrations)}
              >
                <Settings className="mr-2 h-4 w-4" />
                {showIntegrations ? 'Hide Tools' : 'AI & Data Tools'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className={isMobile ? 'flex-1 min-h-[44px]' : ''}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFullPreview(true)}
              className={isMobile ? 'flex-1 min-h-[44px]' : ''}
            >
              <Maximize className="mr-2 h-4 w-4" />
              Full Preview
            </Button>
            <Button
              onClick={downloadPDF}
              variant="outline"
              className={isMobile ? 'flex-1 min-h-[44px]' : ''}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {showIntegrations && !isMobile && (
          <div className="mb-6 space-y-4">
            {/* Grant Portal Integration */}
            <Collapsible
              open={portalIntegrationOpen}
              onOpenChange={setPortalIntegrationOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">
                      Grant Portal Integration
                    </span>
                  </div>
                  {portalIntegrationOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4">
                <GrantPortalIntegration />
              </CollapsibleContent>
            </Collapsible>

            {/* Data Source Documentation */}
            <Collapsible
              open={dataSourceDocsOpen}
              onOpenChange={setDataSourceDocsOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">
                      Data Source Documentation
                    </span>
                  </div>
                  {dataSourceDocsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4">
                <DataSourceDocs />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Application Details Section - MOVED OUTSIDE CONDITIONAL BLOCK */}
        <Card className="mb-6 swiss-card animate-fade-up">
          <CardHeader>
            <CardTitle className="text-swiss-title flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Application Details
            </CardTitle>
            <p className="text-swiss-caption text-muted-foreground">
              Review and edit your project information that will be used
              throughout your grant application.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={application?.project_name || ''}
                  onChange={(e) => {
                    // Update application name in real-time
                    if (application) {
                      updateApplicationMutation.mutate({
                        project_name: e.target.value,
                      });
                    }
                  }}
                  placeholder="Enter your project name"
                  className="text-swiss-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funding-amount">Funding Amount (NOK)</Label>
                <Input
                  id="funding-amount"
                  type="number"
                  value={application?.funding_amount || ''}
                  onChange={(e) => {
                    if (application) {
                      updateApplicationMutation.mutate({
                        funding_amount: parseFloat(e.target.value) || 0,
                      });
                    }
                  }}
                  placeholder="Enter funding amount"
                  className="text-swiss-body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-summary">Project Summary</Label>
              <Textarea
                id="project-summary"
                value={application?.summary || ''}
                onChange={(e) => {
                  if (application) {
                    updateApplicationMutation.mutate({
                      summary: e.target.value,
                    });
                  }
                }}
                placeholder="Describe your project in detail..."
                className="min-h-[120px] text-swiss-body leading-relaxed resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This summary will be used as context for AI generation and
                appears in your application overview.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target-audience">Target Audience</Label>
                <Input
                  id="target-audience"
                  value={application?.target_audience || ''}
                  onChange={(e) => {
                    if (application) {
                      updateApplicationMutation.mutate({
                        target_audience: e.target.value,
                      });
                    }
                  }}
                  placeholder="Who will benefit from this project?"
                  className="text-swiss-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-impact">Expected Impact</Label>
                <Input
                  id="expected-impact"
                  value={application?.expected_impact || ''}
                  onChange={(e) => {
                    if (application) {
                      updateApplicationMutation.mutate({
                        expected_impact: e.target.value,
                      });
                    }
                  }}
                  placeholder="What impact will this project have?"
                  className="text-swiss-body"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeline-start">Project Start Date</Label>
                <Input
                  id="timeline-start"
                  type="date"
                  value={application?.timeline_start || ''}
                  onChange={(e) => {
                    if (application) {
                      updateApplicationMutation.mutate({
                        timeline_start: e.target.value,
                      });
                    }
                  }}
                  className="text-swiss-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeline-end">Project End Date</Label>
                <Input
                  id="timeline-end"
                  type="date"
                  value={application?.timeline_end || ''}
                  onChange={(e) => {
                    if (application) {
                      updateApplicationMutation.mutate({
                        timeline_end: e.target.value,
                      });
                    }
                  }}
                  className="text-swiss-body"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Progress Section - MOVED BELOW APPLICATION DETAILS */}
        {localStorage.getItem('onboarding_started') &&
          !localStorage.getItem('ai_writer_welcome_completed') &&
          !isMobile && (
            <Card className="mb-6 swiss-card animate-fade-up">
              <CardHeader>
                <CardTitle className="text-swiss-title">
                  Application Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ApplicationProgress steps={progressSteps} />
              </CardContent>
            </Card>
          )}

        {!sections.introduction && !generateDraftMutation.isPending && (
          <Card className="mb-6 swiss-card animate-fade-up">
            <CardHeader>
              <CardTitle className="text-swiss-title">
                Generate Your Grant Application Draft
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-swiss-body text-muted-foreground">
                Generate an AI-powered first draft of your grant application
                based on the information you provided.
              </p>
              <AIProviderSelector
                selectedProvider={selectedAIProvider}
                selectedModel={selectedModel}
                onProviderChange={setSelectedAIProvider}
                onModelChange={setSelectedModel}
                isMobile={isMobile}
              />
              <Button
                onClick={() => generateDraftMutation.mutate()}
                disabled={generateDraftMutation.isPending}
                className="w-full"
                size="lg"
              >
                {generateDraftMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Draft...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Draft with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}


        <div
          className={`grid gap-6 ${
            showPreview && !isMobile ? 'lg:grid-cols-3' : 'grid-cols-1'
          }`}
        >
          <div
            className={`space-y-6 animate-fade-up ${
              showPreview && !isMobile ? 'lg:col-span-2' : 'col-span-1'
            }`}
          >
            {isMobile ? (
              <MobileSectionCollapse
                sections={sections}
                sectionLabels={sectionLabels}
                activeSection={activeTab}
                isRegenerating={regenerateSectionMutation.isPending}
                selectedProvider={selectedAIProvider}
                selectedModel={selectedModel}
                onSectionChange={handleSectionChange}
                onSectionSelect={setActiveTab}
                onProviderChange={setSelectedAIProvider}
                onModelChange={setSelectedModel}
                onRegenerate={handleRegenerateSection}
                onImproveWriting={handleImproveWriting}
              />
            ) : (
              <div className="flex h-full min-h-[600px]">
                <ResizableSidebar
                  isOpen={sidebarOpen}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                  className="h-full"
                >
                  <SectionNavigation
                    sections={sections as unknown as Record<string, string>}
                    sectionLabels={sectionLabels}
                    activeSection={activeTab}
                    onSectionSelect={setActiveTab}
                    completionStatus={
                      sections as unknown as Record<string, string>
                    }
                  />
                </ResizableSidebar>

                <div className="flex-1 p-6 overflow-hidden">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="flex-shrink-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <CardTitle className="text-swiss-title">
                            {sectionLabels[activeTab]}
                          </CardTitle>
                          {regenerateSectionMutation.isPending && (
                            <Badge variant="secondary" className="text-xs">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Generating...
                            </Badge>
                          )}
                        </div>

                        {!regenerateSectionMutation.isPending && (
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={regenerateSectionMutation.isPending}
                              className="flex-shrink-0"
                            >
                              <Wand2 className="h-3 w-3 mr-1" />
                              Section Tools
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-80">
                            <div className="p-3">
                              <SectionAIToolbar
                                sectionKey={activeTab}
                                isRegenerating={
                                  regenerateSectionMutation.isPending
                                }
                                selectedProvider={
                                  getSectionSettings(activeTab).provider
                                }
                                selectedModel={
                                  getSectionSettings(activeTab).model
                                }
                                onProviderChange={(provider) => {
                                  console.log(
                                    'Provider change for section:',
                                    activeTab,
                                    provider
                                  );
                                }}
                                onModelChange={(model) => {
                                  console.log(
                                    'Model change for section:',
                                    activeTab,
                                    model
                                  );
                                }}
                                onRegenerate={handleRegenerateSection}
                                onImproveWriting={handleImproveWriting}
                              />
                            </div>
                            <DropdownMenuSeparator />
                            <div className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSettingsSection({
                                    key: activeTab,
                                    label: sectionLabels[activeTab],
                                  });
                                }}
                                className="w-full justify-start"
                              >
                              <Settings className="h-4 w-4 mr-2" />
                              Section Settings
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                        )}
                      </div>

                      <p className="text-swiss-caption text-muted-foreground">
                        {activeTab === 'introduction' &&
                          'Introduce your project and organization'}
                        {activeTab === 'need_statement' &&
                          "Define the problem you're addressing"}
                        {activeTab === 'project_plan' &&
                          'Detail your project methodology and timeline'}
                        {activeTab === 'budget' &&
                          'Outline funding requirements and allocation'}
                        {activeTab === 'outcomes' &&
                          'Describe expected impact and measurable results'}
                        {activeTab === 'conclusion' &&
                          'Summarize and reinforce your request'}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col section-swiss">
                      <Textarea
                        value={sections[activeTab as keyof GrantSection]}
                        onChange={(e) =>
                          handleSectionChange(
                            activeTab as keyof GrantSection,
                            e.target.value
                          )
                        }
                        placeholder={`Write your ${sectionLabels[
                          activeTab
                        ].toLowerCase()} here...`}
                        className="flex-1 swiss-textarea text-swiss-body leading-relaxed resize-none"
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {showPreview && !isMobile && (
            <div className="animate-fade-up">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Preview</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullPreview(true)}
                    className="gap-2"
                  >
                    <Maximize className="h-4 w-4" />
                    Full Screen
                  </Button>
                </div>
                <GrantDraftPreview
                  sections={sections}
                  application={application}
                />
              </Card>
            </div>
          )}
        </div>

        {/* Welcome Overlay for First-Time Users */}
        {application && (
          <AIWriterWelcome
            open={showWelcome}
            onOpenChange={setShowWelcome}
            projectName={application.project_name}
          />
        )}

        {/* Section Settings Dialog */}
        {settingsSection && (
          <SectionSettingsDialog
            open={!!settingsSection}
            onOpenChange={(open) => !open && setSettingsSection(null)}
            sectionKey={settingsSection.key}
            sectionLabel={settingsSection.label}
          />
        )}

        {/* Full Screen Preview */}
        <FullScreenPreview
          isOpen={showFullPreview}
          onClose={() => setShowFullPreview(false)}
          sections={sections}
          application={{
            ...application,
            organizations: application.organizations ? {
              name: application.organizations.name,
              org_type: application.organizations.org_type,
              mission: application.organizations.mission || ''
            } : { name: '', org_type: '', mission: '' }
          }}
          onDownloadPDF={downloadPDF}
        />

        {/* Loading Overlay - PHASE 5: With progress message */}
        <LoadingOverlay
          isVisible={regenerateSectionMutation.isPending && !isGenerationStuck}
          title="Generating Content"
          description="AI is crafting your grant application section..."
          quote={currentQuote}
          progressMessage={generationProgress}
          showProgress={!isGenerationStuck}
          variant="fullscreen"
        />
      </main>
    </ErrorBoundary>
  );
}
