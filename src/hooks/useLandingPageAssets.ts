import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LandingPageAsset {
  id: string;
  asset_type: string;
  alt_text?: string;
  asset_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useLandingPageAssets(assetType?: string) {
  return useQuery({
    queryKey: ['landing-page-assets', assetType],
    queryFn: async () => {
      let query = supabase
        .from('landing_page_assets')
        .select('*')
        .eq('is_active', true);

      if (assetType) {
        query = query.eq('asset_type', assetType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching landing page assets:', error);
        throw error;
      }
      
      console.log('Landing page assets fetched:', data);
      return data as LandingPageAsset[];
    },
    retry: 2,
    retryDelay: 1000,
  });
}

export function useHeroImage() {
  const { data: assets, error, isLoading } = useLandingPageAssets('hero_image');
  const heroImage = assets?.[0];
  
  // Log for debugging
  if (error) {
    console.error('Error fetching hero image:', error);
  }
  
  // Debug logging removed to reduce noise
  
  return {
    heroImage,
    error,
    isLoading
  };
}