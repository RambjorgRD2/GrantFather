import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Rocket,
  Users,
  HeadphonesIcon,
  Loader2,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface QuickStartFormData {
  projectName: string;
  summary: string;
  fundingAmount: string;
}

export function ApplicationLandingContent() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<QuickStartFormData>({
    projectName: '',
    summary: '',
    fundingAmount: '',
  });

  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  // Check if user has existing applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['user-applications'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('grant_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
  });

  // Create new application mutation
  const createApplicationMutation = useMutation({
    mutationFn: async (formData: QuickStartFormData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('grant_applications')
        .insert([
          {
            user_id: user.id,
            organization_id: organization?.id,
            project_name: formData.projectName,
            summary: formData.summary,
            funding_amount: parseFloat(formData.fundingAmount) || 0,
            status: 'draft',
            expected_impact: 'To be defined during application development',
            target_audience: 'To be defined during application development',
            timeline_start: new Date().toISOString().split('T')[0],
            timeline_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-applications'] });
      toast({
        title: 'Application created!',
        description: 'Your grant application has been created successfully.',
      });
      navigate(`/apply/draft/${data.id}`);
    },
    onError: (error) => {
      console.error('Error creating application:', error);
      toast({
        title: 'Error creating application',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectName.trim()) {
      toast({
        title: 'Project name required',
        description: 'Please enter a project name.',
        variant: 'destructive',
      });
      return;
    }
    createApplicationMutation.mutate(formData);
  };

  const handleInputChange = (
    field: keyof QuickStartFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const faqItems = [
    {
      question: 'How does AI help with grant writing?',
      answer:
        'Our AI analyzes thousands of successful grant applications to provide personalized suggestions, improve your writing, and increase your chances of success.',
    },
    {
      question: 'What types of grants do you support?',
      answer:
        'We support a wide range of grants including research grants, business development grants, educational grants, and more. Our system adapts to your specific needs.',
    },
    {
      question: 'How long does it take to complete an application?',
      answer:
        'With AI assistance, most applications can be completed in 2-4 hours. The time varies depending on the complexity and requirements of the grant.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes, we use enterprise-grade security and encryption. Your data is never shared with third parties and is protected by strict privacy policies.',
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              Loading your applications...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {isMobile ? (
        // Mobile: Stacked layout
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            {organization?.logo_url && (
              <div className="flex justify-center">
                <img
                  src={organization.logo_url}
                  alt={`${organization.name} logo`}
                  className="h-16 w-16 rounded-full object-cover border-2 border-border"
                />
              </div>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              AI-Powered Grant Writing
            </div>
            <h1 className="text-3xl font-bold">
              {organization?.name ? `${organization.name} Grant Applications` : 'Start Your Grant Application'}
            </h1>
            <p className="text-muted-foreground">
              Get funding for your organization with AI assistance
            </p>
          </div>

          {/* Existing Applications Button */}
          {applications.length > 0 && (
            <Card className="glass">
              <CardContent className="p-6 text-center">
                <div className="space-y-4">
                  <Badge variant="secondary" className="text-xs">
                    {applications.length} application
                    {applications.length !== 1 ? 's' : ''} in progress
                  </Badge>
                  <Button
                    onClick={() => navigate('/applications')}
                    className="w-full"
                    size="lg"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue Applications
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Start Form */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Quick Start New Application
              </CardTitle>
              <CardDescription>
                Tell us about your project and we'll help you get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    value={formData.projectName}
                    onChange={(e) =>
                      handleInputChange('projectName', e.target.value)
                    }
                    placeholder="Enter your project name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Brief Summary</label>
                  <Textarea
                    value={formData.summary}
                    onChange={(e) =>
                      handleInputChange('summary', e.target.value)
                    }
                    placeholder="Describe your project in a few sentences"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Funding Amount (NOK)
                  </label>
                  <Input
                    type="number"
                    value={formData.fundingAmount}
                    onChange={(e) =>
                      handleInputChange('fundingAmount', e.target.value)
                    }
                    placeholder="500000"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={createApplicationMutation.isPending}
                >
                  {createApplicationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Start Application
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">
              Why Choose GrantFather?
            </h2>
            <div className="grid gap-4">
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">AI-Powered Writing</h3>
                      <p className="text-sm text-muted-foreground">
                        Get intelligent suggestions and improvements
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">Team Collaboration</h3>
                      <p className="text-sm text-muted-foreground">
                        Work together with your team members
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <HeadphonesIcon className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">Expert Support</h3>
                      <p className="text-sm text-muted-foreground">
                        Get help when you need it most
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {faqItems.map((item, index) => (
                <Collapsible
                  key={index}
                  open={openFAQ === index.toString()}
                  onOpenChange={() =>
                    setOpenFAQ(
                      openFAQ === index.toString() ? null : index.toString()
                    )
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto"
                    >
                      <span className="text-left">{item.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openFAQ === index.toString() ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">
                      {item.answer}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Help Button */}
          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/help')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Need Help?
            </Button>
          </div>
        </div>
      ) : (
        // Desktop: Side-by-side layout
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
              {organization?.logo_url && (
                <div className="flex justify-start">
                  <img
                    src={organization.logo_url}
                    alt={`${organization.name} logo`}
                    className="h-20 w-20 rounded-full object-cover border-2 border-border"
                  />
                </div>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI-Powered Grant Writing
              </div>
              <h1 className="text-4xl font-bold">
                {organization?.name ? `${organization.name} Grant Applications` : 'Start Your Grant Application'}
              </h1>
              <p className="text-lg text-muted-foreground">
                Get funding for your organization with AI assistance. Our
                intelligent system helps you write compelling grant applications
                that stand out.
              </p>
            </div>

            {/* Existing Applications */}
            {applications.length > 0 && (
              <Card className="glass">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Badge variant="secondary">
                      {applications.length} application
                      {applications.length !== 1 ? 's' : ''} in progress
                    </Badge>
                    <Button
                      onClick={() => navigate('/applications')}
                      size="lg"
                      className="w-full"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Continue Applications
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                Why Choose GrantFather?
              </h2>
              <div className="grid gap-4">
                <Card className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">AI-Powered Writing</h3>
                        <p className="text-sm text-muted-foreground">
                          Get intelligent suggestions and improvements based on
                          thousands of successful applications
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">Team Collaboration</h3>
                        <p className="text-sm text-muted-foreground">
                          Work together with your team members in real-time
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <HeadphonesIcon className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">Expert Support</h3>
                        <p className="text-sm text-muted-foreground">
                          Get help from our team of grant writing experts
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Start Form */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Start New Application
                </CardTitle>
                <CardDescription>
                  Tell us about your project and we'll help you get started with
                  AI-powered grant writing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Project Name</label>
                    <Input
                      value={formData.projectName}
                      onChange={(e) =>
                        handleInputChange('projectName', e.target.value)
                      }
                      placeholder="Enter your project name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Brief Summary</label>
                    <Textarea
                      value={formData.summary}
                      onChange={(e) =>
                        handleInputChange('summary', e.target.value)
                      }
                      placeholder="Describe your project in a few sentences"
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Funding Amount (NOK)
                    </label>
                    <Input
                      type="number"
                      value={formData.fundingAmount}
                      onChange={(e) =>
                        handleInputChange('fundingAmount', e.target.value)
                      }
                      placeholder="500000"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={createApplicationMutation.isPending}
                  >
                    {createApplicationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Start Application
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {faqItems.map((item, index) => (
                    <Collapsible
                      key={index}
                      open={openFAQ === index.toString()}
                      onOpenChange={() =>
                        setOpenFAQ(
                          openFAQ === index.toString() ? null : index.toString()
                        )
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 h-auto"
                        >
                          <span className="text-left text-sm">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              openFAQ === index.toString() ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        <p className="text-sm text-muted-foreground">
                          {item.answer}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Help Button */}
            <div className="text-center">
              <Button variant="outline" onClick={() => navigate('/help')}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Need Help? Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
