import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Users, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export const UserManagement = () => {
  const { users, isLoadingUsers, refetchUsers, updateUserRole, deleteUser, isUpdatingUser, isDeletingUser } = useSuperAdmin();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const handleRoleUpdate = (userId: string, role: 'admin' | 'member' | 'superadmin', organizationId: string) => {
    updateUserRole({ userId, role, organizationId });
  };

  const handleDeleteUser = (userId: string, organizationId: string) => {
    if (confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      deleteUser({ userId, organizationId });
    }
  };

  if (isLoadingUsers) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage users across all organizations
          </p>
        </div>
        <Button onClick={() => refetchUsers()} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </CardTitle>
          <CardDescription>
            View and manage all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={`${user.id}-${user.organization_id}`}>
                    <TableCell className="font-mono text-sm">
                      {user.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.organization_name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {user.organization_id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === 'superadmin'
                            ? 'default'
                            : user.role === 'admin'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={user.role}
                          onValueChange={(role: 'admin' | 'member' | 'superadmin') =>
                            handleRoleUpdate(user.id, role, user.organization_id)
                          }
                          disabled={isUpdatingUser}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="superadmin">SuperAdmin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.organization_id)}
                          disabled={isDeletingUser || user.role === 'superadmin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};