import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, UserPlus, User } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

const schema = z
  .object({
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email required'),
    password: z
      .string()
      .min(6, 'Min 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    confirmPassword: z.string().min(6, 'Confirm your password'),
    agree: z
      .boolean()
      .refine((v) => v, { message: 'You must agree to the terms' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agree: false,
    },
  });

  const onSubmit = form.handleSubmit(async ({ full_name, email, password }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name,
        },
      },
    });

    if (error) {
      // Check if it's a duplicate email error
      if (
        error.message.includes('already registered') ||
        error.message.includes('already exists')
      ) {
        form.setError('email', {
          type: 'manual',
          message: 'An account with this email already exists',
        });
        return;
      }

      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: 'Account created successfully',
      description: 'You can now log in and complete organization setup.',
    });
  });

  const loading = useMemo(
    () => form.formState.isSubmitting,
    [form.formState.isSubmitting]
  );

  return (
    <>
      <SEOHead
        title="Create Account"
        description="Create a GrantFather account and start writing AI-powered grant applications for your organization."
        canonical="/register"
      />
      <main className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Start using GrantFather - organization setup comes next
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4" data-testid="registration-success">
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="check-email-message"
                >
                  Account created successfully! You can now log in to your new
                  account.
                </p>
                <Link
                  to="/login"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Continue to login
                </Link>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                className="space-y-4"
                data-testid="registration-form"
              >
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                    <Input
                      id="full_name"
                      className="pl-10"
                      placeholder="e.g. Jane Doe"
                      data-testid="full-name-input"
                      {...form.register('full_name')}
                    />
                  </div>
                  {form.formState.errors.full_name && (
                    <p
                      className="text-sm text-destructive"
                      data-testid="full-name-error"
                    >
                      {form.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      placeholder="you@example.org"
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
                  {form.formState.errors.email &&
                    form.formState.errors.email.message?.includes(
                      'already exists'
                    ) && (
                      <p
                        className="text-sm text-destructive"
                        data-testid="email-exists-error"
                      >
                        {form.formState.errors.email.message}
                      </p>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        className="pl-10"
                        data-testid="confirm-password-input"
                        {...form.register('confirmPassword')}
                      />
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <p
                        className="text-sm text-destructive"
                        data-testid="confirm-password-error"
                      >
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agree"
                    checked={form.watch('agree')}
                    onCheckedChange={(v) => form.setValue('agree', Boolean(v))}
                    data-testid="agree-checkbox"
                  />
                  <Label
                    htmlFor="agree"
                    className="cursor-pointer select-none text-sm text-muted-foreground"
                  >
                    I agree to the{' '}
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      to="/terms"
                      target="_blank"
                    >
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      to="/privacy"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {form.formState.errors.agree && (
                  <p
                    className="text-sm text-destructive"
                    data-testid="agree-error"
                  >
                    {form.formState.errors.agree.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="register-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2" />
                      Create account
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
