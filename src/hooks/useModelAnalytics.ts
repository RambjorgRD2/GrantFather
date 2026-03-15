import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModelUsageStats {
  provider: string;
  model: string;
  section_name: string | null;
  usage_count: number;
  last_used: string;
}

export interface ProviderStats {
  provider: string;
  total_usage: number;
  models_count: number;
  most_used_model: string;
  sections_used: string[];
}

export function useModelAnalytics(organizationId?: string) {
  // Get detailed model usage stats
  const { data: modelStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['model-usage-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .rpc('get_organization_model_usage', {
          p_organization_id: organizationId
        });

      if (error) {
        console.error('Error fetching model usage stats:', error);
        return [];
      }

      return data as ModelUsageStats[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get aggregated provider stats
  const { data: providerStats, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['provider-stats', organizationId],
    queryFn: async () => {
      if (!modelStats?.length) return [];

      const providerMap = new Map<string, {
        total_usage: number;
        models: Set<string>;
        sections: Set<string>;
        modelUsage: Map<string, number>;
      }>();

      modelStats.forEach(stat => {
        if (!providerMap.has(stat.provider)) {
          providerMap.set(stat.provider, {
            total_usage: 0,
            models: new Set(),
            sections: new Set(),
            modelUsage: new Map()
          });
        }

        const provider = providerMap.get(stat.provider)!;
        provider.total_usage += stat.usage_count;
        provider.models.add(stat.model);
        if (stat.section_name) provider.sections.add(stat.section_name);
        
        const currentUsage = provider.modelUsage.get(stat.model) || 0;
        provider.modelUsage.set(stat.model, currentUsage + stat.usage_count);
      });

      return Array.from(providerMap.entries()).map(([provider, data]) => ({
        provider,
        total_usage: data.total_usage,
        models_count: data.models.size,
        most_used_model: Array.from(data.modelUsage.entries())
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
        sections_used: Array.from(data.sections)
      })) as ProviderStats[];
    },
    enabled: !!modelStats?.length,
    staleTime: 5 * 60 * 1000,
  });

  // Get section-specific usage
  const getSectionUsage = (sectionName: string) => {
    return modelStats?.filter(stat => stat.section_name === sectionName) || [];
  };

  // Get top models across all providers
  const getTopModels = (limit = 5) => {
    return modelStats
      ?.sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit) || [];
  };

  // Get usage trends (mock implementation - would need time series data)
  const getUsageTrends = () => {
    // This would require historical data with timestamps
    // For now, return current usage as baseline
    return modelStats?.map(stat => ({
      ...stat,
      trend: 'stable' as const
    })) || [];
  };

  return {
    // Raw data
    modelStats,
    providerStats,
    
    // Loading states
    isLoading: isLoadingStats || isLoadingProviders,
    isLoadingStats,
    isLoadingProviders,
    
    // Utility functions
    getSectionUsage,
    getTopModels,
    getUsageTrends,
    refetchStats,
    
    // Computed values
    totalUsage: modelStats?.reduce((sum, stat) => sum + stat.usage_count, 0) || 0,
    uniqueModels: new Set(modelStats?.map(stat => stat.model)).size || 0,
    activeProviders: new Set(modelStats?.map(stat => stat.provider)).size || 0,
  };
}