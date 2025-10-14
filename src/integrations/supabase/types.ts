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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          id: string
          meta: Json | null
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          id?: string
          meta?: Json | null
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          meta?: Json | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table: string
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      advisors: {
        Row: {
          activity_regions: string[] | null
          admin_approved: boolean
          approved_at: string | null
          approved_by: string | null
          availability_status: string | null
          certifications: string[] | null
          company_id: string | null
          company_name: string | null
          cover_image_url: string | null
          created_at: string
          expertise: string[] | null
          facebook_url: string | null
          founding_year: number | null
          id: string
          instagram_url: string | null
          is_active: boolean | null
          linkedin_url: string | null
          location: string | null
          logo_url: string | null
          office_phone: string | null
          office_size: string | null
          position_in_office: string | null
          rating: number | null
          specialties: string[] | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          activity_regions?: string[] | null
          admin_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          availability_status?: string | null
          certifications?: string[] | null
          company_id?: string | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          expertise?: string[] | null
          facebook_url?: string | null
          founding_year?: number | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          logo_url?: string | null
          office_phone?: string | null
          office_size?: string | null
          position_in_office?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          activity_regions?: string[] | null
          admin_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          availability_status?: string | null
          certifications?: string[] | null
          company_id?: string | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          expertise?: string[] | null
          facebook_url?: string | null
          founding_year?: number | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          logo_url?: string | null
          office_phone?: string | null
          office_size?: string | null
          position_in_office?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          id: string
          joined_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_approved: boolean
          approved_at: string | null
          approved_by: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          ai_summary: string | null
          created_at: string
          custom_name: string | null
          description: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          project_id: string
          size_mb: number
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          custom_name?: string | null
          description?: string | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          project_id: string
          size_mb: number
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          custom_name?: string | null
          description?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          project_id?: string
          size_mb?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          advisors_budget: number | null
          archived: boolean | null
          awaiting_banner_until: string | null
          budget: number | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          owner_id: string
          phase: string | null
          status: string
          timeline_end: string
          timeline_start: string
          type: string | null
          updated_at: string
        }
        Insert: {
          advisors_budget?: number | null
          archived?: boolean | null
          awaiting_banner_until?: string | null
          budget?: number | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          owner_id: string
          phase?: string | null
          status?: string
          timeline_end: string
          timeline_start: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          advisors_budget?: number | null
          archived?: boolean | null
          awaiting_banner_until?: string | null
          budget?: number | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          owner_id?: string
          phase?: string | null
          status?: string
          timeline_end?: string
          timeline_start?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          advisor_id: string | null
          ai_flags: Json | null
          attachment_url: string | null
          id: string
          price: number
          project_id: string
          status: string
          submit_token: string | null
          submitted_at: string
          supplier_id: string | null
          supplier_name: string
          terms: string | null
          timeline_days: number
          token_used_at: string | null
        }
        Insert: {
          advisor_id?: string | null
          ai_flags?: Json | null
          attachment_url?: string | null
          id?: string
          price: number
          project_id: string
          status?: string
          submit_token?: string | null
          submitted_at?: string
          supplier_id?: string | null
          supplier_name: string
          terms?: string | null
          timeline_days: number
          token_used_at?: string | null
        }
        Update: {
          advisor_id?: string | null
          ai_flags?: Json | null
          attachment_url?: string | null
          id?: string
          price?: number
          project_id?: string
          status?: string
          submit_token?: string | null
          submitted_at?: string
          supplier_id?: string | null
          supplier_name?: string
          terms?: string | null
          timeline_days?: number
          token_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          confidence: number
          created_at: string
          id: string
          match_score: number
          project_id: string
          reason: string
          status: string
          supplier_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          match_score: number
          project_id: string
          reason: string
          status?: string
          supplier_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          match_score?: number
          project_id?: string
          reason?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_invites: {
        Row: {
          advisor_id: string | null
          created_at: string
          delivered_at: string | null
          email: string
          id: string
          opened_at: string | null
          rfp_id: string
          status: string
          submit_token: string
          supplier_id: string | null
        }
        Insert: {
          advisor_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          id?: string
          opened_at?: string | null
          rfp_id: string
          status?: string
          submit_token: string
          supplier_id?: string | null
        }
        Update: {
          advisor_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          id?: string
          opened_at?: string | null
          rfp_id?: string
          status?: string
          submit_token?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_invites_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_invites_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_invites_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfps: {
        Row: {
          body_html: string
          id: string
          project_id: string
          sent_at: string
          sent_by: string
          subject: string
        }
        Insert: {
          body_html: string
          id?: string
          project_id: string
          sent_at?: string
          sent_by: string
          subject: string
        }
        Update: {
          body_html?: string
          id?: string
          project_id?: string
          sent_at?: string
          sent_by?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          certifications: string[] | null
          created_at: string
          email: string | null
          expertise: string[] | null
          field: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          past_projects: string[] | null
          phone: string | null
          rating: number | null
          region: string | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          expertise?: string[] | null
          field?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          past_projects?: string[] | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          expertise?: string[] | null
          field?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          past_projects?: string[] | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_project_recommendations: {
        Args: { project_uuid: string }
        Returns: {
          confidence: number
          match_score: number
          reason: string
          supplier_id: string
          supplier_name: string
        }[]
      }
      get_user_profile: {
        Args: { user_uuid?: string }
        Returns: {
          company_name: string
          created_at: string
          id: string
          name: string
          phone: string
          role: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_owner: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      normalize_project_type: {
        Args: { legacy_type: string }
        Returns: string
      }
      send_rfp_invitations: {
        Args: { project_uuid: string; selected_supplier_ids?: string[] }
        Returns: {
          invites_sent: number
          rfp_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "entrepreneur" | "advisor" | "supplier"
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
      app_role: ["admin", "entrepreneur", "advisor", "supplier"],
    },
  },
} as const
