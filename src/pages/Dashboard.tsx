import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveOrganization } from '@/contexts/OrganizationContext';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  Users,
  HeadphonesIcon,
  ChevronDown,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { ApplicationSuggestions } from '@/components/applications/ApplicationSuggestions';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface GrantDraftSections {
  introduction?: string;
  need_statement?: string;
  project_plan?: string;
  budget?: string;
  outcomes?: string;
  conclusion?: string;
}

interface GrantApplication {
  id: string;
  project_name: string;
  summary: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  updated_at: string;
  created_at: string;
  funding_amount?: number;
  generated_draft?: GrantDraftSections;
  grant_id?: string;
  grants?: {
    title: string;
    organization: string;
  };
}

interface FAQItem {
  question: string;
  answer: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useActiveOrganization();
  const [projectName, setProjectName] = useState('');
  const [briefSummary, setBriefSummary] = useState('');
  const [fundingAmount, setFundingAmount] = useState('');

  // Fetch applications for dashboard overview
  const { data: applications, isLoading } = useQuery({
    queryKey: ['dashboard-applications', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('grant_applications')
        .select(
          `
          *,
          grants (
            title,
            organization
          )
        `
        )
        .eq('organization_id', organization.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return (data || []) as unknown as GrantApplication[];
    },
    enabled: !!organization?.id,
  });

  const draftApplications =
    applications?.filter((app) => app.status === 'draft').length || 0;

  const faqItems: FAQItem[] = [
    {
      question: 'How does AI help with grant writing?',
      answer:
        "Our AI analyzes successful grant applications and provides intelligent suggestions for structure, content, and language to improve your application's success rate.",
    },
    {
      question: 'What types of grants do you support?',
      answer:
        'We support various grant types including research grants, nonprofit funding, business grants, and educational scholarships from government and private foundations.',
    },
    {
      question: 'How long does it take to complete an application?',
      answer:
        'With our AI assistance, most applications can be completed in 2-4 hours, significantly faster than traditional grant writing which can take days or weeks.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes, we use enterprise-grade security with end-to-end encryption. Your data is stored securely and never shared with third parties.',
    },
  ];

  const handleStartApplication = () => {
    if (!projectName.trim()) return;

    // Navigate to applications page with pre-filled data
    navigate('/applications', {
      state: {
        projectName,
        briefSummary,
        fundingAmount,
      },
    });
  };

  return (
    <>
      <SEOHead
        title={`${
          organization?.name || 'Grant'
        } Applications – AI-Powered Grant Writing`}
        description="Get funding for your organization with AI assistance. Our intelligent system helps you write compelling grant applications that stand out."
        canonical="/dashboard"
      />

      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        {/* Hero Section */}
        <div className="container mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 min-h-[80vh]">
            {/* Left Content */}
            <div className="flex flex-col justify-center space-y-8">
              {/* Logo & Brand */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {organization?.logo_url ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20">
                      <img
                        src={organization.logo_url}
                        alt={`${organization.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Brain className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>AI-Powered Grant Writing</span>
                  </div>
                </div>
              </div>

              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                  brAInstorm Grant Applications
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Get funding for your organization with AI assistance. Our
                  intelligent system helps you write compelling grant
                  applications that stand out.
                </p>
              </div>

              {/* Continue Applications Button */}
              {draftApplications > 0 && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {draftApplications} application
                    {draftApplications > 1 ? 's' : ''} in progress
                  </div>
                  <Button
                    size="lg"
                    className="w-full max-w-md group"
                    onClick={() => navigate('/applications')}
                  >
                    <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                    Continue Applications
                  </Button>
                </div>
              )}

              {/* Why Choose GrantFather */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">
                  Why Choose GrantFather?
                </h2>

                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">AI-Powered Writing</h3>
                      <p className="text-sm text-muted-foreground">
                        Get intelligent suggestions and improvements based on
                        thousands of successful applications
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Team Collaboration</h3>
                      <p className="text-sm text-muted-foreground">
                        Work together with your team members in real-time
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HeadphonesIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Expert Support</h3>
                      <p className="text-sm text-muted-foreground">
                        Get help from our team of grant writing experts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Quick Start Form */}
            <div className="flex flex-col justify-center">
              <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Quick Start New Application</span>
                  </CardTitle>
                  <CardDescription>
                    Tell us about your project and we'll help you get started
                    with AI-powered grant writing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      placeholder="Enter your project name"
                      value={projectName}
                      maxLength={200}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brief-summary">Brief Summary</Label>
                    <Textarea
                      id="brief-summary"
                      placeholder="Describe your project in a few sentences"
                      value={briefSummary}
                      maxLength={500}
                      onChange={(e) => setBriefSummary(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="funding-amount">Funding Amount (NOK)</Label>
                    <Input
                      id="funding-amount"
                      placeholder="500000"
                      value={fundingAmount}
                      min={0}
                      max={999_999_999}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      type="number"
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleStartApplication}
                    disabled={!projectName.trim()}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Application
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Application Suggestions Section */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <ErrorBoundary fallback={null}>
              <ApplicationSuggestions />
            </ErrorBoundary>
          </div>
        </div>

        {/* Ongoing Applications Section */}
        {applications && applications.length > 0 && (
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Ongoing Applications</h2>
                <Button variant="ghost" asChild>
                  <a href="/applications">
                    View All <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              <ErrorBoundary>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {applications.slice(0, 6).map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                    />
                  ))}
                </div>
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="bg-muted/30 py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <Collapsible key={index}>
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-background p-4 text-left hover:bg-muted/50 transition-colors">
                      <span className="font-medium">{item.question}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4 pt-0">
                      <p className="text-muted-foreground">{item.answer}</p>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Support */}
        <div className="border-t bg-background/50 py-8">
          <div className="container mx-auto px-6 text-center">
            <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate('/help')}>
              <HeadphonesIcon className="w-4 h-4 mr-2" />
              Need Help? Contact Support
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
