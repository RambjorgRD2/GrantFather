import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Eye, Edit, Trash2, RefreshCw, Send, MoreHorizontal } from "lucide-react";
import { EditApplicationModal } from "@/components/grants/EditApplicationModal";
import { DeleteApplicationDialog } from "./DeleteApplicationDialog";
import { SendApplicationModal } from "./SendApplicationModal";
import { useState } from "react";

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

interface ApplicationsTableProps {
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

export function ApplicationsTable({
  applications,
  onView,
  onEdit,
  onDelete,
  onResubmit,
  onSend,
  onStatusChange,
  isUpdating,
}: ApplicationsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<GrantApplication | null>(null);

  const handleDeleteLocal = (application: GrantApplication) => {
    setSelectedApplication(application);
    setDeleteDialogOpen(true);
  };

  const handleSendLocal = (application: GrantApplication) => {
    setSelectedApplication(application);
    setSendModalOpen(true);
  };

  const handleEditLocal = (application: GrantApplication) => {
    setSelectedApplication(application);
    setEditModalOpen(true);
  };
  const canEdit = (status: GrantApplication['status']) => {
    return status === 'draft' || status === 'rejected';
  };

  const canResubmit = (status: GrantApplication['status']) => {
    return status === 'approved' || status === 'rejected';
  };

  const canChangeStatus = (status: GrantApplication['status']) => {
    return status !== 'submitted'; // Can't change status of submitted applications
  };

  return (
    <Card className="glass">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grant Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submission Date</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id} className="group">
              <TableCell className="font-medium">
                <div>
                  <p className="font-semibold">{application.project_name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {application.summary}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {canChangeStatus(application.status) ? (
                  <Select
                    value={application.status}
                    onValueChange={(value) => onStatusChange(application.id, value as GrantApplication['status'])}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>
                        <Badge 
                          variant={getStatusBadgeVariant(application.status)}
                          className={getStatusColor(application.status)}
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
                    className={getStatusColor(application.status)}
                  >
                    {application.status.replace('_', ' ')}
                  </Badge>
                )}
              </TableCell>
              <TableCell>{formatDate(application.submitted_at)}</TableCell>
              <TableCell>{formatDate(application.updated_at)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(application)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(application)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      {canEdit(application.status) && (
                        <DropdownMenuItem onClick={() => handleEditLocal(application)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleSendLocal(application)}>
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
                        onClick={() => handleDeleteLocal(application)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedApplication && (
        <DeleteApplicationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          application={selectedApplication}
          onConfirm={() => onDelete(selectedApplication)}
          isDeleting={false}
        />
      )}

      <SendApplicationModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        application={selectedApplication}
      />

      {selectedApplication && (
        <EditApplicationModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          application={{
            id: selectedApplication.id,
            project_name: selectedApplication.project_name,
            funding_amount: 0,
            summary: selectedApplication.summary || "",
            target_audience: "",
            timeline_start: null,
            timeline_end: null,
            expected_impact: ""
          }}
        />
      )}
    </Card>
  );
}