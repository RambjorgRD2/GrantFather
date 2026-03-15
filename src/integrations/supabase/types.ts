export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      application_suggestions: {
        Row: {
          application_deadline: string | null
          applied_application_id: string | null
          created_at: string
          description: string
          funding_sources: string[] | null
          id: string
          is_recurring: boolean | null
          organization_id: string
          recurrence_period: string | null
          status: string
          suggested_funding_amount: number | null
          suggestion_type: string
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          applied_application_id?: string | null
          created_at?: string
          description: string
          funding_sources?: string[] | null
          id?: string
          is_recurring?: boolean | null
          organization_id: string
          recurrence_period?: string | null
          status?: string
          suggested_funding_amount?: number | null
          suggestion_type: string
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          applied_application_id?: string | null
          created_at?: string
          description?: string
          funding_sources?: string[] | null
          id?: string
          is_recurring?: boolean | null
          organization_id?: string
          recurrence_period?: string | null
          status?: string
          suggested_funding_amount?: number | null
          suggestion_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_suggestions_applied_application_id_fkey"
            columns: ["applied_application_id"]
            isOneToOne: false
            referencedRelation: "grant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_logs: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          level: string
          message: string
          organization_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          level?: string
          message: string
          organization_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          level?: string
          message?: string
          organization_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debug_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_applications: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          expected_impact: string
          funding_amount: number
          generated_draft: string | null
          id: string
          organization_id: string
          organization_mission: string
          project_name: string
          status: string
          submitted_at: string | null
          summary: string
          target_audience: string
          timeline_end: string
          timeline_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          expected_impact: string
          funding_amount: number
          generated_draft?: string | null
          id?: string
          organization_id: string
          organization_mission?: string
          project_name: string
          status?: string
          submitted_at?: string | null
          summary: string
          target_audience: string
          timeline_end: string
          timeline_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          expected_impact?: string
          funding_amount?: number
          generated_draft?: string | null
          id?: string
          organization_id?: string
          organization_mission?: string
          project_name?: string
          status?: string
          submitted_at?: string | null
          summary?: string
          target_audience?: string
          timeline_end?: string
          timeline_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_grant_applications_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          ai_sections_used: string[] | null
          content: string
          created_at: string
          created_by: string | null
          document_type: string
          id: string
          is_active: boolean | null
          last_used: string | null
          organization_id: string
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          ai_sections_used?: string[] | null
          content: string
          created_at?: string
          created_by?: string | null
          document_type: string
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          organization_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          ai_sections_used?: string[] | null
          content?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          organization_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_usage_tracking: {
        Row: {
          ai_function: string
          created_at: string | null
          id: string
          knowledge_base_id: string | null
          last_used: string | null
          organization_id: string | null
          section_name: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          ai_function: string
          created_at?: string | null
          id?: string
          knowledge_base_id?: string | null
          last_used?: string | null
          organization_id?: string | null
          section_name?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          ai_function?: string
          created_at?: string | null
          id?: string
          knowledge_base_id?: string | null
          last_used?: string | null
          organization_id?: string | null
          section_name?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_usage_tracking_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_assets: {
        Row: {
          alt_text: string | null
          asset_type: string
          asset_url: string
          created_at: string
          file_size: number | null
          id: string
          is_active: boolean | null
          mime_type: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          asset_type: string
          asset_url: string
          created_at?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          asset_type?: string
          asset_url?: string
          created_at?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      model_usage_tracking: {
        Row: {
          created_at: string | null
          id: string
          last_used: string | null
          model: string
          organization_id: string | null
          provider: string
          section_name: string | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_used?: string | null
          model: string
          organization_id?: string | null
          provider: string
          section_name?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_used?: string | null
          model?: string
          organization_id?: string | null
          provider?: string
          section_name?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          message: string
          organization_id: string | null
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message: string
          organization_id?: string | null
          priority?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message?: string
          organization_id?: string | null
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          created_by: string
          email: string
          expires_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          created_by: string
          email: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_response_language: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_types: string[] | null
          funding_needs: string[] | null
          id: string
          logo_url: string | null
          members_count: number | null
          mission: string | null
          name: string
          onboarding_completed: boolean | null
          org_type: string | null
          preferred_languages: string[] | null
          primary_contact_user_id: string | null
          ui_language: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ai_response_language?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_types?: string[] | null
          funding_needs?: string[] | null
          id?: string
          logo_url?: string | null
          members_count?: number | null
          mission?: string | null
          name: string
          onboarding_completed?: boolean | null
          org_type?: string | null
          preferred_languages?: string[] | null
          primary_contact_user_id?: string | null
          ui_language?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ai_response_language?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_types?: string[] | null
          funding_needs?: string[] | null
          id?: string
          logo_url?: string | null
          members_count?: number | null
          mission?: string | null
          name?: string
          onboarding_completed?: boolean | null
          org_type?: string | null
          preferred_languages?: string[] | null
          primary_contact_user_id?: string | null
          ui_language?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      superadmin_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          created_at: string
          id: string
          prompt_template: string
          section_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string
          id?: string
          prompt_template: string
          section_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string
          id?: string
          prompt_template?: string
          section_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_preferences: Json | null
          created_at: string | null
          id: string
          notification_preferences: Json | null
          ui_preferences: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_preferences?: Json | null
          created_at?: string | null
          id?: string
          notification_preferences?: Json | null
          ui_preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_preferences?: Json | null
          created_at?: string | null
          id?: string
          notification_preferences?: Json | null
          ui_preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      admin_delete_organization: {
        Args: { org_id: string }
        Returns: undefined
      }
      archive_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      cleanup_duplicate_user_roles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_data?: Json
          p_expires_at?: string
          p_message: string
          p_organization_id: string
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      ensure_organization_integrity: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_model_usage_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_models: number
          deprecated_models: number
          most_used_model: string
          provider: string
          total_models: number
          total_usage_count: number
        }[]
      }
      get_notification_count: {
        Args: { p_user_id: string }
        Returns: {
          total: number
          unread: number
          urgent: number
        }[]
      }
      get_organization_knowledge_for_ai: {
        Args: {
          p_ai_function?: string
          p_limit?: number
          p_organization_id: string
          p_section_name?: string
        }
        Returns: {
          content: string
          document_type: string
          id: string
          relevance_score: number
          tags: string[]
          title: string
          usage_count: number
        }[]
      }
      get_organization_model_usage: {
        Args: { p_organization_id: string }
        Returns: {
          last_used: string
          model: string
          provider: string
          section_name: string
          usage_count: number
        }[]
      }
      get_user_notifications: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_unread_only?: boolean
          p_user_id: string
        }
        Returns: {
          created_at: string
          data: Json
          expires_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          title: string
          type: string
        }[]
      }
      get_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: {
          organization_id: string
        }[]
      }
      log_rls_violation: {
        Args: {
          p_data?: Json
          p_operation: string
          p_table_name: string
          p_user_id?: string
        }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      track_knowledge_usage: {
        Args: {
          p_ai_function: string
          p_knowledge_base_id: string
          p_organization_id: string
          p_section_name?: string
          p_user_id: string
        }
        Returns: undefined
      }
      track_model_usage: {
        Args: {
          p_model: string
          p_organization_id: string
          p_provider: string
          p_section_name?: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_belongs_to_organization: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      validate_user_session: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "member", "viewer", "superadmin"],
    },
  },
} as const
