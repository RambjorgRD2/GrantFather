import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

interface Organization {
  id: string;
  name: string;
  org_type: string;
  logo_url?: string;
  logo_path?: string;
  logo_base64?: string;
  mission?: string;
  website?: string;
  address?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  primary_contact_user_id?: string;
  members_count?: number;
  onboarding_completed: boolean;
  event_types?: string[];
  funding_needs?: string[];
  preferred_languages?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'member' | 'superadmin' | 'owner';
  created_at: string;
  updated_at?: string;
}

export function useOrganization() {
  const { user, loading: userLoading } = useAuthUser();

  const { data: organizationData, isLoading, error, refetch } = useQuery({
    queryKey: ["organization", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Single query: join user_roles with organizations
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*, organizations(*)')
        .eq('user_id', user.id)
        .not('organization_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        return { organization: null, userRole: null, isSuperAdmin: false };
      }

      const userRole = roleData[0];
      const orgData = (userRole as any).organizations ?? null;
      // Strip the nested organizations object from the role shape
      const { organizations: _orgs, ...cleanRole } = userRole as any;

      // Check superadmin status from the same result set (already loaded)
      const isSuperAdmin = cleanRole.role === 'superadmin';

      return { organization: orgData, userRole: cleanRole, isSuperAdmin } as const;
    },
    enabled: !!user?.id && !userLoading,
  });

  const organization = organizationData?.organization || null;
  const userRole = organizationData?.userRole || null;
  const isSuperAdmin = organizationData?.isSuperAdmin || userRole?.role === 'superadmin';
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';
  const isMember = userRole?.role === 'member';
  const hasOrganization = !!organization;
  const needsOnboarding = hasOrganization && !organization.onboarding_completed;

  return {
    organization,
    userRole,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isAdmin,
    isMember,
    isSuperAdmin,
    hasOrganization,
    needsOnboarding
  };
}