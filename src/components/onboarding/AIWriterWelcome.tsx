import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Wand2, 
  FileText, 
  Download, 
  ArrowRight,
  Lightbulb 
} from 'lucide-react';

interface AIWriterWelcomeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
}

export function AIWriterWelcome({ open, onOpenChange, projectName }: AIWriterWelcomeProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Sparkles,
      title: "Welcome to Your AI Grant Writer",
      description: `Ready to create your ${projectName} grant application? Our AI will help you write compelling content for each section.`,
    },
    {
      icon: Wand2,
      title: "Powerful AI Tools",
      description: "Use the AI toolbar to regenerate sections, improve writing, or change the tone. Each section can be customized to your needs.",
    },
    {
      icon: FileText,
      title: "Professional Output",
      description: "Generate a complete, professional grant application that you can download as PDF or submit directly through grant portals.",
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark welcome as completed
      localStorage.setItem('ai_writer_welcome_completed', 'true');
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('ai_writer_welcome_completed', 'true');
    onOpenChange(false);
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              2
            </div>
            <div className="text-sm text-muted-foreground">Step 2 of 2</div>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Progress value={progress} className="h-2" />
          
          {/* Feature highlights based on current step */}
          {currentStep === 0 && (
            <div className="space-y-3">
              <div className="glass-subtle rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="font-medium">Quick Tip</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your project information has been pre-loaded. The AI will use this to generate relevant content for each section.
                </p>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Badge variant="secondary" className="justify-center py-2">
                  <Wand2 className="mr-1 h-3 w-3" />
                  Regenerate
                </Badge>
                <Badge variant="secondary" className="justify-center py-2">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Improve
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Look for these tools in each section toolbar
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="glass-subtle rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">What's Next?</span>
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Generate your first section with AI</li>
                  <li>• Review and customize the content</li>
                  <li>• Download as PDF when ready</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Skip Tour
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {currentStep === steps.length - 1 ? (
                'Start Writing'
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}