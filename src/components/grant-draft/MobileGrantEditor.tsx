import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useAIProvider } from '@/providers/AIProviderProvider';
import { MobileNavigationBar } from './MobileNavigationBar';
import { MobileToolsDrawer } from './MobileToolsDrawer';
import { MobileTextEditor } from './MobileTextEditor';
import { MobilePreview } from './MobilePreview';
import { MobileSectionIndicator } from './MobileSectionIndicator';
import { SwipeableSection } from './SwipeableSection';
import { AIWriterWelcome } from '@/components/onboarding/AIWriterWelcome';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useErrorHandler } from '@/services/errorHandlingService';
import {
  Loader2,
  ArrowLeft,
  Wand2,
  Plus,
  Eye,
  Download,
  Share,
} from 'lucide-react';

import {
  LoadingOverlay,
  useLoadingOverlay,
} from '@/components/ui/LoadingOverlay';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

import { GrantSection, GrantApplication } from '@/types/grantApplication';

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

const sectionLabels = {
  introduction: 'Intro',
  need_statement: 'Need',
  project_plan: 'Plan',
  budget: 'Budget',
  outcomes: 'Impact',
  conclusion: 'Result',
};

const toneOptions = [
  { value: 'formal', label: 'Formal' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'concise', label: 'Concise' },
  { value: 'academic', label: 'Academic' },
  { value: 'conversational', label: 'Conversational' },
];

const sectionOrder = Object.keys(sectionLabels);

export function MobileGrantEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalSettings, getSectionSettings } = useAIProvider();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const [sections, setSections] = useState<GrantSection>({
    introduction: '',
    need_statement: '',
    project_plan: '',
    budget: '',
    outcomes: '',
    conclusion: '',
  });

  const [activeSection, setActiveSection] = useState('introduction');
  const [selectedAIProvider, setSelectedAIProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  // PHASE 3: Use ref instead of state
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile-specific states
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // Inspirational quote for loading screen
  const [currentQuote, setCurrentQuote] = useState('');
  // PHASE 1: Track if quote has been set
  const quoteSetRef = useRef(false);

  // Check if this is first-time user from quick start
  useEffect(() => {
    const isWelcome = searchParams.get('welcome') === 'true';
    const hasSeenWelcome = localStorage.getItem('ai_writer_welcome_completed');

    if (isWelcome && !hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, [searchParams]);

  // Fetch application data
  const { data: application, isLoading } = useQuery<GrantApplication>({
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

  // Load sections from application data
  useEffect(() => {
    if (application?.generated_draft) {
      try {
        let parsedSections;

        if (typeof application.generated_draft === 'string') {
          parsedSections = JSON.parse(application.generated_draft);
        } else if (typeof application.generated_draft === 'object') {
          const draft = application.generated_draft as any;

          if (draft.created_via || draft.funding_amount !== undefined) {
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

          if (
            draft.introduction ||
            draft.need_statement ||
            draft.project_plan
          ) {
            parsedSections = draft;
          } else {
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
        }

        if (parsedSections && typeof parsedSections === 'object') {
          setSections(parsedSections);
        } else {
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
      queryClient.invalidateQueries({ queryKey: ['grant-application', id] });
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

  // Regenerate section mutation
  const regenerateSectionMutation = useMutation({
    mutationFn: async ({
      section,
      tone,
    }: {
      section: string;
      tone?: string;
    }) => {
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

      const { data, error } = await supabase.functions.invoke(
        'ai-grant-writer',
        {
          body: {
            applicationId: id,
            section,
            tone: tone || 'formal',
            regenerate: true,
            aiProvider,
            model,
          },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSections((prev) => ({
        ...prev,
        [data.section]: data.content,
      }));

      // Trigger immediate auto-save after successful regeneration
      saveChanges();

      toast({
        title: 'Section regenerated',
        description: `The ${
          sectionLabels[data.section as keyof typeof sectionLabels]
        } section has been updated and saved.`,
      });
      
      // PHASE 2: Reset quote ref
      quoteSetRef.current = false;
    },
    onError: (error) => {
      toast({
        title: 'Error regenerating section',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

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
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update application',
        variant: 'destructive',
      });
    },
  });

  // PHASE 1: Fix quote management loop
  useEffect(() => {
    if (regenerateSectionMutation.isPending && !quoteSetRef.current) {
      const randomQuote = inspirationalQuotes[
        Math.floor(Math.random() * inspirationalQuotes.length)
      ];
      setCurrentQuote(randomQuote);
      quoteSetRef.current = true;
    } else if (!regenerateSectionMutation.isPending) {
      setCurrentQuote('');
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
      section: activeSection,
      tone,
    });
  };

  const handleImproveWriting = (improvement: string) => {
    if (
      !sections[activeSection as keyof GrantSection] ||
      regenerateSectionMutation.isPending
    )
      return;

    const improvementPrompts = {
      compelling: 'Make this more compelling and persuasive',
      clarity: 'Improve the clarity and readability',
      evidence: 'Add more supporting evidence and data',
      concise: 'Make this more concise while keeping key information',
    };

    regenerateSectionMutation.mutate({
      section: activeSection,
      tone:
        improvementPrompts[improvement as keyof typeof improvementPrompts] ||
        improvement,
    });
  };

  const handleSectionNavigation = (direction: 'next' | 'prev') => {
    const currentIndex = sectionOrder.indexOf(activeSection);
    let newIndex;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % sectionOrder.length;
    } else {
      newIndex =
        currentIndex === 0 ? sectionOrder.length - 1 : currentIndex - 1;
    }

    setActiveSection(sectionOrder[newIndex]);
  };

  const downloadPDF = () => {
    toast({
      title: 'PDF Generation',
      description: 'PDF generation feature coming soon!',
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${application?.project_name} - Grant Application`,
        text: 'Check out my grant application draft',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Application link copied to clipboard',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium mb-2">Application not found</p>
            <p className="text-muted-foreground mb-4">
              This application may not exist or you may not have access to it.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => navigate('/applications')}
                className="w-full"
                variant="outline"
              >
                Back to Applications
              </Button>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        handleError(error, {
          component: 'MobileGrantEditor',
          action: 'render',
          applicationId: id,
        });
      }}
    >
      <div className="min-h-screen bg-background pb-20">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/applications')}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-lg truncate">
                {application.project_name}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {application.organizations?.name || 'Organization'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreview(true)}
                className="h-10 w-10"
              >
                <Eye className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={downloadPDF}
                className="h-10 w-10"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="p-4">
          <MobileSectionIndicator
            sections={sections}
            sectionLabels={sectionLabels}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>


        {/* Application Details Section - MOVED TO TOP */}
        <div className="p-4">
          <Card className="swiss-card">
            <CardHeader>
              <CardTitle className="text-swiss-title text-lg">
                Application Details
              </CardTitle>
              <p className="text-swiss-caption text-muted-foreground text-sm">
                Review and edit your project information.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <input
                  value={application?.project_name || ''}
                  onChange={(e) => {
                    if (application) {
                      updateApplicationMutation.mutate({
                        project_name: e.target.value,
                      });
                    }
                  }}
                  placeholder="Enter your project name"
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Summary</label>
                <textarea
                  value={application?.summary || ''}
                  onChange={(e) => {
                    if (application) {
                      updateApplicationMutation.mutate({
                        summary: e.target.value,
                      });
                    }
                  }}
                  placeholder="Describe your project in detail..."
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm min-h-[100px] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Funding (NOK)</label>
                  <input
                    type="number"
                    value={application?.funding_amount || ''}
                    onChange={(e) => {
                      if (application) {
                        updateApplicationMutation.mutate({
                          funding_amount: parseFloat(e.target.value) || 0,
                        });
                      }
                    }}
                    placeholder="Amount"
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Audience</label>
                  <input
                    value={application?.target_audience || ''}
                    onChange={(e) => {
                      if (application) {
                        updateApplicationMutation.mutate({
                          target_audience: e.target.value,
                        });
                      }
                    }}
                    placeholder="Who benefits?"
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Progress Section - MOVED BELOW APPLICATION DETAILS */}
        {localStorage.getItem('onboarding_started') &&
          !localStorage.getItem('ai_writer_welcome_completed') && (
          <div className="p-4">
            <Card className="swiss-card">
              <CardHeader>
                <CardTitle className="text-swiss-title text-lg">
                  Application Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-sm text-muted-foreground">
                  Progress tracking for mobile will be implemented here
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generate Draft Section - MOVED BELOW APPLICATION PROGRESS */}
        {!sections.introduction && !generateDraftMutation.isPending && (
          <div className="p-4">
            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle className="text-center">
                  Generate Your Grant Application Draft
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground text-sm">
                  Create an AI-powered first draft based on your project
                  information.
                </p>

                <Button
                  onClick={() => generateDraftMutation.mutate()}
                  disabled={generateDraftMutation.isPending}
                  className="w-full h-12"
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
          </div>
        )}


        {/* Main Content */}
        <div className="p-4 space-y-4">
          <SwipeableSection
            sectionKey={activeSection}
            sectionLabel={
              sectionLabels[activeSection as keyof typeof sectionLabels]
            }
            content={sections[activeSection as keyof GrantSection]}
            isActive={true}
            isRegenerating={regenerateSectionMutation.isPending}
            onContentChange={(value) =>
              handleSectionChange(activeSection as keyof GrantSection, value)
            }
            onEdit={() => setShowTextEditor(true)}
            onPreview={() => setShowPreview(true)}
            onSwipeLeft={() => handleSectionNavigation('prev')}
            onSwipeRight={() => handleSectionNavigation('next')}
          />
        </div>

        {/* Mobile Navigation Bar */}
        <MobileNavigationBar
          activeSection={activeSection}
          sections={sections}
          onSectionChange={setActiveSection}
          onGenerateNew={() => generateDraftMutation.mutate()}
          onOpenTools={() => setShowToolsDrawer(true)}
        />

        {/* Mobile Drawers */}
        <MobileToolsDrawer
          open={showToolsDrawer}
          onOpenChange={setShowToolsDrawer}
          activeSection={activeSection}
          isRegenerating={regenerateSectionMutation.isPending}
          selectedProvider={selectedAIProvider}
          selectedModel={selectedModel}
          onProviderChange={setSelectedAIProvider}
          onModelChange={setSelectedModel}
          onRegenerate={handleRegenerateSection}
          onImproveWriting={handleImproveWriting}
        />

        <MobileTextEditor
          open={showTextEditor}
          onOpenChange={setShowTextEditor}
          value={sections[activeSection as keyof GrantSection]}
          onChange={(value) =>
            handleSectionChange(activeSection as keyof GrantSection, value)
          }
          sectionKey={activeSection}
          sectionLabel={
            sectionLabels[activeSection as keyof typeof sectionLabels]
          }
          isRegenerating={regenerateSectionMutation.isPending}
          selectedProvider={selectedAIProvider}
          selectedModel={selectedModel}
          onProviderChange={setSelectedAIProvider}
          onModelChange={setSelectedModel}
          onRegenerate={handleRegenerateSection}
          onImproveWriting={handleImproveWriting}
          placeholder={`Write your ${sectionLabels[
            activeSection as keyof typeof sectionLabels
          ].toLowerCase()} here...`}
        />

        <MobilePreview
          open={showPreview}
          onOpenChange={setShowPreview}
          sections={sections}
          sectionLabels={sectionLabels}
          projectName={application.project_name}
          organizationName={application.organizations?.name || 'Organization'}
          onDownloadPDF={downloadPDF}
          onShare={handleShare}
        />

        {/* Loading Overlay */}
        <LoadingOverlay
          isVisible={regenerateSectionMutation.isPending}
          title="Generating Content"
          description="AI is crafting your grant application section..."
          quote={currentQuote}
          variant="fullscreen"
        />

        {/* Welcome Overlay */}
        {application && (
          <AIWriterWelcome
            open={showWelcome}
            onOpenChange={setShowWelcome}
            projectName={application.project_name}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
