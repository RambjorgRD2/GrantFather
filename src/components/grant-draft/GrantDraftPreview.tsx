import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Calendar, DollarSign, Users } from "lucide-react";
import { GrantSection, GrantApplication } from "@/types/grantApplication";

interface GrantDraftPreviewProps {
  sections: GrantSection;
  application: GrantApplication;
}

const sectionLabels = {
  introduction: "Intro",
  need_statement: "Need", 
  project_plan: "Plan",
  budget: "Budget",
  outcomes: "Impact",
  conclusion: "Result"
};

export function GrantDraftPreview({ sections, application }: GrantDraftPreviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-2">
                {application.project_name}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Building className="h-4 w-4" />
                <span>{application.organizations?.name || 'Organization'}</span>
                <Badge variant="secondary">{application.organizations?.org_type || 'Unknown'}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(application.funding_amount)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(application.timeline_start)} - {formatDate(application.timeline_end)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{application.target_audience}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sections */}
      {Object.entries(sections).map(([key, content]) => {
        if (!content?.trim()) return null;
        
        return (
          <Card key={key} className="glass">
            <CardHeader>
              <CardTitle className="text-lg">
                {sectionLabels[key as keyof typeof sectionLabels]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {content.split('\n').map((paragraph, index) => {
                  if (!paragraph.trim()) return null;
                  return (
                    <p key={index} className="mb-3 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Footer */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Contact:</strong> {application.organizations?.name || 'Organization'}</p>
            <p><strong>Project Duration:</strong> {formatDate(application.timeline_start)} - {formatDate(application.timeline_end)}</p>
            <p><strong>Requested Amount:</strong> {formatCurrency(application.funding_amount)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}