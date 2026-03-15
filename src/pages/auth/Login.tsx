import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, LogIn, Chrome } from 'lucide-react';
import PasswordResetDialog from '@/components/auth/PasswordResetDialog';
import { SEOHead } from '@/components/SEOHead';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    authChecked,
    hasOrganization,
    needsOnboarding,
    orgLoading,
  } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [serverError, setServerError] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Check for session expired message in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session') === 'expired') {
      setSessionExpired(true);
    }
  }, []);

  // Redirect authenticated users based on their status
  useEffect(() => {
    // Wait until auth is checked and organization fetch (if any) is done
    if (!authChecked || authLoading || !user || orgLoading) return;

    // User is authenticated, redirect based on organization status
    if (!hasOrganization) {
      navigate('/onboarding');
    } else if (needsOnboarding) {
      navigate('/onboarding');
    } else {
      navigate('/applications');
    }
  }, [
    user,
    authLoading,
    authChecked,
    orgLoading,
    hasOrganization,
    needsOnboarding,
    navigate,
  ]);

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setLoginError(null); // Clear previous errors
    setNetworkError(false);
    setServerError(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setLoginError(error.message);
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      // Success handled by AuthProvider and redirect useEffect
      toast({
        title: 'Welcome back',
        description: "You're now signed in.",
      });
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setNetworkError(true);
        toast({
          title: 'Network error',
          description: 'Please check your connection and try again.',
          variant: 'destructive',
        });
        return;
      }

      // Handle server errors
      setServerError(true);
      toast({
        title: 'Server error',
        description: 'Please try again later or contact support.',
        variant: 'destructive',
      });
    }
  });

  const googleSignIn = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error)
      toast({
        title: 'Google sign-in failed',
        description: error.message,
        variant: 'destructive',
      });
  };

  const loading = useMemo(
    () =>
      form.formState.isSubmitting ||
      (user && (!authChecked || authLoading || orgLoading)),
    [form.formState.isSubmitting, user, authChecked, authLoading, orgLoading]
  );

  // Don't render login form if user is authenticated and we're redirecting
  if (user && (!authChecked || authLoading || orgLoading)) {
    return (
      <main className="container flex min-h-[80vh] items-center justify-center py-12">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <SEOHead
        title="Log in"
        description="Log in to GrantFather to access AI grant writing and tracking tools for your organization."
        canonical="/login"
      />
      <main className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Log in to your GrantFather account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={onSubmit}
              className="space-y-4"
              data-testid="login-form"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.org"
                    className="pl-10"
                    data-testid="email-input"
                    {...form.register('email')}
                  />
                </div>
                {form.formState.errors.email && (
                  <p
                    className="text-sm text-destructive"
                    data-testid="email-error"
                  >
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10"
                    data-testid="password-input"
                    {...form.register('password')}
                  />
                </div>
                {form.formState.errors.password && (
                  <p
                    className="text-sm text-destructive"
                    data-testid="password-error"
                  >
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <PasswordResetDialog />
                <Link
                  to="/register"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Create account
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="login-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2" />
                    Log in
                  </>
                )}
              </Button>

              {loginError && (
                <div
                  className="text-sm text-destructive"
                  data-testid="login-error"
                >
                  <p data-testid="login-error-message">{loginError}</p>
                </div>
              )}

              {sessionExpired && (
                <div
                  className="text-sm text-destructive"
                  data-testid="session-expired-message"
                >
                  <p>Your session has expired. Please log in again.</p>
                </div>
              )}

              {networkError && (
                <div
                  className="text-sm text-destructive"
                  data-testid="network-error"
                >
                  <p>
                    Network error. Please check your connection and try again.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    data-testid="retry-button"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {serverError && (
                <div
                  className="text-sm text-destructive"
                  data-testid="server-error"
                >
                  <p>
                    Server error. Please try again later or contact support.
                  </p>
                  <Button
                    onClick={() => window.open('/help', '_blank')}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    data-testid="contact-support-button"
                  >
                    Contact Support
                  </Button>
                </div>
              )}
            </form>

            <div className="relative py-2 text-center text-sm text-muted-foreground">
              <span className="bg-background px-2 relative z-10">or</span>
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t" />
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={googleSignIn}>
              <Chrome className="mr-2" /> Continue with Google
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
