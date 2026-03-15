import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Edit2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'member' | 'superadmin' | 'owner';
  avatar_url?: string | null;
  avatar_base64?: string | null;
}

interface PrimaryContactSelectorProps {
  organizationId: string;
  currentContactUserId?: string | null;
  onContactChange: (
    userId: string | null,
    contactData: { name: string; email: string; phone?: string }
  ) => void;
  userRole?: string;
  onEditTeamMember?: (userId: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export function PrimaryContactSelector({
  organizationId,
  currentContactUserId,
  onContactChange,
  userRole,
  onEditTeamMember,
  onValidationChange,
}: PrimaryContactSelectorProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    currentContactUserId || null
  );
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualContact, setManualContact] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
  }>({});
  const { toast } = useToast();

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['team-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get user roles first
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('organization_id', organizationId);

      if (rolesError) {
        console.error('Error fetching team roles:', rolesError);
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
        console.error('Error fetching profiles:', profilesError);
        // Continue without profiles if they don't exist
      }

      // Combine roles with profile data
      return roles.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);

        // Try to get user info from auth if profile is missing
        let userEmail = profile?.email || 'Unknown';
        let userName = profile?.full_name || 'Unnamed User';

        // If no profile found, try to extract email from user_id or use a better fallback
        if (!profile) {
          // Try to get user info from auth metadata or use a more user-friendly fallback
          userName = `Team Member ${role.user_id.slice(0, 6)}`;
          userEmail = `user-${role.user_id.slice(0, 6)}@organization.local`;
        } else if (profile.email && !profile.full_name) {
          // If we have email but no full name, use email prefix
          userName = profile.email.split('@')[0];
        }

        return {
          user_id: role.user_id,
          full_name: userName,
          email: userEmail,
          phone: profile?.phone || null,
          role: role.role,
        };
      });
    },
    enabled: !!organizationId,
  });

  // Sync selectedUserId with currentContactUserId when it changes
  useEffect(() => {
    if (currentContactUserId !== selectedUserId) {
      setSelectedUserId(currentContactUserId || null);
    }
  }, [currentContactUserId, selectedUserId]);

  // Populate contact data when component first loads with a currentContactUserId
  useEffect(() => {
    if (teamMembers && currentContactUserId && !showManualEntry) {
      const selectedMember = teamMembers.find(
        (member) => member.user_id === currentContactUserId
      );
      if (selectedMember) {
        onContactChange(currentContactUserId, {
          name: selectedMember.full_name || '',
          email: selectedMember.email || '',
          phone: selectedMember.phone || undefined,
        });
      }
    }
  }, [teamMembers, currentContactUserId, showManualEntry, onContactChange]);

  // Check for unsaved changes and warn user before leaving
  useEffect(() => {
    const hasUnsavedChanges =
      showManualEntry &&
      (manualContact.name.trim() ||
        manualContact.email.trim() ||
        manualContact.phone.trim());

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [showManualEntry, manualContact]);

  const handleContactSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedMember = teamMembers?.find(
      (member) => member.user_id === userId
    );
    if (selectedMember) {
      onContactChange(userId, {
        name: selectedMember.full_name || '',
        email: selectedMember.email || '',
        phone: selectedMember.phone || undefined,
      });
    }
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
    setSelectedUserId(null);
    onContactChange(null, manualContact);
  };

  // Validation function
  const validateManualContact = (contact: {
    name: string;
    email: string;
    phone?: string;
  }) => {
    const newErrors: { name?: string; email?: string } = {};

    if (!contact.name.trim()) {
      newErrors.name = 'Primary Contact Name is required';
    }

    if (!contact.email.trim()) {
      newErrors.email = 'Primary Contact Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;

    if (onValidationChange) {
      onValidationChange(isValid);
    }

    return isValid;
  };

  const handleManualContactChange = (field: string, value: string) => {
    const updatedContact = { ...manualContact, [field]: value };
    setManualContact(updatedContact);

    // Clear error for the field being updated
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    onContactChange(null, updatedContact);
  };

  const handleEditTeamMember = (userId: string) => {
    if (onEditTeamMember) {
      onEditTeamMember(userId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Primary Contact</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Primary Contact</Label>
      <div className="flex items-center gap-2">
        <Select
          value={selectedUserId || ''}
          onValueChange={handleContactSelect}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select team member as primary contact">
              {selectedUserId && teamMembers
                ? (() => {
                    const selectedMember = teamMembers.find(
                      (m) => m.user_id === selectedUserId
                    );
                    return selectedMember ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">
                            {selectedMember.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedMember.email} • {selectedMember.role}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teamMembers?.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center justify-center gap-2 flex-1">
                    <User className="h-4 w-4" />
                    <div className="text-center">
                      <div className="font-medium">
                        {member.full_name || 'Unnamed User'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.email} • {member.role}
                      </div>
                    </div>
                  </div>
                  {(userRole === 'admin' || userRole === 'superadmin') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTeamMember(member.user_id);
                      }}
                      className="h-6 w-6 p-0 flex-shrink-0 ml-2"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualEntry}
          type="button"
        >
          Manual Entry
        </Button>
      </div>

      {/* Show manual entry fields only when Manual Entry is clicked */}
      {showManualEntry && (
        <div className="space-y-3 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manual-name">Primary Contact Name *</Label>
              <Input
                id="manual-name"
                value={manualContact.name}
                onChange={(e) =>
                  handleManualContactChange('name', e.target.value)
                }
                onBlur={() => validateManualContact(manualContact)}
                placeholder="Enter contact name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="manual-email">Primary Contact Email *</Label>
              <Input
                id="manual-email"
                type="email"
                value={manualContact.email}
                onChange={(e) =>
                  handleManualContactChange('email', e.target.value)
                }
                onBlur={() => validateManualContact(manualContact)}
                placeholder="Enter contact email"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="manual-phone">
                Primary Contact Phone (Optional)
              </Label>
              <Input
                id="manual-phone"
                value={manualContact.phone}
                onChange={(e) =>
                  handleManualContactChange('phone', e.target.value)
                }
                placeholder="Enter contact phone"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
