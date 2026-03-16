import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import StepIndicator from '@/components/onboarding/StepIndicator';
import { ApplicationProgress } from '@/components/onboarding/ApplicationProgress';
import { Loader2, AlertCircle, RefreshCw, Upload, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type OrgInsert = Database['public']['Tables']['organizations']['Insert'];

const stepLabels = ['Basic Info', 'Event Types', 'Funding Needs', 'Languages'];

const basicInfoSchema = z.object({
  name: z.string().min(2, 'Organization name is required').max(100, 'Name must be 100 characters or fewer'),
  org_type: z.string().min(1, 'Organization type is required'),
  contact_name: z.string().min(2, 'Contact name is required'),
  contact_email: z.string().email('Please enter a valid email'),
  contact_phone: z.string().optional().or(z.literal('')),
  members_count: z.coerce.number().int().min(1, 'Must be at least 1').max(1_000_000, 'Value too large'),
  mission: z.string().max(1000, 'Mission must be 1000 characters or fewer').optional().or(z.literal('')),
  logo: z.any().optional(),
});

const eventTypesSchema = z.object({
  event_types: z.array(z.string()).min(1, 'Select at least one event type'),
});

const fundingNeedsSchema = z.object({
  funding_needs: z.array(z.string()).min(1, 'Select at least one funding need'),
});

const languagesSchema = z.object({
  preferred_languages: z
    .array(z.string())
    .min(1, 'Select at least one language'),
});

const fullSchema = basicInfoSchema
  .and(eventTypesSchema)
  .and(fundingNeedsSchema)
  .and(languagesSchema);

type FormValues = z.infer<typeof fullSchema>;

const ORG_TYPES = [
  'nonprofit',
  'community_group',
  'school',
  'sports_club',
  'sports',
  'cultural_organization',
  'religious_organization',
  'volunteer',
  'other',
];

const EVENT_TYPES = [
  { value: 'community', label: 'Community Events' },
  { value: 'education', label: 'Educational Programs' },
  { value: 'culture', label: 'Cultural Activities' },
  { value: 'sports', label: 'Sports & Recreation' },
  { value: 'environment', label: 'Environmental Projects' },
  { value: 'recreational', label: 'Recreational Events' },
];

const FUNDING_NEEDS = [
  { value: 'operational', label: 'Operational Costs' },
  { value: 'program', label: 'Program Development' },
  { value: 'capital', label: 'Capital Equipment' },
  { value: 'research', label: 'Research Projects' },
  { value: 'emergency', label: 'Emergency Funding' },
  { value: 'community_programs', label: 'Community Programs' },
];

const LANGUAGES = [
  { value: 'Norwegian', label: 'Norwegian' },
  { value: 'English', label: 'English' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Danish', label: 'Danish' },
];

const Onboarding: React.FC = () => {
  const STEP_STORAGE_KEY = 'onboarding_step';
  const [step, setStep] = React.useState<number>(() => {
    const saved = localStorage.getItem(STEP_STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return !isNaN(parsed) && parsed >= 1 && parsed <= 4 ? parsed : 1;
  });
  const totalSteps = 4;
  const navigate = useNavigate();

  // Persist step progress across page refreshes
  React.useEffect(() => {
    localStorage.setItem(STEP_STORAGE_KEY, String(step));
  }, [step]);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, refetchOrganization } = useAuth();
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  // Check if we're updating an existing organization
  const existingOrgId = searchParams.get('orgId');
  const isUpdating = Boolean(existingOrgId);

  // Fetch existing organization data if updating
  const { data: existingOrg, isLoading: loadingExistingOrg } = useQuery({
    queryKey: ['organization', existingOrgId],
    queryFn: async () => {
      if (!existingOrgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', existingOrgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(existingOrgId),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      name: '',
      org_type: '',
      members_count: 1,
      mission: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      event_types: [],
      funding_needs: [],
      preferred_languages: [],
    },
  });

  // Set contact email and name from user data if available
  React.useEffect(() => {
    if (user?.email) {
      form.setValue('contact_email', user.email);
    }

    // Pre-fill contact name from user metadata or derive from email
    if (user) {
      let contactName = '';

      // Try to get full name from user metadata
      if (user.user_metadata?.full_name) {
        contactName = user.user_metadata.full_name;
      } else if (
        user.user_metadata?.first_name ||
        user.user_metadata?.last_name
      ) {
        contactName = `${user.user_metadata.first_name || ''} ${
          user.user_metadata.last_name || ''
        }`.trim();
      } else if (user.email) {
        // Fallback: derive name from email (capitalize first part)
        const emailPart = user.email.split('@')[0];
        contactName = emailPart
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }

      if (contactName) {
        form.setValue('contact_name', contactName);
      }
    }
  }, [user, form]);

  // Populate form with existing organization data if updating
  React.useEffect(() => {
    if (existingOrg && isUpdating) {
      form.setValue('name', existingOrg.name || '');
      form.setValue('org_type', existingOrg.org_type || '');
      form.setValue('members_count', existingOrg.members_count || 1);
      form.setValue('mission', existingOrg.mission || '');
      form.setValue('contact_name', existingOrg.contact_name || '');
      form.setValue('contact_email', existingOrg.contact_email || '');
      form.setValue('contact_phone', existingOrg.contact_phone || '');
      form.setValue('event_types', existingOrg.event_types || []);
      form.setValue('funding_needs', existingOrg.funding_needs || []);
      form.setValue(
        'preferred_languages',
        existingOrg.preferred_languages || []
      );

      // Set logo preview if exists
      if (existingOrg.logo_url) {
        setLogoPreview(existingOrg.logo_url);
      }
    }
  }, [existingOrg, isUpdating, form]);

  const createOrganization = useMutation({
    mutationKey: ['create-organization'],
    mutationFn: async (values: FormValues) => {
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      let logoUrl = null;

      try {
        // Upload logo if provided
        if (logoFile) {
          const fileExt = logoFile.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from('organization-logos')
              .upload(fileName, logoFile);

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from('organization-logos')
            .getPublicUrl(fileName);

          logoUrl = publicUrl;
        }

        const payload: OrgInsert = {
          name: values.name,
          org_type: values.org_type,
          members_count: values.members_count,
          mission: values.mission || null,
          contact_name: values.contact_name,
          contact_email: values.contact_email,
          contact_phone: values.contact_phone || null,
          event_types: values.event_types ?? [],
          funding_needs: values.funding_needs ?? [],
          preferred_languages: values.preferred_languages ?? [],
          created_by: user.id,
          onboarding_completed: true,
          logo_url: logoUrl,
        };

        let orgData;

        if (isUpdating && existingOrgId) {
          // Update existing organization
          const { data, error: updateError } = await supabase
            .from('organizations')
            .update(payload)
            .eq('id', existingOrgId)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          orgData = data;
        } else {
          // Create new organization
          const { data, error: insertError } = await supabase
            .from('organizations')
            .insert(payload)
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          orgData = data;

          // Create the user role entry for new organizations
          const rolePayload = {
            user_id: user.id,
            organization_id: orgData.id,
            role: 'admin' as const,
          };

          const { error: roleError } = await supabase
            .from('user_roles')
            .insert(rolePayload);

          if (roleError) {
            // Try to clean up the organization if role creation fails
            await supabase.from('organizations').delete().eq('id', orgData.id);
            throw new Error(`Failed to assign user role: ${roleError.message}`);
          }
        }

        if (!orgData) {
          throw new Error('Organization operation failed - no data returned');
        }

        return orgData;
      } catch (error) {
        // Log any unexpected errors
        await supabase.from('debug_logs').insert({
          user_id: user.id,
          level: 'error',
          source: 'onboarding',
          message: 'Unexpected error during organization creation',
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            values,
          },
        });
        throw error;
      }
    },
    onError: async (error: unknown) => {

      // Use enhanced error handling
      const { handleRLSError } = await import('@/utils/sessionUtils');
      const errorInfo = handleRLSError(error);

      // Log the enhanced error information
      if (user?.id) {
        await supabase.from('debug_logs').insert({
          user_id: user.id,
          level: 'error',
          source: 'onboarding',
          message: 'Organization creation failed with enhanced error handling',
          data: {
            user_message: errorInfo.userMessage,
            technical_message: errorInfo.technicalMessage,
            recovery_action: errorInfo.recoveryAction,
            original_error:
              error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      const errorMessage = errorInfo.userMessage || (error instanceof Error ? error.message : 'Unknown error occurred');
      toast({
        title: 'Error creating organization',
        description: errorMessage,
        variant: 'destructive',
      });
    },
    onSuccess: async (data) => {

      try {
        // Invalidate organization queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['organization', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['teamMembers'] });

        // Refetch organization data to ensure it's fresh
        await refetchOrganization();

        toast({
          title: isUpdating ? 'Organization updated' : 'Organization created',
          description: 'Your onboarding is complete.',
        });

        localStorage.removeItem(STEP_STORAGE_KEY);
        // Navigate to applications page
        navigate('/applications');
      } catch (error) {
        toast({
          title: 'Organization created but refresh failed',
          description: 'Please refresh the page to continue.',
          variant: 'destructive',
        });
      }
    },
  });

  const goNext = async () => {
    // Validate current step fields before moving on
    const fieldsByStep: Record<number, (keyof FormValues)[]> = {
      1: ['name', 'org_type', 'contact_name', 'contact_email', 'members_count'],
      2: ['event_types'],
      3: ['funding_needs'],
      4: ['preferred_languages'],
    };

    const fields = fieldsByStep[step];
    const valid = await form.trigger(fields as (keyof FormValues)[], {
      shouldFocus: true,
    });

    if (!valid) return;

    if (step < totalSteps) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const onSubmit = (values: FormValues) => {
    createOrganization.mutate(values);
  };

  const toggleInArray = (
    field: 'event_types' | 'funding_needs' | 'preferred_languages',
    value: string,
    checked: boolean
  ) => {
    const current = form.getValues(field) || [];
    const next = checked
      ? Array.from(new Set([...current, value]))
      : current.filter((v) => v !== value);
    form.setValue(field, next as string[], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a JPEG, PNG, WebP, GIF, or SVG image.' });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast({ title: 'File too large', description: 'Logo image must be under 5 MB.' });
      event.target.value = '';
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    form.setValue('logo', file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    form.setValue('logo', undefined);
  };

  // Show loading state when fetching existing organization data
  if (isUpdating && loadingExistingOrg) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen w-full bg-background">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <Card className="backdrop-blur md:backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border border-border/40 shadow-xl">
              <CardHeader>
                <CardTitle>Organization Onboarding</CardTitle>
                <CardDescription>Loading organization data...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Card className="backdrop-blur md:backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border border-border/40 shadow-xl">
            <CardHeader>
              <CardTitle>Organization Onboarding</CardTitle>
              <CardDescription>
                {isUpdating
                  ? 'Complete your organization setup.'
                  : 'Complete a few steps to set up your organization.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StepIndicator
                current={step}
                total={totalSteps}
                labels={stepLabels}
              />

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {step === 1 && (
                    <div
                      className={`grid gap-4 ${step === 1 ? 'active' : ''}`}
                      data-testid="step-1"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Acme Community Group"
                                maxLength={100}
                                data-testid="org-name-input"
                                aria-label="Organization name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage data-testid="org-name-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="org_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="org-type-select">
                                  <SelectValue placeholder="Select organization type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ORG_TYPES.map((type) => (
                                  <SelectItem
                                    key={type}
                                    value={type}
                                    data-value={type}
                                  >
                                    {type
                                      .replace('_', ' ')
                                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage data-testid="org-type-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary contact name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Jane Doe"
                                data-testid="contact-name-input"
                                aria-label="Primary contact name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage data-testid="contact-name-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contact_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary contact email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="jane@example.org"
                                data-testid="contact-email-input"
                                aria-label="Primary contact email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage data-testid="contact-email-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contact_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Primary contact phone (optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+47 123 45 678"
                                data-testid="contact-phone-input"
                                aria-label="Primary contact phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage data-testid="contact-phone-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="members_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Members count</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={1000000}
                                data-testid="members-count-input"
                                aria-label="Members count"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage data-testid="members-count-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mission"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mission (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Briefly describe your mission"
                                maxLength={1000}
                                data-testid="mission-textarea"
                                aria-label="Organization mission"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage data-testid="mission-error" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {step === 2 && (
                    <div
                      className={`grid gap-6 ${step === 2 ? 'active' : ''}`}
                      data-testid="step-2"
                    >
                      <div
                        className="space-y-2"
                        data-testid="event-types-section"
                      >
                        <FormLabel>Event types you're involved in</FormLabel>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {EVENT_TYPES.map((opt) => {
                            const selected = (
                              form.watch('event_types') || []
                            ).includes(opt.value);
                            return (
                              <label
                                key={opt.value}
                                className="flex items-center gap-3 rounded-md border p-3"
                                data-testid={`event-type-${opt.value}`}
                              >
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(c) =>
                                    toggleInArray(
                                      'event_types',
                                      opt.value,
                                      Boolean(c)
                                    )
                                  }
                                  data-testid={`event-type-${opt.value}`}
                                />
                                <span className="text-sm">{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage data-testid="event-types-error" />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div
                      className={`grid gap-6 ${step === 3 ? 'active' : ''}`}
                      data-testid="step-3"
                    >
                      <div
                        className="space-y-2"
                        data-testid="funding-needs-section"
                      >
                        <FormLabel>Funding needs</FormLabel>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {FUNDING_NEEDS.map((opt) => {
                            const selected = (
                              form.watch('funding_needs') || []
                            ).includes(opt.value);
                            return (
                              <label
                                key={opt.value}
                                className="flex items-center gap-3 rounded-md border p-3"
                                data-testid={`funding-need-${opt.value}`}
                              >
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(c) =>
                                    toggleInArray(
                                      'funding_needs',
                                      opt.value,
                                      Boolean(c)
                                    )
                                  }
                                  data-testid={`funding-need-${opt.value}`}
                                />
                                <span className="text-sm">{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage data-testid="funding-needs-error" />
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div
                      className={`grid gap-6 ${step === 4 ? 'active' : ''}`}
                      data-testid="step-4"
                    >
                      <div
                        className="space-y-2"
                        data-testid="ui-language-select"
                      >
                        <FormLabel>Preferred languages</FormLabel>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {LANGUAGES.map((opt) => {
                            const selected = (
                              form.watch('preferred_languages') || []
                            ).includes(opt.value);
                            return (
                              <label
                                key={opt.value}
                                className="flex items-center gap-3 rounded-md border p-3"
                                data-testid={`language-${opt.value}`}
                              >
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(c) =>
                                    toggleInArray(
                                      'preferred_languages',
                                      opt.value,
                                      Boolean(c)
                                    )
                                  }
                                  data-testid={`language-${opt.value}`}
                                />
                                <span className="text-sm">{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage data-testid="languages-error" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goBack}
                      disabled={step === 1 || createOrganization.isPending}
                      data-testid="previous-step-button"
                    >
                      Back
                    </Button>
                    {step < totalSteps ? (
                      <Button
                        type="button"
                        onClick={goNext}
                        disabled={createOrganization.isPending}
                        data-testid="next-step-button"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={createOrganization.isPending}
                        data-testid="create-organization-button"
                      >
                        {createOrganization.isPending ? (
                          <>
                            <Loader2
                              className="mr-2 h-4 w-4 animate-spin"
                              data-testid="creating-organization-loading"
                            />
                            Creating Organization...
                          </>
                        ) : (
                          'Create Organization'
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Onboarding;
