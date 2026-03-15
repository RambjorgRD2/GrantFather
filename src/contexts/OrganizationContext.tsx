import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useMultipleOrganizations } from '@/hooks/useMultipleOrganizations';

interface Organization {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  logo_url?: string | null;
  mission?: string | null;
  members_count?: number;
  primary_contact_user_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
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

interface OrganizationWithRole {
  organization: Organization;
  userRole: UserRole;
}

interface OrganizationContextType {
  // Current active organization
  activeOrganization: Organization | null;
  activeOrganizationRole: string | null;

  // All available organizations
  organizations: OrganizationWithRole[];
  hasMultipleOrganizations: boolean;

  // Organization management
  selectOrganization: (organizationId: string) => void;
  refreshOrganizations: () => void;

  // Loading states
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user, organization: authOrganization } = useAuth();

  // Only fetch organizations if user is authenticated
  const {
    organizations: allOrganizations,
    hasMultipleOrganizations,
    loading: orgsLoading,
    refetch: refetchOrganizations,
  } = useMultipleOrganizations();

  // Debug logging removed for production

  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >(null);
  const [activeOrganization, setActiveOrganization] =
    useState<Organization | null>(null);
  const [activeOrganizationRole, setActiveOrganizationRole] = useState<
    string | null
  >(null);

  // Initialize active organization from localStorage or auth organization
  useEffect(() => {
    if (!user) {
      setActiveOrganizationId(null);
      setActiveOrganization(null);
      setActiveOrganizationRole(null);
      return;
    }

    // Only initialize if we haven't set an active organization yet
    if (!activeOrganizationId) {
      // Try to get from localStorage first
      try {
        const savedOrgId = localStorage.getItem('active-organization-id');
        if (savedOrgId && allOrganizations?.length) {
          const savedOrg = allOrganizations.find(
            (org) => org.organization.id === savedOrgId
          );
          if (savedOrg) {
            setActiveOrganizationId(savedOrgId);
            setActiveOrganization(savedOrg.organization);
            setActiveOrganizationRole(savedOrg.userRole.role);
            return;
          }
        }
      } catch (error) {
        console.warn(
          'Failed to load active organization from localStorage:',
          error
        );
      }

      // Fallback to first available organization
      if (allOrganizations?.length > 0) {
        const firstOrg = allOrganizations[0];
        setActiveOrganizationId(firstOrg.organization.id);
        setActiveOrganization(firstOrg.organization);
        setActiveOrganizationRole(firstOrg.userRole.role);
      } else if (authOrganization) {
        setActiveOrganizationId(authOrganization.id);
        setActiveOrganization(authOrganization);
        setActiveOrganizationRole('admin'); // Default role for auth organization
      }
    }
  }, [user, authOrganization, allOrganizations]);

  // Update active organization when organizations change
  useEffect(() => {
    if (activeOrganizationId && allOrganizations?.length) {
      const org = allOrganizations.find(
        (o) => o.organization.id === activeOrganizationId
      );
      if (org) {
        setActiveOrganization(org.organization);
        setActiveOrganizationRole(org.userRole.role);
      }
    }
  }, [allOrganizations]); // Removed activeOrganizationId to prevent infinite loop

  const selectOrganization = (organizationId: string) => {
    const selectedOrg = allOrganizations?.find(
      (org) => org.organization.id === organizationId
    );
    if (selectedOrg) {
      setActiveOrganizationId(organizationId);
      setActiveOrganization(selectedOrg.organization);
      setActiveOrganizationRole(selectedOrg.userRole.role);

      // Persist to localStorage
      try {
        localStorage.setItem('active-organization-id', organizationId);
      } catch (error) {
        console.warn(
          'Failed to save active organization to localStorage:',
          error
        );
      }
    }
  };

  const refreshOrganizations = () => {
    refetchOrganizations();
  };

  const value: OrganizationContextType = {
    activeOrganization: activeOrganization || null,
    activeOrganizationRole: activeOrganizationRole || null,
    organizations: Array.isArray(allOrganizations) ? allOrganizations : [],
    hasMultipleOrganizations: Boolean(hasMultipleOrganizations),
    selectOrganization,
    refreshOrganizations,
    loading: Boolean(orgsLoading),
  };

  // Debug logging removed for production

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      'useOrganizationContext must be used within an OrganizationProvider'
    );
  }
  return context;
}

// Convenience hook for getting just the active organization
export function useActiveOrganization() {
  const { activeOrganization, activeOrganizationRole, loading } =
    useOrganizationContext();
  return {
    organization: activeOrganization,
    role: activeOrganizationRole,
    loading,
  };
}
