import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrganizationProfile {
  id: string;
  name: string;
  org_type: string;
  mission?: string;
  event_types: string[];
  funding_needs: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { organizationId } = await req.json();

    // Get organization profile
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    // Get existing applications to avoid duplicates
    const { data: applications } = await supabase
      .from('grant_applications')
      .select('project_name, summary')
      .eq('organization_id', organizationId);

    // Get suggestion history to avoid repeats
    const { data: history } = await supabase
      .from('suggestion_history')
      .select('suggestion_key, times_suggested')
      .eq('organization_id', organizationId);

    // Generate AI suggestions using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a grant funding expert. Analyze the organization profile and generate 3-5 specific, actionable grant application suggestions. 

    Organization Details:
    - Type: ${org.org_type}
    - Mission: ${org.mission || 'Not specified'}
    - Event Types: ${org.event_types.join(', ') || 'None specified'}
    - Funding Needs: ${org.funding_needs.join(', ') || 'None specified'}

    Past Applications: ${applications?.map(app => app.project_name).join(', ') || 'None'}

    For each suggestion, provide:
    1. Clear, specific title (max 60 characters)
    2. Detailed description explaining why it fits the organization
    3. Estimated funding amount ($1,000 - $100,000 range)
    4. Suggestion type (event_based, mission_based, or recurring)
    5. Potential funding sources
    6. Whether it's recurring and recurrence period
    
    Focus on realistic, achievable opportunities that align with their mission and type. Avoid suggesting things they've already applied for.
    
    Return as JSON array with format:
    [{
      "title": "string",
      "description": "string", 
      "suggested_funding_amount": number,
      "suggestion_type": "event_based|mission_based|recurring",
      "funding_sources": ["source1", "source2"],
      "is_recurring": boolean,
      "recurrence_period": "annual|quarterly|monthly" or null
    }]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate grant suggestions for ${org.name}` }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const suggestions = JSON.parse(aiResult.choices[0].message.content);

    // Save suggestions to database
    const suggestionsToInsert = suggestions.map((suggestion: any) => ({
      ...suggestion,
      organization_id: organizationId,
    }));

    const { data: savedSuggestions, error: insertError } = await supabase
      .from('application_suggestions')
      .insert(suggestionsToInsert)
      .select();

    if (insertError) {
      console.error('Error saving suggestions:', insertError);
      throw insertError;
    }

    // Update suggestion history
    for (const suggestion of suggestions) {
      const suggestionKey = `${suggestion.suggestion_type}_${suggestion.title.toLowerCase().replace(/\s+/g, '_')}`;
      
      await supabase
        .from('suggestion_history')
        .upsert({
          organization_id: organizationId,
          suggestion_key: suggestionKey,
          last_suggested: new Date().toISOString(),
          times_suggested: 1
        }, {
          onConflict: 'organization_id,suggestion_key'
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions: savedSuggestions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-suggestions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});