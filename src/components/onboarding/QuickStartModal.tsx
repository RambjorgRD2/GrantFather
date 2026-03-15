import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';

interface QuickStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickStartModal({ open, onOpenChange }: QuickStartModalProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    project_name: '',
    summary: '',
    funding_amount: '',
  });

  const createApplicationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('grant_applications')
        .insert({
          project_name: formData.project_name,
          summary: formData.summary,
          funding_amount: formData.funding_amount ? parseInt(formData.funding_amount) : null,
          user_id: user?.id,
          organization_id: organization?.id,
          status: 'draft',
          target_audience: 'General',
          timeline_start: new Date().toISOString().split('T')[0],
          timeline_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          expected_impact: 'To be defined',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Mark onboarding as started
      localStorage.setItem('onboarding_started', 'true');
      
      toast({
        title: 'Application created!',
        description: 'Let\'s get your AI writer ready.',
      });
      
      onOpenChange(false);
      navigate(`/apply/draft/${data.id}?welcome=true`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_name.trim() || !formData.summary.trim()) {
      toast({
        title: 'Required fields missing',
        description: 'Please fill in your project name and description.',
        variant: 'destructive',
      });
      return;
    }
    createApplicationMutation.mutate();
  };

  const isComplete = formData.project_name.trim() && formData.summary.trim();
  const progress = isComplete ? 100 : 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              1
            </div>
            <div className="text-sm text-muted-foreground">Step 1 of 2</div>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Start Setup
          </DialogTitle>
          <DialogDescription>
            Let's create your first application! We just need the basics to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name *</Label>
              <Input
                id="project_name"
                placeholder="e.g., Community Garden Initiative"
                value={formData.project_name}
                onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Brief Description *</Label>
              <Textarea
                id="summary"
                placeholder="Describe your project in a few sentences..."
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funding_amount">Funding Amount (optional)</Label>
              <Input
                id="funding_amount"
                type="number"
                placeholder="e.g., 50000"
                value={formData.funding_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, funding_amount: e.target.value }))}
                className="h-12"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isComplete || createApplicationMutation.isPending}
                className="flex-1"
              >
                {createApplicationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Continue to AI Writer'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}