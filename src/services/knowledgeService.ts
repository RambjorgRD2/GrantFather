import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeBaseItem {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  document_type: 'guidance' | 'documentation' | 'template' | 'resource';
  tags: string[];
  url?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeUsage {
  id: string;
  knowledge_id: string;
  application_id?: string;
  usage_context: 'section_generation' | 'suggestion' | 'improvement';
  created_at: string;
}

export class KnowledgeService {
  // Create a new knowledge base item
  static async createKnowledgeItem(item: Omit<KnowledgeBaseItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<KnowledgeBaseItem> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        ...item,
        created_by: (await supabase.auth.getUser()).data.user?.id!,
      })
      .select()
      .single();

    if (error) throw error;
    return data as KnowledgeBaseItem;
  }

  // Get all knowledge base items for an organization
  static async getKnowledgeItems(organizationId: string, activeOnly = true): Promise<KnowledgeBaseItem[]> {
    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('organization_id', organizationId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as KnowledgeBaseItem[]) || [];
  }

  // Get knowledge items by type
  static async getKnowledgeByType(organizationId: string, type: KnowledgeBaseItem['document_type']): Promise<KnowledgeBaseItem[]> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('document_type', type)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as KnowledgeBaseItem[]) || [];
  }

  // Search knowledge base items
  static async searchKnowledge(organizationId: string, query: string, tags?: string[]): Promise<KnowledgeBaseItem[]> {
    let supabaseQuery = supabase
      .from('knowledge_base')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Search in title and content
    if (query.trim()) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
    }

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('tags', tags);
    }

    const { data, error } = await supabaseQuery.order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as KnowledgeBaseItem[]) || [];
  }

  // Update a knowledge base item
  static async updateKnowledgeItem(id: string, updates: Partial<KnowledgeBaseItem>): Promise<KnowledgeBaseItem> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as KnowledgeBaseItem;
  }

  // Delete a knowledge base item (soft delete by setting is_active to false)
  static async deleteKnowledgeItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('knowledge_base')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Hard delete a knowledge base item
  static async hardDeleteKnowledgeItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Track knowledge usage
  static async trackUsage(
    knowledgeId: string, 
    context: {
      organizationId: string;
      userId: string;
      section?: string;
      aiFunction?: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('knowledge_usage_tracking')
      .insert({
        knowledge_base_id: knowledgeId,
        organization_id: context.organizationId,
        user_id: context.userId,
        ai_function: context.aiFunction || context.section || 'general',
        section_name: context.section,
      });

    if (error) throw error;
  }

  // Get relevant knowledge for AI context
  static async getRelevantKnowledge(
    organizationId: string, 
    section?: string, 
    keywords?: string[]
  ): Promise<KnowledgeBaseItem[]> {
    let items: KnowledgeBaseItem[] = [];

    // Get guidance and documentation items
    const guidanceItems = await this.getKnowledgeByType(organizationId, 'guidance');
    const docItems = await this.getKnowledgeByType(organizationId, 'documentation');
    
    items = [...guidanceItems, ...docItems];

    // If section is provided, try to find section-specific knowledge
    if (section) {
      const sectionSpecific = await this.searchKnowledge(organizationId, section);
      items = [...sectionSpecific, ...items];
    }

    // If keywords provided, search for those
    if (keywords && keywords.length > 0) {
      const keywordResults = await this.searchKnowledge(organizationId, keywords.join(' '));
      items = [...keywordResults, ...items];
    }

    // Remove duplicates and limit to top 5 most relevant
    const uniqueItems = items.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    return uniqueItems.slice(0, 5);
  }

  // Get knowledge usage statistics
  static async getUsageStats(organizationId: string): Promise<{
    total_items: number;
    total_usage: number;
    most_used: KnowledgeBaseItem[];
  }> {
    // Get total items
    const { count: totalItems } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Get total usage
    const { count: totalUsage } = await supabase
      .from('knowledge_usage_tracking')
      .select('*, knowledge_base!inner(*)', { count: 'exact', head: true })
      .eq('knowledge_base.organization_id', organizationId);

    // Get most used items
    const { data: mostUsed } = await supabase
      .from('knowledge_base')
      .select(`
        *,
        knowledge_usage(count)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('knowledge_usage.count', { ascending: false })
      .limit(5);

    return {
      total_items: totalItems || 0,
      total_usage: totalUsage || 0,
      most_used: (mostUsed as KnowledgeBaseItem[]) || [],
    };
  }
}