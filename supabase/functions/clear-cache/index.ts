import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log('=== CLEAR CACHE FUNCTION START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create admin client for system operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    // Verify user is superadmin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has superadmin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Superadmin access required');
    }

    const { cacheType = 'all' } = await req.json().catch(() => ({}));

    const operations = [];
    
    if (cacheType === 'database' || cacheType === 'all') {
      // Clear application cache by updating timestamps
      operations.push(
        supabase.from('grant_applications').update({ updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
      );
      
      // Clear organization cache
      operations.push(
        supabase.from('organizations').update({ updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
      );
      
      // Clear knowledge base cache
      operations.push(
        supabase.from('knowledge_base').update({ updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
      );
    }

    if (cacheType === 'model_usage' || cacheType === 'all') {
      // Clear old model usage tracking data (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      operations.push(
        supabase.from('model_usage_tracking')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString())
      );
    }

    if (cacheType === 'debug_logs' || cacheType === 'all') {
      // Clear old debug logs (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      operations.push(
        supabase.from('debug_logs')
          .delete()
          .lt('created_at', sevenDaysAgo.toISOString())
      );
    }

    // Execute all operations
    const results = await Promise.allSettled(operations);
    
    // Count successful operations
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    // Log cache clear operation
    await supabase
      .from('debug_logs')
      .insert({
        level: 'info',
        source: 'clear_cache_function',
        message: `Cache cleared successfully`,
        user_id: user.id,
        data: {
          cache_type: cacheType,
          operations_successful: successful,
          operations_failed: failed,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`Cache clear completed: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cache cleared successfully',
      operations: {
        successful,
        failed,
        total: operations.length
      },
      cache_type: cacheType,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});