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
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          name: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
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
          id: string
          is_active: boolean
          location: string | null
          name: string
          past_projects: string[] | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          expertise?: string[] | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          past_projects?: string[] | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          expertise?: string[] | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          past_projects?: string[] | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
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
      send_rfp_invitations: {
        Args: { project_uuid: string; selected_supplier_ids?: string[] }
        Returns: {
          invites_sent: number
          rfp_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
