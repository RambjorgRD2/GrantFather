import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { SuggestionCard } from "./SuggestionCard";
import { ApplicationSuggestion, SuggestionService } from "@/services/suggestionService";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export function ApplicationSuggestions() {
  const [suggestions, setSuggestions] = useState<ApplicationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();
  const { toast } = useToast();

  const loadSuggestions = async () => {
    if (!organization?.id) return;
    
    try {
      setError(null);
      const data = await SuggestionService.getSuggestions(organization.id);
      setSuggestions(data);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewSuggestions = async () => {
    if (!organization?.id) return;
    
    setIsGenerating(true);
    try {
      setError(null);
      await SuggestionService.generateSuggestions(organization.id);
      await loadSuggestions();
      toast({
        title: "Suggestions Updated",
        description: "New application suggestions have been generated",
      });
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError('Failed to generate new suggestions. Please try again.');
      toast({
        title: "Error",
        description: "Failed to generate new suggestions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [organization?.id]);

  if (!organization?.onboarding_completed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Application Suggestions
          </CardTitle>
          <CardDescription>
            Complete your organization setup to get personalized funding suggestions
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Application Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered funding opportunities tailored to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Application Suggestions
            </CardTitle>
            <CardDescription>
              AI-powered funding opportunities tailored to your organization
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateNewSuggestions}
            disabled={isGenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {suggestions.length === 0 && !error && (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No suggestions yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate personalized funding suggestions based on your organization profile
            </p>
            <Button onClick={generateNewSuggestions} disabled={isGenerating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate Suggestions
            </Button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onStatusChange={loadSuggestions}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}