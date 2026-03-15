import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultipleOrganizations } from '@/hooks/useMultipleOrganizations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

export default function Organizations() {
  const navigate = useNavigate();
  const { organizations, loading, refetch, error } = useMultipleOrganizations();
  const { toast } = useToast();
  // Removed query and sort state - using automatic alphabetical sorting
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [pendingOrgId, setPendingOrgId] = React.useState<string | null>(null);
  const [pendingOrgName, setPendingOrgName] = React.useState<string>('');
  const [ackChecked, setAckChecked] = React.useState(false);
  const [typedName, setTypedName] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgType, setNewOrgType] = React.useState('nonprofit');
  const namesMatch = React.useMemo(
    () => typedName.trim() === pendingOrgName,
    [typedName, pendingOrgName]
  );

  const filtered = React.useMemo(() => {
    if (!organizations) return [];
    // Automatic alphabetical sorting by organization name
    return organizations.sort((a, b) =>
      a.organization.name
        .toLowerCase()
        .localeCompare(b.organization.name.toLowerCase())
    );
  }, [organizations]);

  // Removed copyId function - not needed

  const openDeleteConfirm = (orgId: string, orgName: string) => {
    setPendingOrgId(orgId);
    setPendingOrgName(orgName);
    setAckChecked(false);
    setTypedName('');
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingOrgId) return;
    setDeleting(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      // Call secure RPC that verifies role and performs cascading delete server-side
      const { error: rpcError } = await (supabase as any).rpc(
        'admin_delete_organization',
        {
          org_id: pendingOrgId,
        }
      );
      if (rpcError) throw rpcError;

      toast({
        title: 'Organization deleted',
        description: `${pendingOrgName} was removed.`,
      });
      setConfirmOpen(false);
      setPendingOrgId(null);
      setPendingOrgName('');
      await refetch();
    } catch (e: any) {
      console.error('Delete organization failed:', e);
      toast({
        title: 'Deletion failed',
        description:
          e?.message || 'Could not delete organization. Check permissions.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container py-10" data-testid="organizations-page">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground">
            Manage all organizations you are connected to
          </p>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            data-testid="new-org-button"
          >
            New Organization
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
          Failed to load organizations.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading
          organizations...
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="organizations-grid"
        >
          {filtered.length === 0 ? (
            <div className="col-span-full text-sm text-muted-foreground">
              No organizations found.
            </div>
          ) : (
            filtered.map(({ organization, userRole }) => (
              <div
                key={organization.id}
                className="p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      className="w-10 h-10 rounded-lg object-cover"
                      alt={`${organization.name} logo`}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-lg font-semibold text-muted-foreground">
                        {organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {organization.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {organization.org_type}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <Badge variant="outline">{userRole.role}</Badge>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  {(userRole.role === 'admin' ||
                    userRole.role === 'owner' ||
                    userRole.role === 'superadmin') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        openDeleteConfirm(organization.id, organization.name)
                      }
                      data-testid={`delete-org-${organization.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete
              <span className="font-semibold"> {pendingOrgName}</span> and
              remove all its associations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <input
                id="acknowledge"
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
                className="mt-1"
                data-testid="delete-ack-checkbox"
              />
              <Label htmlFor="acknowledge" className="text-sm leading-6">
                I understand this will permanently delete the organization and
                related roles.
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-name">
                Type the organization name to confirm
              </Label>
              <Input
                id="confirm-name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={pendingOrgName || 'Organization name'}
                data-testid="delete-name-input"
              />
              {pendingOrgName && (
                <p className="text-xs text-muted-foreground">
                  Type exactly: <code className="px-1">{pendingOrgName}</code>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!ackChecked || !namesMatch || deleting}
              data-testid="confirm-delete-button"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Organization */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
            <DialogDescription>
              Create a new organization and become its admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-org-name">Organization name</Label>
              <Input
                id="new-org-name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Acme Community Group"
                data-testid="new-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Organization type</Label>
              <Select value={newOrgType} onValueChange={setNewOrgType}>
                <SelectTrigger data-testid="new-org-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nonprofit">Nonprofit</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="social_enterprise">
                    Social enterprise
                  </SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newOrgName.trim()) return;
                setCreating(true);
                try {
                  const { supabase } = await import(
                    '@/integrations/supabase/client'
                  );
                  const { data: session } = await supabase.auth.getUser();
                  const userId = session.user?.id;
                  if (!userId) throw new Error('Not authenticated');

                  const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .insert({
                      name: newOrgName.trim(),
                      org_type: newOrgType,
                      created_by: userId,
                      onboarding_completed: false,
                      members_count: 0,
                    })
                    .select()
                    .single();
                  if (orgError) throw orgError;

                  const { error: roleError } = await supabase
                    .from('user_roles')
                    .insert({
                      user_id: userId,
                      organization_id: org.id,
                      role: 'admin',
                    });
                  if (roleError) throw roleError;

                  toast({
                    title: 'Organization created',
                    description: `Starting onboarding for ${newOrgName}`,
                  });
                  setCreateOpen(false);
                  setNewOrgName('');
                  setNewOrgType('nonprofit');
                  await refetch();

                  // Navigate to onboarding to complete organization setup
                  navigate(`/onboarding?orgId=${org.id}`);
                } catch (e: any) {
                  console.error('Create organization failed:', e);
                  toast({
                    title: 'Creation failed',
                    description: e?.message || 'Could not create organization.',
                    variant: 'destructive',
                  });
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating || !newOrgName.trim()}
              data-testid="create-org-submit"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
