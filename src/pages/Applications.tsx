import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveOrganization } from '@/contexts/OrganizationContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  Filter,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  Globe,
  Loader2,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { useToast } from '@/hooks/use-toast';
import { CreateApplicationModal } from '@/components/grants/CreateApplicationModal';
import { QuickStartModal } from '@/components/onboarding/QuickStartModal';
import { ApplicationsList } from '@/features/applications/components/ApplicationsList';
import { ApplicationsTable } from '@/features/applications/components/ApplicationsTable';
import { SendApplicationModal } from '@/features/applications/components/SendApplicationModal';
import { DeleteApplicationDialog } from '@/features/applications/components/DeleteApplicationDialog';
import { useNavigate } from 'react-router-dom';

// Import the GrantApplication interface from one of the components
interface GrantApplication {
  id: string;
  project_name: string;
  summary: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'in_review';
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  organization_id?: string;
}

const Applications: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { organization: activeOrganization, loading: orgLoading } =
    useActiveOrganization();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<GrantApplication | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: [
      'applications',
      searchTerm,
      selectedStatus,
      activeOrganization?.id,
    ],
    queryFn: async () => {
      // Return empty array if no user or no active organization
      if (!user || !activeOrganization?.id) {
        return [];
      }

      let query = supabase
        .from('grant_applications')
        .select('id, project_name, summary, status, created_at, updated_at, submitted_at, organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', activeOrganization.id);

      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        query = query.or(
          `project_name.ilike.%${searchTermLower}%,summary.ilike.%${searchTermLower}%`
        );
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        console.error('Error fetching applications:', error);
        throw error;
      }

      console.log(
        '🔍 Debug: Applications fetched successfully:',
        data?.length || 0
      );

      // Map database response to GrantApplication interface
      return (data || []).map((app) => ({
        id: app.id,
        project_name: app.project_name,
        summary: app.summary,
        status: app.status as GrantApplication['status'],
        created_at: app.created_at,
        updated_at: app.updated_at,
        submitted_at: app.submitted_at,
        organization_id: app.organization_id,
      }));
    },
    enabled: !!user && !authLoading && !orgLoading && !!activeOrganization?.id,
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('grant_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setShowDeleteDialog(false);
      setSelectedApplication(null);
      toast({
        title: 'Application deleted',
        description: 'Your application has been permanently removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleView = (application: GrantApplication) => {
    navigate(`/apply/draft/${application.id}`);
  };

  const handleEdit = (application: GrantApplication) => {
    if (application.status === 'draft' || application.status === 'rejected') {
      navigate(`/apply/draft/${application.id}`);
    } else {
      toast({
        title: 'Cannot edit',
        description: 'Only draft and rejected applications can be edited.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (application: GrantApplication) => {
    setSelectedApplication(application);
    setShowDeleteDialog(true);
  };

  const handleSend = (application: GrantApplication) => {
    setSelectedApplication(application);
    setShowSendModal(true);
  };

  if (authLoading || orgLoading) {
    return (
      <main className="container py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </main>
    );
  }

  // Show message if no organization is selected
  if (!activeOrganization) {
    return (
      <main className="container py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">
              No Organization Selected
            </h2>
            <p className="text-muted-foreground mb-4">
              Please select an organization to view applications.
            </p>
            <Button onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <main className="container py-6">
          <SEOHead
            title="Applications"
            description="Manage your grant applications and track their progress."
            canonical="/applications"
          />

          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Applications
              </h1>
              <p className="text-muted-foreground">
                Track and manage your grant applications
              </p>
            </div>
            <Button
              data-testid="create-application-button"
              onClick={() => {
                const isFirstTime = !localStorage.getItem('onboarding_started');
                if (isFirstTime && applications.length === 0) {
                  setShowQuickStart(true);
                } else {
                  setShowCreateModal(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </header>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="search-input"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger
                  data-testid="status-filter"
                  className="w-full sm:w-48"
                >
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                    <div className="mt-4 flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div data-testid="applications-list">
              <ApplicationsList
                applications={applications}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSend={handleSend}
                onResubmit={handleEdit}
                onStatusChange={() => {}}
                isUpdating={false}
              />
            </div>
          ) : (
            <div data-testid="applications-table">
              <ApplicationsTable
                applications={applications}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSend={handleSend}
                onResubmit={handleEdit}
                onStatusChange={() => {}}
                isUpdating={false}
              />
            </div>
          )}

          {applications.length === 0 && !isLoading && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="mx-auto max-w-md">
                  <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
                    <Search className="h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No applications found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || selectedStatus !== 'all'
                      ? 'Try adjusting your search criteria.'
                      : 'Get started by creating your first grant application.'}
                  </p>
                  {!searchTerm && selectedStatus === 'all' && (
                    <Button onClick={() => setShowQuickStart(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Application
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <SendApplicationModal
            application={selectedApplication as any}
            open={showSendModal}
            onOpenChange={setShowSendModal}
          />

          <DeleteApplicationDialog
            application={selectedApplication as any}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={() =>
              selectedApplication &&
              deleteApplicationMutation.mutate(selectedApplication.id)
            }
            isDeleting={deleteApplicationMutation.isPending}
          />

          <CreateApplicationModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
          />

          <QuickStartModal
            open={showQuickStart}
            onOpenChange={setShowQuickStart}
          />
        </main>
    </ErrorBoundary>
  );
};

export default Applications;
