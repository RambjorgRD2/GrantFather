import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Lightbulb, X, Clock } from "lucide-react";
import { ApplicationSuggestion, SuggestionService } from "@/services/suggestionService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface SuggestionCardProps {
  suggestion: ApplicationSuggestion;
  onStatusChange: () => void;
}

export function SuggestionCard({ suggestion, onStatusChange }: SuggestionCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleStartApplication = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const applicationId = await SuggestionService.createApplicationFromSuggestion(
        suggestion,
        user.id
      );
      
      toast({
        title: "Application Created",
        description: "Successfully created application from suggestion",
      });
      
      navigate(`/apply/draft/${applicationId}`);
      onStatusChange();
    } catch (error) {
      console.error('Error creating application:', error);
      toast({
        title: "Error",
        description: "Failed to create application",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    setIsLoading(true);
    try {
      await SuggestionService.updateSuggestionStatus(suggestion.id, 'dismissed');
      toast({
        title: "Suggestion Dismissed",
        description: "This suggestion won't be shown again",
      });
      onStatusChange();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss suggestion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'event_based':
        return 'bg-primary/10 text-primary';
      case 'mission_based':
        return 'bg-secondary/10 text-secondary-foreground';
      case 'recurring':
        return 'bg-accent/10 text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatFundingAmount = (amount: number | null) => {
    if (!amount) return 'Amount TBD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2">{suggestion.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={getSuggestionTypeColor(suggestion.suggestion_type)}
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                {suggestion.suggestion_type.replace('_', ' ')}
              </Badge>
              {suggestion.is_recurring && (
                <Badge variant="outline" className="bg-accent/10 text-accent-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {suggestion.recurrence_period}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={isLoading}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <CardDescription className="text-sm leading-relaxed mb-4 line-clamp-3">
          {suggestion.description}
        </CardDescription>
        
        <div className="space-y-3">
          {suggestion.suggested_funding_amount && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {formatFundingAmount(suggestion.suggested_funding_amount)}
              </span>
            </div>
          )}
          
          {suggestion.application_deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Deadline: {new Date(suggestion.application_deadline).toLocaleDateString()}</span>
            </div>
          )}
          
          {suggestion.funding_sources.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Potential funders: </span>
              <span>{suggestion.funding_sources.slice(0, 2).join(', ')}</span>
              {suggestion.funding_sources.length > 2 && (
                <span className="text-muted-foreground"> +{suggestion.funding_sources.length - 2} more</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          onClick={handleStartApplication}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Creating Application...' : 'Start Application'}
        </Button>
      </CardFooter>
    </Card>
  );
}