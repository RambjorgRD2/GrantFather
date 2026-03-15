import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useModelAnalytics } from '@/hooks/useModelAnalytics';
import { BarChart3, TrendingUp, Zap, Target } from 'lucide-react';

interface ModelAnalyticsDashboardProps {
  organizationId?: string;
}

export function ModelAnalyticsDashboard({ organizationId }: ModelAnalyticsDashboardProps) {
  const {
    providerStats,
    modelStats,
    isLoading,
    totalUsage,
    uniqueModels,
    activeProviders,
    getTopModels,
    getSectionUsage
  } = useModelAnalytics(organizationId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const topModels = getTopModels(5);
  const sections = ['introduction', 'need_statement', 'project_plan', 'budget', 'outcomes', 'conclusion'];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">AI model requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProviders}</div>
            <p className="text-xs text-muted-foreground">AI providers in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Models</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueModels}</div>
            <p className="text-xs text-muted-foreground">Different models used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+15%</div>
            <p className="text-xs text-muted-foreground">vs last period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Usage</CardTitle>
            <CardDescription>AI provider usage statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {providerStats?.map((provider) => (
              <div key={provider.provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{provider.provider}</span>
                    <Badge variant="outline">{provider.models_count} models</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {provider.total_usage} uses
                  </span>
                </div>
                <Progress 
                  value={(provider.total_usage / Math.max(totalUsage, 1)) * 100} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  Top model: {provider.most_used_model}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Models */}
        <Card>
          <CardHeader>
            <CardTitle>Top Models</CardTitle>
            <CardDescription>Most frequently used AI models</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topModels.map((model, index) => (
              <div key={`${model.provider}-${model.model}`} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    #{index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">{model.model}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {model.provider}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{model.usage_count}</div>
                  <div className="text-xs text-muted-foreground">uses</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section Usage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Section Usage Distribution</CardTitle>
            <CardDescription>AI usage across different grant sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sections.map((section) => {
                const sectionUsage = getSectionUsage(section);
                const sectionTotal = sectionUsage.reduce((sum, stat) => sum + stat.usage_count, 0);
                const percentage = totalUsage > 0 ? (sectionTotal / totalUsage) * 100 : 0;

                return (
                  <div key={section} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {section.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sectionTotal}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% of total usage
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}