import { supabase } from "@/integrations/supabase/client";

export interface ApplicationSuggestion {
  id: string;
  organization_id: string;
  suggestion_type: 'event_based' | 'mission_based' | 'recurring';
  title: string;
  description: string;
  suggested_funding_amount: number | null;
  funding_sources: string[];
  application_deadline: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  status: 'suggested' | 'applied' | 'dismissed';
  applied_application_id: string | null;
  created_at: string;
  updated_at: string;
}

export class SuggestionService {
  static async generateSuggestions(organizationId: string): Promise<ApplicationSuggestion[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-suggestions', {
        body: { organizationId }
      });

      if (error) {
        console.error('Error generating suggestions:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate suggestions');
      }

      return data.suggestions;
    } catch (error) {
      console.error('Error in generateSuggestions:', error);
      throw error;
    }
  }

  // Get suggestions for a user/organization
  static async getSuggestions(organizationId: string): Promise<ApplicationSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('application_suggestions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suggestions:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        suggestion_type: item.suggestion_type as 'event_based' | 'mission_based' | 'recurring',
        status: item.status as 'suggested' | 'applied' | 'dismissed'
      }));
    } catch (error) {
      console.error('Error in getSuggestions:', error);
      return [];
    }
  }

  static async updateSuggestionStatus(
    suggestionId: string,
    status: 'applied' | 'dismissed'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('application_suggestions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error updating suggestion status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateSuggestionStatus:', error);
      throw error;
    }
  }

  static async createApplicationFromSuggestion(
    suggestion: ApplicationSuggestion,
    userId: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('grant_applications')
      .insert({
        user_id: userId,
        organization_id: suggestion.organization_id,
        project_name: suggestion.title,
        summary: suggestion.description,
        funding_amount: suggestion.suggested_funding_amount || 50000,
        status: 'draft',
        expected_impact: 'To be defined during application development',
        target_audience: 'To be defined during application development',
        timeline_start: new Date().toISOString().split('T')[0],
        timeline_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating application from suggestion:', error);
      throw error;
    }

    // Update suggestion status
    await this.updateSuggestionStatus(suggestion.id, 'applied');

    return data.id;
  }
}