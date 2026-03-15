import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  UserMinus,
  Mail,
  Shield,
  User,
  Loader2,
  Edit2,
  Check,
  X,
  Crown,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/hooks/useOrganization';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { InviteMemberModal } from '@/components/organization/InviteMemberModal';

interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'member' | 'superadmin' | 'owner';
  created_at: string;
  updated_at?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  avatar_base64?: string;
}

export function TeamManagement() {
  const { user } = useAuth();
  const { organization, isAdmin, isSuperAdmin } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Organization data comes from useOrganization hook

  // User role comes from useOrganization hook

  // Get team members (user_roles with user emails from auth)
  const {
    data: teamMembers = [],
    isLoading,
    error: teamError,
  } = useQuery({
    queryKey: ['teamMembers', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        console.log('TeamManagement: No organization ID available');
        return [];
      }

      console.log(
        'TeamManagement: Fetching team members for org:',
        organization.id
      );

      // Get user roles first
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('organization_id', organization.id);

      if (rolesError) {
        console.error('TeamManagement: Error fetching team roles:', rolesError);
        throw rolesError;
      }

      if (!roles || roles.length === 0) return [];

      // Get profiles for the user IDs
      const userIds = roles.map((role) => role.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        console.error(
          'TeamManagement: Error fetching profiles:',
          profilesError
        );
        // Continue without profiles if they don't exist
      }

      // Combine roles with profile data
      const teamMembersWithProfiles = roles.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);

        // Try to get user info from auth if profile is missing
        let userEmail =
          profile?.email ||
          (role.user_id === user?.id ? user?.email || 'Unknown' : 'Unknown');
        let userName =
          profile?.full_name ||
          (role.user_id === user?.id
            ? (user?.user_metadata as any)?.full_name ||
              (user?.email?.split('@')[0] ?? 'Unnamed User')
            : 'Unnamed User');

        // If no profile found, try to extract email from user_id or use a better fallback
        if (!profile) {
          // Try to get user info from auth metadata or use a more user-friendly fallback
          if (!(role.user_id === user?.id)) {
            userName = `Team Member ${role.user_id.slice(0, 6)}`;
            userEmail = `user-${role.user_id.slice(0, 6)}@organization.local`;
          }
        } else if (profile.email && !profile.full_name) {
          // If we have email but no full name, use email prefix
          userName = profile.email.split('@')[0];
        }

        // Determine role, ensuring SuperAdmin is reflected for current user
        let effectiveRole: 'admin' | 'member' | 'superadmin' = (role as any)
          .role;
        const isCurrentUser =
          role.user_id === user?.id ||
          (profile?.email && profile.email === user?.email);
        if (isSuperAdmin && isCurrentUser) {
          effectiveRole = 'superadmin';
        }

        return {
          ...role,
          user_email: userEmail,
          user_name: userName,
          user_phone: profile?.phone || null,
          role: effectiveRole,
          avatar_url:
            (profile as any)?.avatar_url ||
            ((profile as any)?.avatar_base64
              ? `data:image/*;base64,${(profile as any).avatar_base64}`
              : undefined),
        };
      });

      console.log('TeamManagement: isSuperAdmin?', isSuperAdmin);
      console.log(
        'TeamManagement: Found team members:',
        teamMembersWithProfiles
      );

      return teamMembersWithProfiles as (TeamMember & {
        user_email: string;
        user_name: string;
        user_phone?: string;
      })[];
    },
    enabled: !!organization?.id,
  });

  // isAdmin comes from useOrganization hook

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teamMembers', organization?.id],
      });
      toast({
        title: 'Member removed',
        description: 'Team member has been removed from the organization',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      memberId,
      newRole,
    }: {
      memberId: string;
      newRole: 'admin' | 'member';
    }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teamMembers', organization?.id],
      });
      toast({
        title: 'Role updated',
        description: 'Team member role has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    },
  });

  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate(memberId);
  };

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'member') => {
    updateRole.mutate({ memberId, newRole });
  };

  const getRoleIcon = (role: 'admin' | 'member' | 'superadmin' | 'owner') => {
    if (role === 'superadmin') {
      return <Crown className="h-4 w-4" />;
    }
    if (role === 'owner') {
      return <Crown className="h-4 w-4" />;
    }
    return role === 'admin' ? (
      <Shield className="h-4 w-4" />
    ) : (
      <User className="h-4 w-4" />
    );
  };

  const startEditingName = (memberId: string, currentName: string) => {
    setEditingName(memberId);
    setEditingNameValue(currentName);
  };

  const cancelEditingName = () => {
    setEditingName(null);
    setEditingNameValue('');
  };

  const saveNameChange = async (memberId: string) => {
    if (!editingNameValue.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Update the user's metadata in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: editingNameValue.trim() },
      });

      if (authError) throw authError;

      // Update the profiles table
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: user?.id,
        full_name: editingNameValue.trim(),
        email: user?.email,
      });

      if (profileError) {
        console.warn(
          'Profile update failed, but auth update succeeded:',
          profileError
        );
        // Don't throw here as auth update succeeded
      }

      // Refresh team members data
      queryClient.invalidateQueries({
        queryKey: ['teamMembers', organization?.id],
      });

      toast({
        title: 'Name updated',
        description: 'Your name has been updated successfully.',
      });

      setEditingName(null);
      setEditingNameValue('');
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: 'Error',
        description: 'Failed to update name. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${user.id}/avatar_${Date.now()}.${ext}`;

      // Try storage first
      let uploadResult = await supabase.storage
        .from('profile-avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });

      if (
        uploadResult.error &&
        uploadResult.error.message.includes('row-level security')
      ) {
        // Fallback to base64 in profiles
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve) => {
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        });
        const base64 = dataUrl.split(',')[1];
        await supabase.from('profiles').upsert({
          user_id: user.id,
          avatar_base64: base64,
          updated_at: new Date().toISOString(),
        });
        toast({
          title: 'Avatar updated',
          description: 'Your profile image has been updated.',
        });
        queryClient.invalidateQueries({
          queryKey: ['teamMembers', organization?.id],
        });
        return;
      } else if (uploadResult.error) {
        throw uploadResult.error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-avatars').getPublicUrl(fileName);

      await supabase.from('profiles').upsert({
        user_id: user.id,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      toast({
        title: 'Avatar updated',
        description: 'Your profile image has been updated.',
      });
      queryClient.invalidateQueries({
        queryKey: ['teamMembers', organization?.id],
      });
    } catch (e) {
      console.error('Avatar upload failed', e);
      toast({
        title: 'Upload failed',
        description: 'Could not update avatar.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (
    role: 'admin' | 'member' | 'superadmin' | 'owner'
  ) => {
    if (role === 'superadmin') {
      return 'destructive';
    }
    if (role === 'owner') {
      return 'default';
    }
    return role === 'admin' ? 'default' : 'secondary';
  };

  return (
    <div className="space-y-6" data-testid="team-management-section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
          {isSuperAdmin && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-md border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <strong>SuperAdmin Access:</strong> You can view and manage team
                members across all organizations.
              </p>
            </div>
          )}
        </div>

        {isAdmin && (
          <Button
            className="gap-2 w-full sm:w-auto"
            onClick={() => setShowInviteModal(true)}
          >
            <Plus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Error Display */}
      {teamError && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            Error loading team members: {teamError.message}
          </p>
        </div>
      )}

      {/* Debug Info */}
      {!organization && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-700 dark:text-yellow-300">
            No organization available. Organization ID:{' '}
            {organization?.id || 'null'}
          </p>
        </div>
      )}

      {/* Team Members List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border border-border rounded-lg glass"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4" data-testid="team-members-list">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 border border-border rounded-lg glass"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {member.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt="Avatar"
                        className="w-10 h-10 object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingName === member.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveNameChange(member.id);
                            }
                          }}
                          className="h-8"
                          placeholder="Enter name"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveNameChange(member.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditingName}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground truncate">
                          {member.user_name}
                        </h3>
                        {member.role === 'superadmin' && (
                          <Badge
                            variant={getRoleBadgeVariant('superadmin')}
                            className="bg-pink-600 text-white hover:bg-pink-700 flex-shrink-0"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            SuperAdmin
                          </Badge>
                        )}
                        {member.user_id === user?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              startEditingName(member.id, member.user_name)
                            }
                            className="h-6 w-6 p-0 flex-shrink-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground truncate">
                      {member.user_email}
                    </p>
                    {member.phone && (
                      <p className="text-sm text-muted-foreground truncate">
                        {member.phone}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions - responsive layout */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  {/* Role badge and select */}
                  <div className="flex items-center gap-2">
                    {member.role !== 'superadmin' && (
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </div>
                      </Badge>
                    )}

                    {isAdmin && member.role !== 'superadmin' && (
                      <Select
                        value={member.role}
                        onValueChange={(value: 'admin' | 'member') =>
                          handleRoleChange(member.id, value)
                        }
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-24 sm:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Member
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {member.user_id === user?.id && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadAvatar(f);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAvatarButtonClick}
                          className="text-xs sm:text-sm"
                        >
                          Upload Photo
                        </Button>
                      </>
                    )}

                    {isAdmin && member.user_id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={removeMember.isPending}
                          >
                            {removeMember.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove Team Member
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this member from
                              the organization? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {teamMembers.length === 0 && (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No team members yet. Invite someone to get started!
          </p>
        </div>
      )}

      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
      />
    </div>
  );
}
