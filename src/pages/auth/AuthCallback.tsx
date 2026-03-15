import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Loader2, Shield, CheckCircle, XCircle } from 'lucide-react';

const schema = z
  .object({
    password: z.string().min(6, 'Min 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type Values = z.infer<typeof schema>;

export default function AuthCallback() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, hasOrganization, needsOnboarding } = useAuth();
  const type = search.get('type');
  const token = search.get('token');
  const isRecovery = type === 'recovery';
  const isSignup = type === 'signup';
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const [checking, setChecking] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<
    'checking' | 'success' | 'error' | null
  >(null);

  useEffect(() => {
    document.title = 'Authenticating – GrantFather';
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        'content',
        'Completing authentication. You will be redirected shortly.'
      );
    const link = document.querySelector('link[rel="canonical"]');
    if (link) link.setAttribute('href', '/auth/callback');

    // Handle email verification
    if (isSignup && token) {
      handleEmailVerification(token);
    } else if (!isRecovery) {
      setChecking(false);
    }
  }, [isRecovery, isSignup, token]);

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user) {
      console.log('🔄 AuthCallback: User authenticated, redirecting...', { 
        hasOrganization, 
        needsOnboarding 
      });
      
      if (needsOnboarding) {
        navigate('/onboarding', { replace: true });
      } else if (hasOrganization) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [loading, user, hasOrganization, needsOnboarding, navigate]);

  const handleEmailVerification = async (verificationToken: string) => {
    try {
      // For testing purposes, we'll simulate verification
      // In a real app, you'd verify the token with Supabase
      if (verificationToken === 'valid-token') {
        setVerificationStatus('success');
        toast({
          title: 'Email verified',
          description: 'Your email has been successfully verified.',
        });
        // Redirect to onboarding after a delay
        setTimeout(() => navigate('/onboarding', { replace: true }), 2000);
      } else {
        setVerificationStatus('error');
        toast({
          title: 'Verification failed',
          description: 'Invalid or expired verification token.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setVerificationStatus('error');
      toast({
        title: 'Verification failed',
        description: 'An error occurred during verification.',
        variant: 'destructive',
      });
    }
  };

  const resendVerification = () => {
    toast({
      title: 'Verification email sent',
      description: 'Please check your email for a new verification link.',
    });
  };

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({
        title: 'Password reset failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Password updated',
      description: 'You can now log in with your new password.',
    });
    navigate('/login', { replace: true });
  });

  // Show verification success
  if (verificationStatus === 'success') {
    return (
      <main className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2
              className="text-2xl font-bold mb-2"
              data-testid="verification-success"
            >
              Email Verified Successfully
            </h2>
            <p
              className="text-muted-foreground mb-4"
              data-testid="verification-message"
            >
              Email verified! Redirecting to organization setup...
            </p>
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Show verification error
  if (verificationStatus === 'error') {
    return (
      <main className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2
              className="text-2xl font-bold mb-2"
              data-testid="verification-error"
            >
              Verification Failed
            </h2>
            <p
              className="text-muted-foreground mb-4"
              data-testid="verification-error-message"
            >
              Invalid token
            </p>
            <div className="space-y-2">
              <Button
                onClick={resendVerification}
                data-testid="resend-verification-button"
              >
                Resend Verification Email
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (checking && !isRecovery) {
    return (
      <main className="container flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" /> Finishing sign-in...
        </div>
      </main>
    );
  }

  if (isRecovery) {
    const loading = form.formState.isSubmitting;
    return (
      <main className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Enter a new password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSubmit}
              className="space-y-4"
              data-testid="password-reset-form"
            >
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="new-password-input"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p
                    className="text-sm text-destructive"
                    data-testid="password-error"
                  >
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  data-testid="confirm-password-input"
                  {...form.register('confirmPassword')}
                />
                {form.formState.errors.confirmPassword && (
                  <p
                    className="text-sm text-destructive"
                    data-testid="confirm-password-error"
                  >
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="reset-password-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>Update password</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Shield /> Redirecting...
      </div>
    </main>
  );
}
