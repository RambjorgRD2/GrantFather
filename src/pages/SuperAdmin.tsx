import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Database,
  Settings,
  Users,
  Shield,
  Activity,
  RefreshCw,
  Trash2,
  Eye,
  BarChart3,
  Image,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAIProvider } from '@/providers/AIProviderProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SystemDashboard } from '@/components/superadmin/SystemDashboard';
import { UserManagement } from '@/components/superadmin/UserManagement';
import { HeroImageUpload } from '@/components/superadmin/HeroImageUpload';
import { SuperAdminRouteGuard } from '@/components/auth/SuperAdminRouteGuard';

export default function SuperAdmin() {
  const { user } = useAuth();
  const { globalSettings, updateGlobalSettings } = useAIProvider();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch system statistics
  const { data: stats } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: async () => {
      const [
        { count: applicationsCount },
        { count: organizationsCount },
        { count: systemPromptsCount },
        { count: userRolesCount },
      ] = await Promise.all([
        supabase
          .from('grant_applications')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('system_prompts')
          .select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }),
      ]);

      return {
        users: userRolesCount || 0,
        applications: applicationsCount || 0,
        organizations: organizationsCount || 0,
        systemPrompts: systemPromptsCount || 0,
      };
    },
  });

  // Cache management
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('clear-cache', {});
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cache cleared successfully');
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error('Failed to clear cache: ' + error.message);
    },
  });

  return (
    <SuperAdminRouteGuard>
      <div
        className="container mx-auto py-6 space-y-6"
        data-testid="superadmin-page"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SuperAdmin Dashboard</h1>
            <p className="text-muted-foreground">
              System-wide management and configuration tools
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            SuperAdmin Access
          </Badge>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Applications
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.applications || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Organizations
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.organizations || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                System Prompts
              </CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.systemPrompts || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="ai-tools" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI & Data Tools
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              AI Models
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <SystemDashboard />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <HeroImageUpload />
          </TabsContent>

          <TabsContent value="ai-tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI & Data Tools</CardTitle>
                <CardDescription>
                  Advanced AI configuration and data management tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Knowledge Base Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Manage organization knowledge bases and AI training data
                      </p>
                      <Button className="w-full" variant="outline" disabled title="Coming soon">
                        <Eye className="h-4 w-4 mr-2" />
                        View Knowledge Bases
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Data Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        System-wide analytics and performance metrics
                      </p>
                      <Button className="w-full" variant="outline" disabled title="Coming soon">
                        <Activity className="h-4 w-4 mr-2" />
                        View Analytics
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Model Configuration</CardTitle>
                <CardDescription>
                  Manage AI providers, models, and system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Global AI Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Provider</label>
                        <p className="text-sm text-muted-foreground">
                          {globalSettings.provider}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Model</label>
                        <p className="text-sm text-muted-foreground">
                          {globalSettings.model}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2">Available Models</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {[
                        'OpenAI GPT-4o',
                        'Anthropic Claude',
                        'Google Gemini',
                        'Perplexity',
                        'Grok',
                      ].map((model) => (
                        <Badge
                          key={model}
                          variant="outline"
                          className="justify-between"
                        >
                          {model}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cache" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
                <CardDescription>
                  Manage system caches and temporary data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">System Cache</h3>
                      <p className="text-sm text-muted-foreground">
                        Clear all cached data and temporary files
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => clearCacheMutation.mutate()}
                      disabled={clearCacheMutation.isPending}
                    >
                      {clearCacheMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Clear Cache
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          AI Response Cache
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Clear cached AI responses and regenerated content
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => clearCacheMutation.mutate()}
                          disabled={clearCacheMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Clear AI Cache
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          User Session Cache
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Clear user session data and preferences
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => clearCacheMutation.mutate()}
                          disabled={clearCacheMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Clear Session Cache
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminRouteGuard>
  );
}
