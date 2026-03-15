import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

interface Organization {
  id: string;
  name: string;
  org_type: string;
  mission?: string;
  logo_url?: string;
  logo_path?: string;
  logo_base64?: string;
  website?: string;
  address?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  members_count?: number;
  primary_contact_user_id?: string;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
  created_by?: string;
  ai_response_language?: string;
  description?: string;
  event_types?: string[];
  funding_needs?: string[];
  preferred_languages?: string[];
  ui_language?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'member' | 'superadmin' | 'owner';
  created_at: string;
  updated_at?: string;
}

interface OrganizationWithRole {
  organization: Organization;
  userRole: UserRole;
}

export function useMultipleOrganizations() {
  const { user, loading: userLoading } = useAuth();

  const { data: organizationsData, isLoading, error, refetch } = useQuery({
    queryKey: ["multiple-organizations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        // Get all user roles for this user (excluding null organization_id)
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .not('organization_id', 'is', null) // Exclude roles with null organization_id
          .order('created_at', { ascending: false });

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          throw rolesError;
        }

        if (!rolesData || rolesData.length === 0) {
          return [];
        }

        // Get organization details for each role (deduplicated by organization_id)
        const organizationIds = Array.from(
          new Set(rolesData.map((role) => role.organization_id))
        );
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', organizationIds);

        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
          throw orgsError;
        }

        // For each organization, pick the most recent role row (in case of duplicates)
        const orgIdToLatestRole = new Map<string, UserRole>();
        for (const role of rolesData) {
          // Filter out unsupported roles like 'viewer'
          if (['admin', 'member', 'superadmin', 'owner'].includes(role.role)) {
            const existing = orgIdToLatestRole.get(role.organization_id);
            if (!existing || new Date(role.created_at) > new Date(existing.created_at)) {
              orgIdToLatestRole.set(role.organization_id, {
                id: role.id,
                user_id: role.user_id,
                organization_id: role.organization_id,
                role: role.role as 'admin' | 'member' | 'superadmin' | 'owner',
                created_at: role.created_at,
                updated_at: role.updated_at,
              });
            }
          }
        }

        const organizationsWithRoles: OrganizationWithRole[] = organizationIds
          .map((orgId) => {
            const organization = orgsData?.find((org) => org.id === orgId);
            const role = orgIdToLatestRole.get(orgId);
            return organization && role
              ? {
                  organization,
                  userRole: role,
                }
              : undefined;
          })
          .filter((v) => Boolean(v && v.organization && v.userRole));

        return organizationsWithRoles;
      } catch (error) {
        console.error('Error in useMultipleOrganizations:', error);
        // Return empty array instead of throwing to prevent loading state from getting stuck
        return [];
      }
    },
    enabled: !!user?.id && !userLoading,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const organizations = organizationsData || [];
  const hasMultipleOrganizations = organizations.length > 1;
  const primaryOrganization = organizations.find(org => org.userRole.role === 'admin') || organizations[0];

  return {
    organizations,
    primaryOrganization,
    hasMultipleOrganizations,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
