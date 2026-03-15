import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const lastUpdated = '15 March 2026';

  return (
    <>
      <SEOHead
        title="Privacy Policy – GrantFather"
        description="GrantFather privacy policy. Learn how we collect, use, and protect your personal data in accordance with GDPR."
        canonical="/privacy"
      />
      <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <span className="font-semibold">Privacy Policy</span>
        </div>
      </header>

      <main className="container max-w-3xl py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Who we are</h2>
          <p className="text-muted-foreground leading-relaxed">
            GrantFather ("we", "our", "us") is an AI-powered grant writing and management platform.
            We are the data controller for personal data you provide when using our service.
            You can contact us at <a href="mailto:support@grantfather.no" className="text-primary hover:underline">support@grantfather.no</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. What data we collect</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Account data:</strong> your name, email address, and password (stored as a secure hash).</li>
            <li><strong>Organization data:</strong> organization name, description, mission, contact details, and logo.</li>
            <li><strong>Grant application data:</strong> project descriptions, funding amounts, timelines, and AI-generated draft content you create or edit.</li>
            <li><strong>Usage data:</strong> pages visited, features used, and error logs for service improvement.</li>
            <li><strong>Communication data:</strong> support requests you send to us.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Why we process your data (legal basis)</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Contract performance (GDPR Art. 6(1)(b)):</strong> to provide the grant writing and management service you signed up for.</li>
            <li><strong>Legitimate interests (GDPR Art. 6(1)(f)):</strong> to improve the platform, prevent fraud, and ensure security.</li>
            <li><strong>Legal obligation (GDPR Art. 6(1)(c)):</strong> to comply with applicable laws.</li>
            <li><strong>Consent (GDPR Art. 6(1)(a)):</strong> for optional marketing communications — you can withdraw consent at any time.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. How we use AI providers</h2>
          <p className="text-muted-foreground leading-relaxed">
            When you use the AI grant writing feature, your application data (project name, summary,
            mission, etc.) is sent to the AI provider you select (OpenAI, Anthropic, or Google).
            Each provider processes this data under their own privacy policies. We do not send your
            data to AI providers without your explicit action (clicking "Generate"). Your content
            is not used to train AI models unless the provider's terms permit it independently of us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Data storage and security</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your data is stored in the European Union on Supabase infrastructure. We use row-level
            security policies to ensure your data is only accessible to authorized users in your
            organization. Data is encrypted in transit (TLS) and at rest.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Data retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your account and application data for as long as your account is active.
            If you delete your account, we will delete your personal data within 30 days, except
            where we are required to retain it for legal or compliance purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Your rights under GDPR</h2>
          <p className="text-muted-foreground">You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Access</strong> the personal data we hold about you.</li>
            <li><strong>Correct</strong> inaccurate personal data.</li>
            <li><strong>Erase</strong> your personal data (right to be forgotten).</li>
            <li><strong>Restrict</strong> or object to processing.</li>
            <li><strong>Data portability</strong> — receive your data in a machine-readable format.</li>
            <li><strong>Lodge a complaint</strong> with your national supervisory authority (in Norway: Datatilsynet, <a href="https://www.datatilsynet.no" className="text-primary hover:underline" target="_blank" rel="noreferrer">datatilsynet.no</a>).</li>
          </ul>
          <p className="text-muted-foreground">
            To exercise any of these rights, email us at <a href="mailto:support@grantfather.no" className="text-primary hover:underline">support@grantfather.no</a>.
            You can also delete your account directly in <Link to="/settings" className="text-primary hover:underline">Settings → Account</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Cookies and local storage</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use browser local storage to maintain your session and save UI preferences (such as
            sidebar state and expanded settings sections). We do not use third-party advertising
            cookies. Session tokens are managed by Supabase Auth and expire automatically.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Third-party services</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Supabase</strong> — database, authentication, and file storage (EU region).</li>
            <li><strong>OpenAI / Anthropic / Google</strong> — AI content generation (only when you trigger it).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Changes to this policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify registered users
            of material changes by email. Continued use of the service after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        <div className="border-t pt-8">
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at{' '}
            <a href="mailto:support@grantfather.no" className="text-primary hover:underline">
              support@grantfather.no
            </a>
            {' '}or read our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
