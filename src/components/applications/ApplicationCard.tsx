import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Clock, DollarSign } from 'lucide-react';

interface ApplicationCardProps {
  application: {
    id: string;
    project_name: string;
    summary?: string;
    status: string;
    funding_amount?: number;
    updated_at: string;
    generated_draft?: any;
  };
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  // Calculate progress based on completed sections
  const calculateProgress = () => {
    if (!application.generated_draft) return 0;
    
    let draft;
    try {
      draft = typeof application.generated_draft === 'string' 
        ? JSON.parse(application.generated_draft) 
        : application.generated_draft;
    } catch {
      return 0;
    }
    
    if (!draft || typeof draft !== 'object') return 0;
    
    const sections = ['introduction', 'need_statement', 'project_plan', 'budget', 'outcomes', 'conclusion'];
    const completedSections = sections.filter(section => 
      draft[section] && draft[section].trim().length > 0
    ).length;
    
    return Math.round((completedSections / sections.length) * 100);
  };

  const progress = calculateProgress();
  const timeAgo = formatDistanceToNow(new Date(application.updated_at), { addSuffix: true });

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
            {application.project_name}
          </CardTitle>
          <Badge 
            variant={application.status === 'draft' ? 'secondary' : 'default'}
            className="text-xs flex-shrink-0"
          >
            {application.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {application.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {application.summary}
          </p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Updated {timeAgo}</span>
          </div>
        </div>
        
        {application.funding_amount && (
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatCurrency(application.funding_amount)}</span>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/applications/${application.id}`}>
              <FileText className="h-4 w-4 mr-2" />
              View
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to={`/apply/draft/${application.id}`}>
              Continue
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}