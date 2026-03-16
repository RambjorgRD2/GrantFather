import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Search,
  PenLine,
  FolderCheck,
  Globe2,
  ArrowRight,
  CheckCircle2,
  User,
  Building2,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Link } from 'react-router-dom';
import { useHeroImage } from '@/hooks/useLandingPageAssets';

const Index = () => {
  const { user, loading, hasOrganization, needsOnboarding } = useAuth();
  const { heroImage } = useHeroImage();

  // Show loading while authentication is being determined
  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        data-testid="auth-loading"
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GrantFather',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'GrantFather helps organizations worldwide discover grants, draft winning applications with AI, and track submissions in one place. Specialized expertise in Norwegian and Nordic funding opportunities.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'NOK',
    },
  };

  return (
    <>
      <SEOHead
        title="GrantFather – Global AI grant writing platform"
        description="GrantFather helps organizations worldwide discover grants, draft winning applications with AI, and track submissions in one place. Specialized expertise in Norwegian and Nordic funding opportunities."
        canonical="/"
        jsonLd={structuredData}
      />
      <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight text-foreground">
            GrantFather
          </Link>
          <div className="hidden gap-6 text-sm md:flex">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground"
            >
              Pricing
            </a>
            <Link
              to="/help"
              className="text-muted-foreground hover:text-foreground"
            >
              Help
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Button
                  variant="ghost"
                  className="hidden md:inline-flex"
                  asChild
                >
                  <Link to="/dashboard">
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                {!hasOrganization || needsOnboarding ? (
                  <Button asChild>
                    <Link to="/onboarding">
                      <Building2 className="mr-2 h-4 w-4" />
                      Complete Setup
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-1" />
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">
                    Get started
                    <ArrowRight className="ml-1" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background to-muted/40" />
          <div className="container flex flex-col items-center gap-8 py-16 text-center md:py-24">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
              Built for organizations worldwide
            </span>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
              AI-powered grant writing that wins funding
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Discover global grant opportunities, draft winning applications
              with AI, and manage submissions in one simple, privacy-conscious
              workspace. Specialized expertise in Norwegian and Nordic funding
              markets.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {user ? (
                <>
                  {!hasOrganization || needsOnboarding ? (
                    <Button size="lg" asChild>
                      <Link to="/onboarding">
                        <Building2 className="mr-2 h-4 w-4" />
                        Complete Organization Setup
                      </Link>
                    </Button>
                  ) : (
                    <Button size="lg" asChild>
                      <Link to="/dashboard">
                        <User className="mr-2 h-4 w-4" />
                        Go to Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button size="lg" variant="outline" asChild>
                    <a href="#features">Learn more</a>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link to="/register">
                      Start free
                      <ArrowRight className="ml-1" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#features">Learn more</a>
                  </Button>
                </>
              )}
            </div>
            <div className="glass mx-auto w-full max-w-5xl rounded-xl p-2">
              <img
                src={heroImage?.asset_url || '/hero-platform-preview.svg'}
                alt={
                  heroImage?.alt_text ||
                  'GrantFather AI-powered grant writing platform interface showing application drafting tools'
                }
                loading="lazy"
                className="h-auto w-full rounded-lg transition-opacity duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // silent fallback

                  // Try PNG fallback first, then placeholder
                  if (target.src.includes('/hero-platform-preview.svg')) {
                    target.src = '/hero-platform-preview.png';
                  } else if (target.src !== '/placeholder.svg') {
                    target.src = '/placeholder.svg';
                  }
                }}
                onLoad={() => {}}
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container space-y-8 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Everything you need to win more grants
            </h2>
            <p className="mt-2 text-muted-foreground">
              From discovery to submission—GrantFather streamlines the entire
              process for organizations worldwide.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <Search className="text-primary" />
                <CardTitle>Discover funds</CardTitle>
                <CardDescription>
                  Find global grant opportunities with specialized access to
                  Norwegian and Nordic funding markets.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <PenLine className="text-primary" />
                <CardTitle>Write with AI</CardTitle>
                <CardDescription>
                  Draft compelling applications that match each fund's criteria.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FolderCheck className="text-primary" />
                <CardTitle>Track progress</CardTitle>
                <CardDescription>
                  Stay on top of deadlines, statuses, and documentation.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Globe2 className="text-primary" />
                <CardTitle>Portal library</CardTitle>
                <CardDescription>
                  Centralize links, requirements, and templates for quick reuse.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Social proof — replace this section with real testimonials once early adopters are onboarded */}

        {/* Pricing */}
        <section id="pricing" className="container space-y-8 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Simple pricing
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start free and upgrade when you need to collaborate.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>
                  For small volunteer teams getting started.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-semibold">Free</div>
                <ul className="space-y-2 text-sm">
                  {[
                    'AI writing assistant (basic)',
                    'Grant portal discovery',
                    '1 active project',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/register">Get started</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>
                  For growing organizations applying regularly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-semibold">
                  NOK 249
                  <span className="text-base font-normal text-muted-foreground">
                    /mo
                  </span>
                </div>
                <ul className="space-y-2 text-sm">
                  {[
                    'Advanced AI drafting & tone control',
                    'Unlimited projects & templates',
                    'Collaboration & reviews',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/register">Try Pro</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 md:h-20 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GrantFather. All rights reserved.
          </p>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
};

export default Index;
