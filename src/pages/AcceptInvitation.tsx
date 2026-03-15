import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  User,
  Mail,
  Calendar,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'invalid'
  >('loading');
  const [orgName, setOrgName] = useState<string>('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    if (userLoading) return;

    if (!user) {
      // Redirect to login with return URL
      navigate(
        `/login?redirect=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`
      );
      return;
    }

    acceptInvitation();
  }, [token, user, userLoading]);

  const acceptInvitation = async () => {
    if (!token || !user) return;

    try {
      setStatus('loading');

      // First, check if the invitation is valid and get organization info
      const { data: invitationData, error: invitationError } = await supabase
        .from('organization_invitations')
        .select(
          `
          *,
          organizations:organization_id (
            name
          )
        `
        )
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('accepted_at', null)
        .single();

      if (invitationError || !invitationData) {
        setStatus('invalid');
        return;
      }

      const org = invitationData.organizations as any;
      setOrgName(org.name);

      // Call the database function to accept the invitation
      const { data: result, error } = await supabase.rpc(
        'accept_organization_invitation',
        {
          invitation_token: token,
        }
      );

      if (error) {
        throw error;
      }

      const resultData = result as { success: boolean; error?: string };

      if (!resultData.success) {
        throw new Error(resultData.error || 'Failed to accept invitation');
      }

      setStatus('success');
      toast({
        title: 'Invitation accepted',
        description: `You have successfully joined ${org.name}!`,
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      toast({
        title: 'Failed to accept invitation',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing Invitation
              </CardTitle>
              <CardDescription>
                We're adding you to the organization...
              </CardDescription>
            </CardHeader>
          </Card>
        );

      case 'success':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Welcome to {orgName}!
              </CardTitle>
              <CardDescription>
                You have successfully joined the organization. Redirecting you
                to the dashboard...
              </CardDescription>
            </CardHeader>
          </Card>
        );

      case 'error':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Failed to Accept Invitation
              </CardTitle>
              <CardDescription>
                There was an error processing your invitation. This could be
                because you're already a member of this organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        );

      case 'invalid':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Invalid Invitation
              </CardTitle>
              <CardDescription>
                This invitation link is invalid or has expired. Please contact
                the organization admin for a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SEOHead
        title="Accept Invitation – GrantFather"
        description="Join your organization on GrantFather to collaborate on grant applications."
        canonical="/accept-invitation"
      />
      <main className="container flex min-h-[80vh] items-center justify-center py-12">
        {renderContent()}
      </main>
    </>
  );
}
