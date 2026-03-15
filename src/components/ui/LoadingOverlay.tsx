/**
 * Loading Overlay Component
 * Shows loading states with customizable content and animations
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ProgressIndicator, ProgressStep } from './ProgressIndicator';

export interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  description?: string;
  progress?: number;
  steps?: ProgressStep[];
  currentStep?: string;
  variant?: 'default' | 'minimal' | 'fullscreen';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onCancel?: () => void;
  showCancel?: boolean;
  cancelText?: string;
  quote?: string;
  // PHASE 5: Add progress message support
  progressMessage?: string;
  showProgress?: boolean;
}

export function LoadingOverlay({
  isVisible,
  title = 'Loading...',
  description,
  progress,
  steps,
  currentStep,
  variant = 'default',
  size = 'md',
  className,
  onCancel,
  showCancel = false,
  cancelText = 'Cancel',
  quote,
  progressMessage,
  showProgress = true,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-64 h-32';
      case 'lg':
        return 'w-96 h-64';
      default:
        return 'w-80 h-48';
    }
  };

  const getSpinnerSize = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6';
      case 'lg':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'fixed inset-0 bg-black/20 flex items-center justify-center z-50',
          className
        )}
      >
        <div className="bg-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Loader2
              className={cn('animate-spin text-blue-600', getSpinnerSize())}
            />
            <span className="text-sm font-medium">{title}</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div
        className={cn(
          'fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50',
          className
        )}
      >
        <div className="text-center space-y-6">
          <Loader2
            className={cn(
              'animate-spin text-blue-600 mx-auto',
              getSpinnerSize()
            )}
          />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
            {/* PHASE 5: Show progress message */}
            {showProgress && progressMessage && (
              <p className="text-sm text-blue-600 font-medium animate-pulse">
                {progressMessage}
              </p>
            )}
          </div>
          {quote && (
            <div className="mt-6 max-w-md mx-auto">
              <blockquote className="text-center">
                <p className="text-lg font-medium italic text-foreground/90">
                  "{quote}"
                </p>
              </blockquote>
            </div>
          )}
          {progress !== undefined && (
            <div className="w-64 mx-auto">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
          {steps && (
            <div className="w-80 mx-auto">
              <ProgressIndicator
                steps={steps}
                currentStep={currentStep}
                variant="minimal"
              />
            </div>
          )}
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
        className
      )}
    >
      <div
        className={cn('bg-white rounded-lg shadow-xl p-6', getSizeClasses())}
      >
        <div className="flex flex-col items-center space-y-4">
          <Loader2
            className={cn('animate-spin text-blue-600', getSpinnerSize())}
          />

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {progress !== undefined && (
            <div className="w-full space-y-2">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {steps && (
            <div className="w-full">
              <ProgressIndicator
                steps={steps}
                currentStep={currentStep}
                variant="minimal"
                size="sm"
              />
            </div>
          )}

          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-gray-300 rounded-md hover:border-gray-400"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing loading states
export function useLoadingOverlay() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [title, setTitle] = React.useState('Loading...');
  const [description, setDescription] = React.useState<string | undefined>();
  const [progress, setProgress] = React.useState<number | undefined>();
  const [steps, setSteps] = React.useState<ProgressStep[] | undefined>();
  const [currentStep, setCurrentStep] = React.useState<string | undefined>();

  const show = React.useCallback(
    (options?: {
      title?: string;
      description?: string;
      progress?: number;
      steps?: ProgressStep[];
    }) => {
      if (options?.title) setTitle(options.title);
      if (options?.description) setDescription(options.description);
      if (options?.progress !== undefined) setProgress(options.progress);
      if (options?.steps) setSteps(options.steps);
      setIsVisible(true);
    },
    []
  );

  const hide = React.useCallback(() => {
    setIsVisible(false);
    setTitle('Loading...');
    setDescription(undefined);
    setProgress(undefined);
    setSteps(undefined);
    setCurrentStep(undefined);
  }, []);

  const updateProgress = React.useCallback((newProgress: number) => {
    setProgress(newProgress);
  }, []);

  const updateSteps = React.useCallback((newSteps: ProgressStep[]) => {
    setSteps(newSteps);
  }, []);

  const setCurrentStepId = React.useCallback((stepId: string | undefined) => {
    setCurrentStep(stepId);
  }, []);

  return {
    isVisible,
    title,
    description,
    progress,
    steps,
    currentStep,
    show,
    hide,
    updateProgress,
    updateSteps,
    setCurrentStepId,
  };
}
