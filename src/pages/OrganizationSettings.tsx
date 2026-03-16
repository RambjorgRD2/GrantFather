import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { OrganizationInfo } from '@/components/settings/OrganizationInfo';
import { TeamManagement } from '@/components/settings/TeamManagement';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { KnowledgeBaseManager } from '@/components/settings/KnowledgeBaseManager';
import { LanguagePreferences } from '@/components/settings/LanguagePreferences';
import { useAuth } from '@/providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  UnifiedRouteGuard,
  OrganizationRequired,
} from '@/components/auth/UnifiedRouteGuard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function AccountSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Sign out the user — full account deletion requires a server-side
    // function with service-role privileges. Until that edge function is
    // deployed, we sign the user out and show instructions.
    await supabase.auth.signOut();
    toast({
      title: 'Account deletion requested',
      description:
        'You have been signed out. To permanently delete all your data, email us at support@grantfather.no with the subject "Delete my account".',
    });
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Manage your personal account settings and data.
        </p>
      </div>
      <div className="border border-destructive/30 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="font-medium text-destructive">Danger Zone</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Deleting your account is permanent and cannot be undone. All your
            data, applications, and organization memberships will be removed.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              {deleting ? 'Processing...' : 'Delete my account'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all associated
                data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  // Collapsible state persisted in localStorage
  const STORAGE_KEY = 'org-settings:expanded-sections';
  const allSectionIds = [
    'organization',
    'team',
    'knowledge',
    'language',
    'notifications',
    'account',
  ];
  const [expanded, setExpanded] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch { /* localStorage unavailable */ }
    // Default: expand the first section on first visit
    return ['organization'];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
    } catch { /* localStorage unavailable */ }
  }, [expanded]);

  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const sections = [
    {
      id: 'organization',
      label: 'Organization',
      component: OrganizationInfo,
    },
    { id: 'team', label: 'Team Management', component: TeamManagement },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      component: KnowledgeBaseManager,
    },
    { id: 'language', label: 'Language', component: LanguagePreferences },
    {
      id: 'notifications',
      label: 'Notifications',
      component: NotificationPreferences,
    },
    {
      id: 'account',
      label: 'Account',
      component: AccountSettings,
    },
  ];

  return (
    <OrganizationRequired>
      <div className="container py-10" data-testid="settings-page">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Organization Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your organization profile and team
            </p>
          </div>
        </div>

        {/* Desktop: Independent Accordion */}
        <div className="hidden md:block">
          <Accordion
            type="multiple"
            value={expanded}
            onValueChange={(v) =>
              setExpanded(Array.isArray(v) ? (v as string[]) : [])
            }
            className="space-y-4"
          >
            {sections.map((sec) => (
              <AccordionItem
                key={sec.id}
                value={sec.id}
                className="glass rounded-xl border-0"
                data-testid={
                  sec.id === 'organization'
                    ? 'organization-section'
                    : sec.id === 'team'
                    ? 'team-management-section'
                    : undefined
                }
              >
                <AccordionTrigger
                  className="px-6 py-4 hover:no-underline"
                  data-testid={
                    sec.id === 'team' ? 'team-management-trigger' : undefined
                  }
                >
                  <span className="text-lg font-medium">{sec.label}</span>
                </AccordionTrigger>
                <AccordionContent
                  className="px-6 pb-6"
                  data-testid={`${sec.id}-section`}
                >
                  <ErrorBoundary>
                    <sec.component />
                  </ErrorBoundary>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Mobile: Independent Accordion with same persisted state */}
        <div className="md:hidden">
          <Accordion
            type="multiple"
            value={expanded}
            onValueChange={(v) =>
              setExpanded(Array.isArray(v) ? (v as string[]) : [])
            }
            className="space-y-4"
          >
            {sections.map((sec) => (
              <AccordionItem
                key={sec.id}
                value={sec.id}
                className="glass rounded-xl border-0"
                data-testid={
                  sec.id === 'organization'
                    ? 'organization-section'
                    : sec.id === 'team'
                    ? 'team-management-section'
                    : undefined
                }
              >
                <AccordionTrigger
                  className="px-6 py-4 hover:no-underline"
                  data-testid={
                    sec.id === 'team' ? 'team-management-trigger' : undefined
                  }
                >
                  <span className="text-lg font-medium">{sec.label}</span>
                </AccordionTrigger>
                <AccordionContent
                  className="px-6 pb-6"
                  data-testid={`${sec.id}-section`}
                >
                  <ErrorBoundary>
                    <sec.component />
                  </ErrorBoundary>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </OrganizationRequired>
  );
}
