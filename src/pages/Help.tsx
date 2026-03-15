import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/SEOHead';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  MessageCircle,
  Search,
  PenLine,
  FolderCheck,
  Users,
  Settings,
  ChevronRight,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';

const Help = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'normal',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priorityLabel = {
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      urgent: 'Urgent',
    }[formData.priority] ?? formData.priority;

    // Strip newlines to prevent email header injection
    const sanitize = (s: string) => s.replace(/[\r\n]/g, ' ').trim();

    const body = encodeURIComponent(
      `Name: ${sanitize(formData.name)}\nEmail: ${sanitize(formData.email)}\nPriority: ${priorityLabel}\n\n${sanitize(formData.message)}`
    );
    const subject = encodeURIComponent(`[${priorityLabel}] ${sanitize(formData.subject)}`);
    window.location.href = `mailto:support@grantfather.no?subject=${subject}&body=${body}`;

    toast.success(
      "Opening your email client with the support request pre-filled."
    );
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      priority: 'normal',
    });
  };

  const guides = [
    {
      title: 'Getting Started with GrantFather',
      description: 'Complete onboarding guide for new users',
      icon: BookOpen,
      category: 'Onboarding',
      steps: [
        'Create your GrantFather account and verify your email',
        'Complete your organization profile with mission and focus areas',
        'Set up your workspace preferences and notification settings',
        'Explore the dashboard and familiarize yourself with the interface',
        'Take the interactive tour to learn key features',
      ],
    },
    {
      title: 'Using the AI Grant Writer',
      description: 'Master the AI-powered application drafting',
      icon: PenLine,
      category: 'Grant Writing',
      steps: [
        'Select a grant opportunity from your search results',
        'Review the grant requirements and eligibility criteria',
        'Choose your AI provider (OpenAI, Anthropic, or local model)',
        'Input your organization details and project information',
        'Let AI generate your initial draft application',
        'Review, edit, and refine the generated content',
        'Export your application as PDF or Word document',
      ],
    },
    {
      title: 'Managing Applications',
      description: 'Track and organize your grant applications',
      icon: FolderCheck,
      category: 'Application Management',
      steps: [
        'View all applications in your Applications dashboard',
        'Update application status as you progress',
        'Set deadlines and receive automated reminders',
        'Upload supporting documents and attachments',
        'Track communication history with funders',
        'Generate reports on application success rates',
      ],
    },
    {
      title: 'Team Collaboration',
      description: 'Work together on grant applications',
      icon: Users,
      category: 'Collaboration',
      steps: [
        'Invite team members to your organization workspace',
        'Assign roles and permissions for different users',
        'Share draft applications for review and feedback',
        'Use comments and suggestions for collaborative editing',
        'Track changes and version history',
        'Set up approval workflows for application submissions',
      ],
    },
  ];

  const faqs = [
    {
      question: 'What types of grants can I find on GrantFather?',
      answer:
        'GrantFather focuses primarily on Norwegian and Nordic grant opportunities for volunteer organizations, including funding from foundations, government agencies, and international donors. We cover areas like community development, education, environment, culture, and social services.',
    },
    {
      question: 'How does the AI grant writer work?',
      answer:
        "Our AI analyzes grant requirements and your organization profile to generate tailored application drafts. It uses advanced language models to ensure your applications match the funder's criteria, tone, and requirements while highlighting your organization's strengths.",
    },
    {
      question: 'Is my organization data secure?',
      answer:
        'Yes, we take data security seriously. All data is encrypted in transit and at rest. We never share your organization information with third parties, and you maintain full control over your data. You can export or delete your data at any time.',
    },
    {
      question: 'Can I use GrantFather for free?',
      answer:
        'Yes! Our Starter plan is completely free and includes access to grant discovery, basic AI writing assistance, and one active project. For growing organizations, our Pro plan offers advanced features and unlimited projects.',
    },
    {
      question: 'What AI providers does GrantFather support?',
      answer:
        'We support multiple AI providers including OpenAI (GPT-4), Anthropic (Claude), and local models. You can choose your preferred provider based on your needs and budget. Each provider has different strengths for various types of writing tasks.',
    },
    {
      question: 'How accurate is the grant discovery feature?',
      answer:
        "Our grant discovery uses automated web scraping and AI to find relevant opportunities. While we strive for accuracy, we recommend always verifying grant details on the original funder's website before applying. We continuously improve our algorithms based on user feedback.",
    },
    {
      question: 'Can I collaborate with my team on applications?',
      answer:
        'Yes! Pro plan users can invite team members, assign roles, share drafts for review, and collaborate in real-time. This makes it easy for larger organizations to involve multiple stakeholders in the grant writing process.',
    },
    {
      question: 'How long does it take to draft an application?',
      answer:
        "With GrantFather's AI assistance, you can generate a complete first draft in minutes. However, we recommend spending additional time reviewing, customizing, and perfining the content to ensure it perfectly represents your organization and project.",
    },
    {
      question: 'Do you provide customer support?',
      answer:
        'Yes! We offer email support to all users, with response times of 24-48 hours. Pro plan users get priority support with faster response times. We also have extensive documentation and video tutorials available.',
    },
    {
      question: 'Can I export my applications?',
      answer:
        'Absolutely! You can export your applications in multiple formats including PDF, Word document, and plain text. This makes it easy to submit applications through different portals or share them with stakeholders.',
    },
  ];

  return (
    <>
      <SEOHead
        title="Help Center - GrantFather Documentation & Support"
        description="Get help with GrantFather's global grant writing platform. Find step-by-step guides, FAQs, and contact our support team for assistance with grant writing and application management. Specialized support for Norwegian and Nordic funding opportunities."
        canonical="/help"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-xl font-semibold">Help Center</h1>
            </div>
            <Button variant="outline" onClick={() => navigate('/grants')}>
              Go to Grants
            </Button>
          </div>
        </header>

        <div className="container py-8">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <div className="glass mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-4 text-4xl font-bold tracking-tight">
              How can we help you?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Find step-by-step guides, answers to common questions, and get
              support for using GrantFather effectively.
            </p>
          </div>

          {/* Two-column layout for desktop, stacked for mobile */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column - Guides and FAQ */}
            <div className="space-y-8">
              {/* Step-by-step Guides */}
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-semibold">
                    Step-by-Step Guides
                  </h3>
                </div>

                <div className="grid gap-4">
                  {guides.map((guide, index) => (
                    <Card
                      key={index}
                      className="glass border-border/50 transition-all hover:scale-[1.02] hover:shadow-lg"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <guide.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {guide.title}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {guide.description}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {guide.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible>
                          <AccordionItem
                            value={`guide-${index}`}
                            className="border-none"
                          >
                            <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                              View detailed steps
                              <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" />
                            </AccordionTrigger>
                            <AccordionContent>
                              <ol className="space-y-2 text-sm text-muted-foreground">
                                {guide.steps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex gap-3">
                                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                      {stepIndex + 1}
                                    </span>
                                    <span className="pt-0.5">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* FAQ Section */}
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-semibold">
                    Frequently Asked Questions
                  </h3>
                </div>

                <Card className="glass border-border/50">
                  <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full">
                      {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`faq-${index}`}>
                          <AccordionTrigger className="text-left hover:no-underline">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Right Column - Contact Support */}
            <div className="space-y-8">
              {/* Contact Support Form */}
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-semibold">Contact Support</h3>
                </div>

                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle>Get in Touch</CardTitle>
                    <CardDescription>
                      Can't find what you're looking for? Our support team is
                      here to help.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            maxLength={100}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            maxLength={254}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          maxLength={200}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              subject: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <select
                          id="priority"
                          value={formData.priority}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              priority: e.target.value,
                            }))
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="low">Low Priority</option>
                          <option value="normal">Normal Priority</option>
                          <option value="high">High Priority</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          rows={6}
                          value={formData.message}
                          maxLength={2000}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          placeholder="Please describe your question or issue in detail..."
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full">
                        Send Support Request
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </section>

              {/* Support Information */}
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <Settings className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-semibold">
                    Support Information
                  </h3>
                </div>

                <div className="space-y-4">
                  <Card className="glass border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Response Times</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Free Plan:
                          </span>
                          <span>24-48 hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Pro Plan:
                          </span>
                          <span>4-12 hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Urgent Issues:
                          </span>
                          <span>2-4 hours</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Mail className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Alternative Contact</h4>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>support@grantfather.no</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>+47 123 45 678</span>
                        </div>
                        <p className="text-muted-foreground">
                          For immediate assistance with urgent technical issues.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass border-border/50 border-primary/20">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h4 className="font-semibold mb-2">
                          Need Faster Support?
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Upgrade to Pro for priority support and faster
                          response times.
                        </p>
                        <Button variant="outline" onClick={() => navigate('/settings')}>
                          Upgrade to Pro
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Help;
