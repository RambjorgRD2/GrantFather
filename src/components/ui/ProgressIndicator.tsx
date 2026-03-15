/**
 * Progress Indicator Component
 * Shows progress for AI generation and other long-running operations
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  description?: string;
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: string;
  showProgress?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'detailed';
}

export function ProgressIndicator({
  steps,
  currentStep,
  showProgress = true,
  className,
  size = 'md',
  variant = 'default',
}: ProgressIndicatorProps) {
  const currentStepIndex = currentStep
    ? steps.findIndex((step) => step.id === currentStep)
    : steps.findIndex((step) => step.status === 'in_progress');

  const completedSteps = steps.filter(
    (step) => step.status === 'completed'
  ).length;
  const progressPercentage =
    steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return (
          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
        );
    }
  };

  const getStepStatusColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {showProgress && (
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
        <span className="text-sm text-gray-600">
          {completedSteps}/{steps.length} completed
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-4', className)}>
        {showProgress && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg transition-colors',
                step.status === 'in_progress' &&
                  'bg-blue-50 border border-blue-200',
                step.status === 'completed' &&
                  'bg-green-50 border border-green-200',
                step.status === 'error' && 'bg-red-50 border border-red-200'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-medium text-sm',
                      getStepStatusColor(step)
                    )}
                  >
                    {step.label}
                  </span>
                  {step.status === 'in_progress' && (
                    <span className="text-xs text-blue-600">
                      In progress...
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-gray-600 mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-3', className)}>
      {showProgress && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">
            {completedSteps}/{steps.length}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-3',
              size === 'sm' && 'text-sm',
              size === 'lg' && 'text-lg'
            )}
          >
            <div className="flex-shrink-0">{getStepIcon(step)}</div>
            <div className="flex-1 min-w-0">
              <span className={cn('font-medium', getStepStatusColor(step))}>
                {step.label}
              </span>
              {step.description && (
                <p className="text-xs text-gray-600 mt-1">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for managing progress steps
export function useProgressSteps(initialSteps: ProgressStep[] = []) {
  const [steps, setSteps] = React.useState<ProgressStep[]>(initialSteps);
  const [currentStep, setCurrentStep] = React.useState<string | undefined>();

  const updateStep = React.useCallback(
    (stepId: string, updates: Partial<ProgressStep>) => {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === stepId ? { ...step, ...updates } : step
        )
      );
    },
    []
  );

  const setStepStatus = React.useCallback(
    (stepId: string, status: ProgressStep['status']) => {
      updateStep(stepId, { status });
      if (status === 'in_progress') {
        setCurrentStep(stepId);
      } else if (currentStep === stepId) {
        setCurrentStep(undefined);
      }
    },
    [updateStep, currentStep]
  );

  const addStep = React.useCallback((step: ProgressStep) => {
    setSteps((prev) => [...prev, step]);
  }, []);

  const removeStep = React.useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((step) => step.id !== stepId));
  }, []);

  const resetSteps = React.useCallback((newSteps: ProgressStep[] = []) => {
    setSteps(newSteps);
    setCurrentStep(undefined);
  }, []);

  return {
    steps,
    currentStep,
    updateStep,
    setStepStatus,
    addStep,
    removeStep,
    resetSteps,
  };
}
