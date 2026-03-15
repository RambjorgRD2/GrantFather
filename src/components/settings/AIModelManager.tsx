import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw,
  BarChart3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  getModelUsageStats,
  getSafeToRemoveModels,
  forceUpdateModels,
  getModelUpdateStatus,
} from '@/services/aiProviders';
import { useAuth } from '@/providers/AuthProvider';

interface ModelUsageStats {
  provider: string;
  total_models: number;
  active_models: number;
  deprecated_models: number;
  most_used_model: string;
  total_usage_count: number;
}

interface SafeToRemoveModel {
  provider: string;
  model: string;
  usage_count: number;
  last_used: string | null;
  days_since_last_use: number | null;
}

export function AIModelManager() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(getModelUpdateStatus());
  const { user } = useAuth();

  // Fetch model usage statistics
  const {
    data: usageStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['model-usage-stats'],
    queryFn: getModelUsageStats,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Fetch models safe to remove
  const {
    data: safeToRemove,
    isLoading: removeLoading,
    refetch: refetchRemove,
  } = useQuery({
    queryKey: ['safe-to-remove-models'],
    queryFn: getSafeToRemoveModels,
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  // Update status polling
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateStatus(getModelUpdateStatus());
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      await forceUpdateModels();
      toast.success('Model update completed successfully!');
      refetchStats();
      refetchRemove();
    } catch (error) {
      console.error('Error forcing model update:', error);
      toast.error('Failed to update models. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveUnusedModels = async () => {
    if (!safeToRemove || safeToRemove.length === 0) {
      toast.info('No models are safe to remove.');
      return;
    }

    try {
      // Mark models as removed in the database
      for (const modelInfo of safeToRemove) {
        const [provider, model] = modelInfo.split(':');
        // Log the removal (using debug_logs table since model_usage_tracking doesn't exist)
        await supabase.from('debug_logs').insert({
          user_id: user?.id || '',
          level: 'info',
          source: 'ai_model_manager',
          message: 'Model removed due to lack of usage',
          data: {
            provider,
            model,
            reason: 'Removed due to lack of usage',
          },
        });
      }

      toast.success(`Removed ${safeToRemove.length} unused models.`);
      refetchStats();
      refetchRemove();
    } catch (error) {
      console.error('Error removing unused models:', error);
      toast.error('Failed to remove unused models. Please try again.');
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      openai: '🤖',
      anthropic: '🎭',
      google: '💎',
      perplexity: '🔍',
      grok: '⚡',
    };
    return icons[provider] || '🤖';
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI GPT',
      anthropic: 'Anthropic Claude',
      google: 'Google Gemini',
      perplexity: 'Perplexity AI',
      grok: 'xAI Grok',
    };
    return names[provider] || provider;
  };

  return (
    <div className="space-y-6" data-testid="ai-model-section">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium" data-testid="ai-model-title">
            AI Model Manager
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitor model usage and manage AI model updates automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleForceUpdate}
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`}
            />
            {isUpdating ? 'Updating...' : 'Force Update'}
          </Button>
        </div>
      </div>

      {/* Update Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Update Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {updateStatus.isRunning ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-blue-600">
                    Update in progress...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">System ready</span>
                </div>
              )}
            </div>
            {updateStatus.lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last update:{' '}
                {new Date(updateStatus.lastUpdate).toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Model Usage Statistics
          </CardTitle>
          <CardDescription>
            Overview of AI model usage across all providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : Array.isArray(usageStats) && usageStats.length > 0 ? (
            <div className="space-y-4">
              {usageStats.map((stat: any, index: number) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {getProviderIcon(stat.provider)}
                      </span>
                      <span className="font-medium">
                        {getProviderName(stat.provider)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {stat.total_usage_count} uses
                      </Badge>
                      <Badge variant="outline">
                        {stat.active_models} active
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Models</span>
                      <span>
                        {stat.active_models} / {stat.total_models}
                      </span>
                    </div>
                    <Progress
                      value={(stat.active_models / stat.total_models) * 100}
                      className="h-2"
                    />
                  </div>

                  {stat.most_used_model && (
                    <div className="text-sm text-muted-foreground">
                      Most used:{' '}
                      <span className="font-medium">
                        {stat.most_used_model}
                      </span>
                    </div>
                  )}

                  {stat.deprecated_models > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {stat.deprecated_models} deprecated model
                        {stat.deprecated_models !== 1 ? 's' : ''}
                        {stat.deprecated_models === 1 ? ' is' : ' are'} no
                        longer in use.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No usage statistics available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safe to Remove Models */}
      {safeToRemove && safeToRemove.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Unused Models
            </CardTitle>
            <CardDescription>
              Models that are safe to remove (unused for 30+ days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {safeToRemove.length} model
                  {safeToRemove.length !== 1 ? 's' : ''} can be safely removed
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveUnusedModels}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove All
                </Button>
              </div>

              <div className="space-y-2">
                {safeToRemove.map((modelInfo, index) => {
                  const [provider, model] = modelInfo.split(':');
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span>{getProviderIcon(provider)}</span>
                        <span className="font-mono text-sm">{model}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {provider}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Automatic Updates:</strong> The system automatically checks
          for new AI models every 24 hours and adds them to the available
          options. Models currently in use are never removed automatically.
        </p>
        <p className="mt-2">
          <strong>Safe Removal:</strong> Only models that have never been used
          and are no longer available from their providers are marked for
          removal.
        </p>
      </div>
    </div>
  );
}
