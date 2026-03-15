import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Mail, ExternalLink, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

interface SendApplicationModalProps {
  application: GrantApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendApplicationModal({ application, open, onOpenChange }: SendApplicationModalProps) {
  if (!application) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    });
  };

  const emailSubject = `Grant Application Submission - ${application.project_name}`;
  const emailBody = `Dear Grant Committee,

I am submitting my grant application for "${application.project_name}".

Project Summary:
${application.summary}

Please find the complete application materials attached or available for download at your convenience.

Thank you for your consideration.

Best regards,
[Your Name]
[Your Organization]
[Contact Information]`;

  const applicationData = {
    'Project Name': application.project_name,
    'Application ID': application.id,
    'Status': application.status,
    'Created': new Date(application.created_at).toLocaleDateString(),
    'Last Updated': new Date(application.updated_at).toLocaleDateString(),
    'Summary': application.summary,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass">
        <DialogHeader>
          <DialogTitle>Send Application</DialogTitle>
          <DialogDescription>
            Use these resources to submit your grant application through email or online portals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Template
              </CardTitle>
              <CardDescription>
                Copy this template for email submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject Line:</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {emailSubject}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(emailSubject, "Subject line")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email Body:</label>
                <div className="flex items-start gap-2 mt-1">
                  <pre className="flex-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap font-sans">
                    {emailBody}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(emailBody, "Email body")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Application Information
              </CardTitle>
              <CardDescription>
                Key details for form submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(applicationData).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      {key}:
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                        {value}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(value, key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Portal Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Online Portal Submission
              </CardTitle>
              <CardDescription>
                Tips for submitting through grant portals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <p><strong>Before you start:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Have your PDF application ready for upload</li>
                  <li>Prepare any required supporting documents</li>
                  <li>Check the portal's file size and format requirements</li>
                  <li>Note the submission deadline and timezone</li>
                </ul>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Common portal fields:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Organization/Applicant Information</li>
                  <li>Project Title and Description</li>
                  <li>Requested Amount and Budget Details</li>
                  <li>Project Timeline and Milestones</li>
                  <li>Supporting Documents Upload</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <FileText className="mr-2 h-4 w-4" />
              Print Instructions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}