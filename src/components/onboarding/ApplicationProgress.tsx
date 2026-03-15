import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Sparkles } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  current?: boolean;
}

interface ApplicationProgressProps {
  steps: ProgressStep[];
  className?: string;
}

export function ApplicationProgress({ steps, className }: ApplicationProgressProps) {
  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const currentStep = steps.find(step => step.current);

  return (
    <Card className={`glass-card ${className || ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            Progress
          </CardTitle>
          <Badge variant="secondary">
            {completedSteps}/{steps.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 transition-colors ${
              step.current ? 'text-foreground' : step.completed ? 'text-muted-foreground' : 'text-muted-foreground/60'
            }`}
          >
            {step.completed ? (
              <CheckCircle className="h-4 w-4 text-primary" />
            ) : (
              <Circle className={`h-4 w-4 ${step.current ? 'text-primary' : 'text-muted-foreground/40'}`} />
            )}
            <span className={`text-sm ${step.current ? 'font-medium' : ''}`}>
              {step.label}
            </span>
          </div>
        ))}
        
        {currentStep && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Current: {currentStep.label}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}