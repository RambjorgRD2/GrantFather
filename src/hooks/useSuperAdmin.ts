import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemStats {
  users: number;
  organizations: number;
  applications: number;
  system_prompts: number;
  knowledge_base: number;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organization_name: string;
  created_at: string;
}

export function useSuperAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has superadmin role
  const { data: isSuperAdmin, isLoading: isLoadingSuperAdmin, error } = useQuery({
    queryKey: ['superadmin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'superadmin')
        .maybeSingle();

      if (error) {
        console.error('Error checking superadmin status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  });

  // Get system statistics for superadmin dashboard
  const { data: systemStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      if (!isSuperAdmin) return null;

      try {
        const [orgsResult, appsResult, promptsResult, rolesResult] = await Promise.all([
          supabase.from('organizations').select('id', { count: 'exact', head: true }),
          supabase.from('grant_applications').select('id', { count: 'exact', head: true }),
          supabase.from('system_prompts').select('id', { count: 'exact', head: true }),
          supabase.from('user_roles').select('id', { count: 'exact', head: true })
        ]);

        return {
          users: rolesResult.count || 0,
          organizations: orgsResult.count || 0,
          applications: appsResult.count || 0,
          system_prompts: promptsResult.count || 0,
          knowledge_base: 0, // Placeholder for future implementation
        } as SystemStats;
      } catch (error) {
        console.error('Error fetching system stats:', error);
        return null;
      }
    },
    enabled: !!isSuperAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes for stats
  });

  // Get all users with their roles and organizations
  const { data: users, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['superadmin-users'],
    queryFn: async () => {
      if (!isSuperAdmin) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          organization_id,
          created_at,
          organizations!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return data.map(item => ({
        id: item.user_id,
        role: item.role,
        organization_id: item.organization_id,
        organization_name: item.organizations?.name || 'Unknown',
        created_at: item.created_at,
      })) as SuperAdminUser[];
    },
    enabled: !!isSuperAdmin,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role, organizationId }: { userId: string; role: 'admin' | 'member' | 'superadmin'; organizationId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return { userId, role, organizationId };
    },
    onSuccess: () => {
      toast.success('User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
    onError: (error) => {
      toast.error('Failed to update user role: ' + error.message);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, organizationId }: { userId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return { userId, organizationId };
    },
    onSuccess: () => {
      toast.success('User removed successfully');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
    },
    onError: (error) => {
      toast.error('Failed to remove user: ' + error.message);
    },
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('clear-cache', {});
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cache cleared successfully');
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error('Failed to clear cache: ' + error.message);
    },
  });

  return {
    // Status
    isSuperAdmin: isSuperAdmin || false,
    isLoading: isLoadingSuperAdmin,
    isLoadingSuperAdmin,
    error,
    
    // System stats
    systemStats,
    isLoadingStats,
    refetchStats,
    
    // User management
    users,
    isLoadingUsers,
    refetchUsers,
    
    // Mutations
    updateUserRole: updateUserRoleMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    clearCache: clearCacheMutation.mutate,
    
    // Mutation states
    isUpdatingUser: updateUserRoleMutation.isPending,
    isDeletingUser: deleteUserMutation.isPending,
    isClearingCache: clearCacheMutation.isPending,
  };
}
