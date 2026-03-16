import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, X, RefreshCw } from 'lucide-react';
import { PrimaryContactSelector } from './PrimaryContactSelector';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganization } from '@/hooks/useOrganization';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  members_count: z.coerce
    .number()
    .int()
    .min(0, 'Members count cannot be negative'),
  mission: z.string().optional(),
  contact_name: z.string().min(2, 'Contact name is required'),
  contact_email: z.string().email('Please enter a valid email'),
  contact_phone: z.string().optional(),
});

type OrganizationFormValues = z.infer<typeof organizationSchema> & {
  website?: string;
  address?: string;
};

// Mock refetch functions for missing dependencies  
const refetch = () => Promise.resolve();
const refetchOrganizations = () => Promise.resolve();

export function OrganizationInfo() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const {
    activeOrganization,
    organizations,
    hasMultipleOrganizations,
    selectOrganization,
    loading: orgContextLoading,
  } = useOrganizationContext();
  // Remove local organization hook to avoid conflicts with global context
  // const { organization, loading: isLoading, refetch } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [primaryContactUserId, setPrimaryContactUserId] = useState<
    string | null
  >(activeOrganization?.primary_contact_user_id || null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(activeOrganization?.id || null);

  // Deep-link: honor ?orgId for initial selection
  const location = useLocation();
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orgIdParam = params.get('orgId');
    if (orgIdParam && orgIdParam !== selectedOrganizationId) {
      setSelectedOrganizationId(orgIdParam);
      try {
        localStorage.setItem(
          'org-settings:expanded-sections',
          JSON.stringify(['organization'])
        );
        localStorage.setItem('org-settings:selected-org-id', orgIdParam);
      } catch { /* localStorage unavailable */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Initialize from localStorage if nothing selected yet
  React.useEffect(() => {
    if (!selectedOrganizationId) {
      try {
        const saved = localStorage.getItem('org-settings:selected-org-id');
        if (saved) setSelectedOrganizationId(saved);
      } catch { /* localStorage unavailable */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist selection changes
  React.useEffect(() => {
    if (selectedOrganizationId) {
      try {
        localStorage.setItem(
          'org-settings:selected-org-id',
          selectedOrganizationId
        );
      } catch { /* localStorage unavailable */ }
    }
  }, [selectedOrganizationId]);

  // Update selected organization when active organization changes
  React.useEffect(() => {
    // Always sync with the global active organization
    if (activeOrganization?.id) {
      setSelectedOrganizationId(activeOrganization.id);
    }
  }, [activeOrganization?.id]);

  // Use the global active organization, but allow local override for settings
  const localActiveOrganization = React.useMemo(() => {
    if (selectedOrganizationId && organizations?.length) {
      const found = organizations.find(
        (o) => o.organization.id === selectedOrganizationId
      );
      return found?.organization || activeOrganization;
    }
    return activeOrganization;
  }, [selectedOrganizationId, organizations, activeOrganization]);

  // Simple logo URL state - no complex resolution needed
  const [logoUrl, setLogoUrl] = React.useState<string | null>(
    localActiveOrganization?.logo_url || null
  );

  React.useEffect(() => {
    setLogoUrl(localActiveOrganization?.logo_url || null);
  }, [localActiveOrganization?.logo_url, localActiveOrganization?.id]);

  // Simplified: rely solely on logo_url as the source of truth
  const ensureSignedLogoUrl = async (_possiblyPublicUrl?: string | null) => {
    return;
  };

  const organizationSchemaExtended = organizationSchema.extend({
    website: z.string().optional(),
    address: z.string().optional(),
  });

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchemaExtended),
    defaultValues: {
      name: '',
      members_count: 0,
      mission: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      address: '',
    },
  });

  React.useEffect(() => {
    if (localActiveOrganization) {
      form.reset({
        name: localActiveOrganization.name || '',
        members_count: localActiveOrganization.members_count || 0,
        mission: localActiveOrganization.mission || '',
        contact_name: localActiveOrganization.contact_name || '',
        contact_email: localActiveOrganization.contact_email || '',
        contact_phone: localActiveOrganization.contact_phone || '',
      });
      setPrimaryContactUserId(
        localActiveOrganization.primary_contact_user_id || null
      );
    }
  }, [localActiveOrganization, form]);

  const updateOrganization = useMutation({
    mutationFn: async (values: OrganizationFormValues) => {
      const targetOrgId = selectedOrganizationId || localActiveOrganization?.id;
      if (!user?.id || !targetOrgId)
        throw new Error('Not authenticated or no organization');

      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: values.name,
          members_count: values.members_count,
          mission: values.mission || null,
          contact_name: values.contact_name,
          contact_email: values.contact_email,
          contact_phone: values.contact_phone || null,
          primary_contact_user_id: primaryContactUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetOrgId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Organization updated',
        description: 'Your organization information has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['organization', user?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update organization information.',
        variant: 'destructive',
      });
      console.error('Update organization error:', error);
    },
  });

  const uploadLogo = async (file: File) => {
    // Use selectedOrganizationId directly to ensure we're uploading to the correct org
    const targetOrgId = selectedOrganizationId || localActiveOrganization?.id;

    if (!user?.id || !targetOrgId) {
      toast({
        title: 'Upload failed',
        description: 'User or organization not found. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Validate file type
      const allowedTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          'Invalid file type. Please upload PNG, JPG, or WebP images only.'
        );
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File too large. Please select an image under 2MB.');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${targetOrgId}-${Date.now()}.${fileExt}`;

      console.log('Uploading logo:', {
        fileName,
        fileSize: file.size,
        fileType: file.type,
      });

      // Try to upload to organization-logos bucket
      let uploadResult = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });

      // If RLS fails, try uploading to a public bucket as fallback
      if (
        uploadResult.error &&
        uploadResult.error.message.includes('row-level security')
      ) {
        console.log('RLS failed, trying fallback upload method...');

        // Create a simple base64 data URL as fallback
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // For now, we'll store the image as base64 in the database
        // This is a temporary solution until RLS is fixed
        const base64Data = dataUrl.split(',')[1];

        // Update organization with base64 data temporarily
        let { error: updateError } = await supabase
          .from('organizations')
          .update({
            logo_url: `data:${file.type};base64,${base64Data}`,
            logo_base64: base64Data, // Store base64 in a separate field if column exists
          })
          .eq('id', targetOrgId);

        // If the project doesn't have logo_base64 column yet, retry without it
        if (
          updateError &&
          (updateError.code === '42703' ||
            (typeof updateError.message === 'string' &&
              updateError.message.includes('logo_base64')))
        ) {
          console.warn('logo_base64 column missing, retrying without it');
          const retry = await supabase
            .from('organizations')
            .update({
              logo_url: `data:${file.type};base64,${base64Data}`,
            })
            .eq('id', targetOrgId);
          updateError = retry.error as any;
        }

        if (updateError) {
          console.error('Organization update failed:', updateError);
          throw new Error('Failed to save logo. Please try again later.');
        }

        // Set success result
        uploadResult = {
          data: { id: fileName, path: fileName, fullPath: fileName },
          error: null,
        };
      } else if (uploadResult.error) {
        throw uploadResult.error;
      }

      if (uploadResult.error) {
        console.error('Storage upload error:', uploadResult.error);
        if (uploadResult.error.message.includes('row-level security policy')) {
          throw new Error(
            'Upload failed due to security policy. Please try again or contact support if the issue persists.'
          );
        }
        throw uploadResult.error;
      }

      console.log('Logo uploaded successfully:', uploadResult.data);

      // Only update database if we used storage (not base64 fallback)
      if (!uploadResult.data.path.includes('base64')) {
        // Prefer a long-lived signed URL to avoid public bucket requirement
        const { data: signed, error: signError } = await supabase.storage
          .from('organization-logos')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

        if (signError) {
          console.warn(
            'Signed URL generation failed, falling back to publicUrl',
            signError
          );
        }

        const publicUrl =
          signed?.signedUrl ||
          supabase.storage.from('organization-logos').getPublicUrl(fileName)
            .data.publicUrl;

        console.log('Resolved logo URL:', publicUrl);

        const { error: updateError } = await supabase
          .from('organizations')
          .update({ logo_url: publicUrl, logo_path: fileName })
          .eq('id', targetOrgId);

        if (updateError) {
          // Retry without logo_path column if it doesn't exist
          if (
            (updateError as any)?.code === '42703' ||
            (updateError as any)?.message?.includes('logo_path')
          ) {
            console.warn('logo_path column missing, retrying without it');
            const retry = await supabase
              .from('organizations')
              .update({ logo_url: publicUrl })
              .eq('id', targetOrgId);
            if (retry.error) {
              console.error('Database update error:', retry.error);
              throw retry.error;
            }
          } else {
            console.error('Database update error:', updateError);
            throw updateError;
          }
        }
      }

      // Invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization', user?.id] }),
        queryClient.invalidateQueries({
          queryKey: ['multiple-organizations', user?.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['teamMembers', targetOrgId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['team-members', targetOrgId],
        }),
        refetch(),
        refetchOrganizations(),
      ]);

      toast({
        title: 'Logo uploaded successfully',
        description: 'Your organization logo has been updated.',
      });
      // Update local logo state
      setLogoUrl(activeOrganization?.logo_url || null);
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Upload failed',
        description:
          error.message || 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeLogo = async () => {
    const targetOrgId = selectedOrganizationId || localActiveOrganization?.id;
    if (!user?.id || !targetOrgId) return;

    try {
      await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', targetOrgId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization', user?.id] }),
        queryClient.invalidateQueries({
          queryKey: ['multiple-organizations', user?.id],
        }),
      ]);

      toast({
        title: 'Logo removed',
        description: 'Your organization logo has been removed.',
      });
    } catch (error) {
      console.error('Logo removal error:', error);
      toast({
        title: 'Removal failed',
        description: 'Failed to remove logo. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 2MB.',
          variant: 'destructive',
        });
        return;
      }
      uploadLogo(file);
    }
  };

  const onSubmit = (values: OrganizationFormValues) => {
    updateOrganization.mutate(values);
  };

  const handleContactChange = (
    userId: string | null,
    contactData: { name: string; email: string; phone?: string }
  ) => {
    setPrimaryContactUserId(userId);
    if (userId && contactData.name && contactData.email) {
      // Auto-populate form fields when a team member is selected
      form.setValue('contact_name', contactData.name);
      form.setValue('contact_email', contactData.email);
      form.setValue('contact_phone', contactData.phone || '');
    }
  };

  const handleOrganizationSelect = async (orgId: string) => {
    // Use global organization context
    selectOrganization(orgId);

    // Find the selected organization data from the list
    const selectedOrg = organizations.find(
      (org) => org.organization.id === orgId
    );
    if (selectedOrg) {
      // Update form with selected organization data
      form.setValue('name', selectedOrg.organization.name || '');
      form.setValue('mission', selectedOrg.organization.mission || '');
      // Update preview logo immediately when switching organizations
      setLogoUrl(selectedOrg.organization.logo_url || null);
      form.setValue(
        'members_count',
        selectedOrg.organization.members_count || 0
      );
      form.setValue('website', selectedOrg.organization.website || '');
      form.setValue(
        'contact_name',
        selectedOrg.organization.contact_name || ''
      );
      form.setValue(
        'contact_email',
        selectedOrg.organization.contact_email || ''
      );
      form.setValue(
        'contact_phone',
        selectedOrg.organization.contact_phone || ''
      );
      form.setValue('address', selectedOrg.organization.description || '');

      // Set primary contact
      setPrimaryContactUserId(
        selectedOrg.organization.primary_contact_user_id || null
      );
    }

    // Refresh data for the selected organization
    await Promise.all([
      refetch(),
      refetchOrganizations(),
      queryClient.invalidateQueries({ queryKey: ['teamMembers', orgId] }),
      queryClient.invalidateQueries({ queryKey: ['team-members', orgId] }),
    ]);
  };

  if (orgContextLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading organization data...</span>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          No organization found. Please complete onboarding first.
        </p>
        <div className="text-sm text-muted-foreground">
          <p>Debug info:</p>
          <p>User ID: {user?.id || 'Not available'}</p>
          <p>User Role: {userRole?.role || 'Not available'}</p>
          <p>Organizations count: {organizations.length}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Selector for Multiple Organizations */}
      {hasMultipleOrganizations && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Select Organization to Manage</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/organizations')}
              data-testid="edit-organizations-button"
            >
              Edit
            </Button>
          </div>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            data-testid="org-cards"
          >
            {organizations.slice(0, 4).map((orgWithRole) => (
              <div
                key={orgWithRole.organization.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                  selectedOrganizationId === orgWithRole.organization.id ||
                  activeOrganization?.id === orgWithRole.organization.id
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10 ring-2 ring-green-400/30 shadow-sm'
                    : 'border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/40 opacity-80'
                }`}
                data-testid={`org-card-${orgWithRole.organization.id}`}
                onClick={() =>
                  handleOrganizationSelect(orgWithRole.organization.id)
                }
              >
                <div className="flex items-center gap-3">
                  {orgWithRole.organization.logo_url ? (
                    <img
                      src={orgWithRole.organization.logo_url}
                      alt={`${orgWithRole.organization.name} logo`}
                      className="w-10 h-10 rounded-lg object-cover"
                      onError={(e) => {
                        console.log(
                          'Logo load error for org:',
                          orgWithRole.organization.name,
                          orgWithRole.organization.logo_url
                        );
                        // Don't try to fix it, just log the error
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-lg font-semibold text-muted-foreground">
                        {orgWithRole.organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-medium text-foreground truncate"
                      data-testid={`org-name-${orgWithRole.organization.id}`}
                    >
                      {orgWithRole.organization.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          orgWithRole.userRole.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                            : orgWithRole.userRole.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                        }`}
                      >
                        {orgWithRole.userRole.role === 'superadmin'
                          ? 'SuperAdmin'
                          : orgWithRole.userRole.role === 'admin'
                          ? 'Admin'
                          : 'Member'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {organizations.length > 4 && (
              <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4">
                <Label className="mb-2 block">More Organizations</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  onChange={(e) => handleOrganizationSelect(e.target.value)}
                  value={selectedOrganizationId || activeOrganization?.id || ''}
                >
                  {organizations.map((org) => (
                    <option
                      key={org.organization.id}
                      value={org.organization.id}
                    >
                      {org.organization.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logo Upload */}
      <div className="space-y-3">
        <Label>Organization Logo</Label>
        <div className="flex items-center gap-4">
          <div
            className="relative w-20 h-20 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden"
            data-testid="logo-preview"
          >
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log('Logo preview load error:', logoUrl);
                    // Try to refresh the logo URL
                    setLogoUrl(null);
                    setTimeout(() => {
                      setLogoUrl(activeOrganization?.logo_url || null);
                    }, 1000);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeLogo}
                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => document.getElementById('logo-upload')?.click()}
              data-testid="logo-upload-button"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {activeOrganization?.logo_url ? 'Change Logo' : 'Upload Logo'}
                </>
              )}
            </Button>
            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
              data-testid="logo-upload-input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG up to 2MB
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Community Group" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="members_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Members Count</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} className="w-32" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mission Statement</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your organization's mission and goals"
                    className="min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">
              Contact Information
            </h3>

            <PrimaryContactSelector
              organizationId={selectedOrganizationId || activeOrganization?.id}
              currentContactUserId={primaryContactUserId}
              userRole={userRole?.role}
              onContactChange={handleContactChange}
              onValidationChange={(isValid) => {
                // You can use this to disable the save button or show validation status
                console.log('Contact validation status:', isValid);
              }}
              onEditTeamMember={(userId) => {
                // Navigate to team management section and expand it
                const teamSection = document.querySelector(
                  '[data-testid="team-management-section"]'
                );
                if (teamSection) {
                  teamSection.scrollIntoView({ behavior: 'smooth' });
                  // Trigger click on the team management accordion trigger
                  const trigger = teamSection.querySelector(
                    '[data-testid="team-management-trigger"]'
                  );
                  if (trigger) {
                    (trigger as HTMLElement).click();
                  }
                }
              }}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={updateOrganization.isPending}
              className="min-w-32"
            >
              {updateOrganization.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
