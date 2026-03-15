import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const schema = z.object({ email: z.string().email('Enter a valid email') });

type Values = z.infer<typeof schema>;

export default function PasswordResetDialog() {
  const { toast } = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });
  const [open, setOpen] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      toast({
        title: 'Reset failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setResetSent(true);
    toast({
      title: 'Check your email',
      description: 'We sent a password reset link.',
    });
    // Don't close dialog immediately to show success message
  });

  const loading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="px-0 text-sm"
          data-testid="forgot-password-link"
        >
          Forgot password?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            We'll send a reset link to your email.
          </DialogDescription>
        </DialogHeader>

        {resetSent ? (
          <div className="space-y-4">
            <p
              className="text-sm text-muted-foreground"
              data-testid="reset-sent-message"
            >
              Check your email for a password reset link. We've sent it to{' '}
              {form.getValues('email')}.
            </p>
            <Button onClick={() => setOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4"
            data-testid="forgot-password-form"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.org"
                data-testid="reset-email-input"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p
                  className="text-sm text-destructive"
                  data-testid="email-error"
                >
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                data-testid="send-reset-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>Send reset link</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
