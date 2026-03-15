import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, Trash2, RefreshCw, Send, MoreVertical } from "lucide-react";

interface GrantApplication {
  id: string;
  project_name: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  summary: string;
  organization_id: string;
  generated_draft: any;
}

interface ApplicationsListProps {
  applications: GrantApplication[];
  onView: (application: GrantApplication) => void;
  onEdit: (application: GrantApplication) => void;
  onDelete: (application: GrantApplication) => void;
  onResubmit: (application: GrantApplication) => void;
  onSend: (application: GrantApplication) => void;
  onStatusChange: (id: string, status: GrantApplication['status']) => void;
  isUpdating: boolean;
}

const getStatusBadgeVariant = (status: GrantApplication['status']) => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'submitted':
      return 'default';
    case 'in_review':
      return 'outline';
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getStatusColor = (status: GrantApplication['status']) => {
  switch (status) {
    case 'in_review':
      return 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-400';
    case 'approved':
      return 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300 dark:border-green-400';
    default:
      return '';
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function ApplicationsList({
  applications,
  onView,
  onEdit,
  onDelete,
  onResubmit,
  onSend,
  onStatusChange,
  isUpdating,
}: ApplicationsListProps) {
  const canEdit = (status: GrantApplication['status']) => {
    return status === 'draft' || status === 'rejected';
  };

  const canResubmit = (status: GrantApplication['status']) => {
    return status === 'approved' || status === 'rejected';
  };

  const canChangeStatus = (status: GrantApplication['status']) => {
    return status !== 'submitted';
  };

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <Card key={application.id} data-testid="application-row" data-application-id={application.id} className="glass">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{application.project_name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {application.summary}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(application)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                   {canEdit(application.status) && (
                    <DropdownMenuItem data-testid="edit-application-button" onClick={() => onEdit(application)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onSend(application)}>
                    <Send className="mr-2 h-4 w-4" />
                    Send Application
                  </DropdownMenuItem>
                  {canResubmit(application.status) && (
                    <DropdownMenuItem onClick={() => onResubmit(application)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resubmit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    data-testid="delete-application-button"
                    onClick={() => onDelete(application)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {canChangeStatus(application.status) ? (
                    <Select
                      value={application.status}
                      onValueChange={(value) => onStatusChange(application.id, value as GrantApplication['status'])}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-32 h-7">
                        <SelectValue>
                          <Badge 
                            variant={getStatusBadgeVariant(application.status)}
                            className={`text-xs ${getStatusColor(application.status)}`}
                          >
                            {application.status.replace('_', ' ')}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      variant={getStatusBadgeVariant(application.status)}
                      className={`text-xs ${getStatusColor(application.status)}`}
                    >
                      {application.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Submitted: {formatDate(application.submitted_at)}</span>
                  <span>Updated: {formatDate(application.updated_at)}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(application)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}