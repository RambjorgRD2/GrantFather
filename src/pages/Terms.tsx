import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  const lastUpdated = '15 March 2026';

  return (
    <>
      <SEOHead
        title="Terms of Service – GrantFather"
        description="GrantFather terms of service. Read the terms and conditions governing your use of the GrantFather platform."
        canonical="/terms"
      />
      <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <span className="font-semibold">Terms of Service</span>
        </div>
      </header>

      <main className="container max-w-3xl py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance</h2>
          <p className="text-muted-foreground leading-relaxed">
            By creating an account or using GrantFather ("Service"), you agree to these Terms of
            Service. If you do not agree, do not use the Service. These terms form a binding
            agreement between you and GrantFather.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Description of service</h2>
          <p className="text-muted-foreground leading-relaxed">
            GrantFather is an AI-powered platform that helps organizations discover grant
            opportunities, draft grant applications, and manage submissions. The Service uses
            third-party AI providers (OpenAI, Anthropic, Google) to generate content based on
            information you provide.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Account responsibilities</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>You must be at least 18 years old or have parental consent to use the Service.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must provide accurate information when creating your account and organization profile.</li>
            <li>You may not share your account with others or create accounts for the purpose of circumventing usage limits.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Acceptable use</h2>
          <p className="text-muted-foreground">You agree not to:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Use the Service to generate false, misleading, or fraudulent grant applications.</li>
            <li>Submit applications to grant-makers that misrepresent your organization or project.</li>
            <li>Attempt to circumvent or abuse the AI generation system (e.g., prompt injection attacks).</li>
            <li>Reverse engineer, scrape, or extract data from the Service beyond normal use.</li>
            <li>Use the Service in any way that violates applicable law or regulation.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. AI-generated content</h2>
          <p className="text-muted-foreground leading-relaxed">
            The AI grant writing feature generates content based on the information you provide.
            You are solely responsible for reviewing, editing, and verifying all AI-generated
            content before submitting it to any grant-maker. GrantFather does not guarantee the
            accuracy, quality, or suitability of AI-generated content, and we accept no liability
            for the outcome of grant applications. Always verify grant requirements with the
            funding organization directly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Intellectual property</h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain ownership of the content you create using the Service, including your
            organization data, project descriptions, and grant applications. By using the Service,
            you grant GrantFather a limited license to store and process your content solely to
            provide the Service. GrantFather retains ownership of the platform, software, and
            underlying technology.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Subscription and billing</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Starter plan is free. Pro plan pricing is displayed on the{' '}
            <Link to="/#pricing" className="text-primary hover:underline">pricing page</Link>.
            Subscription fees are charged in advance on a monthly basis. You may cancel at any
            time; your access continues until the end of the current billing period. Refunds are
            not provided for partial periods unless required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Limitation of liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, GrantFather shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of the
            Service, including failed grant applications, lost data, or service interruptions.
            Our total liability to you shall not exceed the fees you paid in the 12 months
            preceding the claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may delete your account at any time in{' '}
            <Link to="/settings" className="text-primary hover:underline">Settings → Account</Link>.
            We reserve the right to suspend or terminate accounts that violate these Terms, with
            or without notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Governing law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms are governed by Norwegian law. Any disputes shall be resolved in the
            courts of Oslo, Norway, unless mandatory consumer protection laws in your country
            of residence provide otherwise.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Changes to these terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. We will notify you of material changes
            by email at least 14 days before they take effect. Continued use of the Service
            after changes take effect constitutes acceptance.
          </p>
        </section>

        <div className="border-t pt-8">
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at{' '}
            <a href="mailto:support@grantfather.no" className="text-primary hover:underline">
              support@grantfather.no
            </a>
            {' '}or read our{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
