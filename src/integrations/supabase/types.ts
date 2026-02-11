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
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          meta: Json | null
          project_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          meta?: Json | null
          project_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          meta?: Json | null
          project_id?: string | null
          user_agent?: string | null
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
      advisor_team_members: {
        Row: {
          advisor_id: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          notification_preferences: string[]
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          notification_preferences?: string[]
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notification_preferences?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_team_members_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
        ]
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
      bulk_negotiation_batches: {
        Row: {
          created_at: string
          id: string
          initiator_id: string
          message: string | null
          project_id: string
          reduction_type: string
          reduction_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_id: string
          message?: string | null
          project_id: string
          reduction_type: string
          reduction_value: number
        }
        Update: {
          created_at?: string
          id?: string
          initiator_id?: string
          message?: string | null
          project_id?: string
          reduction_type?: string
          reduction_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_negotiation_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_negotiation_members: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          proposal_id: string
          session_id: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          proposal_id: string
          session_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          proposal_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_negotiation_members_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bulk_negotiation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_negotiation_members_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_negotiation_members_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_negotiation_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "negotiation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          activity_categories: Json | null
          activity_regions: string[] | null
          activity_scope: string | null
          activity_scope_tier: string | null
          allowed_currencies: string[] | null
          country: string | null
          created_at: string
          default_currency: string | null
          description: string | null
          email: string | null
          employee_count: string | null
          founding_year: number | null
          id: string
          linkedin_url: string | null
          location: string | null
          name: string
          onboarding_completed_at: string | null
          onboarding_skipped_at: string | null
          payment_terms_policy: Json | null
          phone: string | null
          primary_activity_category: string | null
          procurement_rules: Json | null
          registration_number: string | null
          required_contract_clauses: string[] | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          activity_categories?: Json | null
          activity_regions?: string[] | null
          activity_scope?: string | null
          activity_scope_tier?: string | null
          allowed_currencies?: string[] | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          description?: string | null
          email?: string | null
          employee_count?: string | null
          founding_year?: number | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name: string
          onboarding_completed_at?: string | null
          onboarding_skipped_at?: string | null
          payment_terms_policy?: Json | null
          phone?: string | null
          primary_activity_category?: string | null
          procurement_rules?: Json | null
          registration_number?: string | null
          required_contract_clauses?: string[] | null
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          activity_categories?: Json | null
          activity_regions?: string[] | null
          activity_scope?: string | null
          activity_scope_tier?: string | null
          allowed_currencies?: string[] | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          description?: string | null
          email?: string | null
          employee_count?: string | null
          founding_year?: number | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name?: string
          onboarding_completed_at?: string | null
          onboarding_skipped_at?: string | null
          payment_terms_policy?: Json | null
          phone?: string | null
          primary_activity_category?: string | null
          procurement_rules?: Json | null
          registration_number?: string | null
          required_contract_clauses?: string[] | null
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
      default_fee_item_templates: {
        Row: {
          advisor_specialty: string
          category_id: string | null
          charge_type: string | null
          created_at: string | null
          created_by_user_id: string | null
          default_quantity: number | null
          description: string
          display_order: number
          id: string
          is_optional: boolean | null
          is_user_template: boolean | null
          project_type: string | null
          submission_method_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          advisor_specialty: string
          category_id?: string | null
          charge_type?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          default_quantity?: number | null
          description: string
          display_order?: number
          id?: string
          is_optional?: boolean | null
          is_user_template?: boolean | null
          project_type?: string | null
          submission_method_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          advisor_specialty?: string
          category_id?: string | null
          charge_type?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          default_quantity?: number | null
          description?: string
          display_order?: number
          id?: string
          is_optional?: boolean | null
          is_user_template?: boolean | null
          project_type?: string | null
          submission_method_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "default_fee_item_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_template_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "default_fee_item_templates_submission_method_id_fkey"
            columns: ["submission_method_id"]
            isOneToOne: false
            referencedRelation: "fee_submission_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      default_service_scope_templates: {
        Row: {
          advisor_specialty: string
          category_id: string | null
          created_at: string | null
          created_by: string | null
          default_fee_category: string | null
          display_order: number
          id: string
          is_optional: boolean | null
          project_type: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          advisor_specialty: string
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_fee_category?: string | null
          display_order?: number
          id?: string
          is_optional?: boolean | null
          project_type?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          advisor_specialty?: string
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_fee_category?: string | null
          display_order?: number
          id?: string
          is_optional?: boolean | null
          project_type?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "default_service_scope_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_submission_methods: {
        Row: {
          category_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          method_label: string
          method_type: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          method_label: string
          method_type: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          method_label?: string
          method_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_submission_methods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_template_categories: {
        Row: {
          advisor_specialty: string
          created_at: string | null
          default_index_type: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          project_type: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_specialty: string
          created_at?: string | null
          default_index_type?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          project_type?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_specialty?: string
          created_at?: string | null
          default_index_type?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          project_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      licensing_phases: {
        Row: {
          created_at: string | null
          default_duration_days: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          municipality_id: string | null
          name: string
          project_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_duration_days?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          municipality_id?: string | null
          name: string
          project_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_duration_days?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          municipality_id?: string | null
          name?: string
          project_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licensing_phases_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      line_item_negotiations: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          consultant_note: string | null
          consultant_response_price: number | null
          created_at: string
          final_price: number | null
          id: string
          initiator_note: string | null
          initiator_target_price: number
          line_item_id: string
          original_price: number
          session_id: string
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          adjustment_value: number
          consultant_note?: string | null
          consultant_response_price?: number | null
          created_at?: string
          final_price?: number | null
          id?: string
          initiator_note?: string | null
          initiator_target_price: number
          line_item_id: string
          original_price: number
          session_id: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          consultant_note?: string | null
          consultant_response_price?: number | null
          created_at?: string
          final_price?: number | null
          id?: string
          initiator_note?: string | null
          initiator_target_price?: number
          line_item_id?: string
          original_price?: number
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_item_negotiations_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_item_negotiations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "negotiation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_links: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          metadata: Json | null
          purpose: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          metadata?: Json | null
          purpose: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          purpose?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      milestone_template_tasks: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_critical: boolean
          milestone_template_id: string
          task_template_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_critical?: boolean
          milestone_template_id: string
          task_template_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_critical?: boolean
          milestone_template_id?: string
          task_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_template_tasks_milestone_template_id_fkey"
            columns: ["milestone_template_id"]
            isOneToOne: false
            referencedRelation: "milestone_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_template_tasks_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_templates: {
        Row: {
          advisor_specialty: string | null
          category_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          display_order: number
          fixed_amount: number | null
          id: string
          is_active: boolean
          is_system: boolean
          municipality_id: string | null
          name: string
          name_en: string | null
          percentage_of_total: number
          project_type: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          advisor_specialty?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          display_order?: number
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          municipality_id?: string | null
          name: string
          name_en?: string | null
          percentage_of_total: number
          project_type?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          advisor_specialty?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          display_order?: number
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          municipality_id?: string | null
          name?: string
          name_en?: string | null
          percentage_of_total?: number
          project_type?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_template_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_templates_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          created_at: string | null
          has_special_requirements: boolean | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          region: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          has_special_requirements?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          has_special_requirements?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      negotiation_comments: {
        Row: {
          author_id: string
          author_type: string
          comment_type: string
          content: string
          created_at: string
          entity_reference: string | null
          id: string
          session_id: string
        }
        Insert: {
          author_id: string
          author_type: string
          comment_type: string
          content: string
          created_at?: string
          entity_reference?: string | null
          id?: string
          session_id: string
        }
        Update: {
          author_id?: string
          author_type?: string
          comment_type?: string
          content?: string
          created_at?: string
          entity_reference?: string | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "negotiation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_files: {
        Row: {
          file_size: number
          id: string
          mime_type: string | null
          original_name: string
          proposal_id: string
          session_id: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          used_at: string | null
        }
        Insert: {
          file_size?: number
          id?: string
          mime_type?: string | null
          original_name: string
          proposal_id: string
          session_id?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          used_at?: string | null
        }
        Update: {
          file_size?: number
          id?: string
          mime_type?: string | null
          original_name?: string
          proposal_id?: string
          session_id?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_files_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_files_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "negotiation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_sessions: {
        Row: {
          bulk_batch_id: string | null
          consultant_advisor_id: string
          consultant_response_message: string | null
          created_at: string
          files: Json | null
          global_comment: string | null
          id: string
          initiator_id: string
          initiator_message: string | null
          milestone_adjustments: Json | null
          negotiated_version_id: string | null
          project_id: string
          proposal_id: string
          resolved_at: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["negotiation_status"]
          target_reduction_percent: number | null
          target_total: number | null
          updated_at: string
        }
        Insert: {
          bulk_batch_id?: string | null
          consultant_advisor_id: string
          consultant_response_message?: string | null
          created_at?: string
          files?: Json | null
          global_comment?: string | null
          id?: string
          initiator_id: string
          initiator_message?: string | null
          milestone_adjustments?: Json | null
          negotiated_version_id?: string | null
          project_id: string
          proposal_id: string
          resolved_at?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["negotiation_status"]
          target_reduction_percent?: number | null
          target_total?: number | null
          updated_at?: string
        }
        Update: {
          bulk_batch_id?: string | null
          consultant_advisor_id?: string
          consultant_response_message?: string | null
          created_at?: string
          files?: Json | null
          global_comment?: string | null
          id?: string
          initiator_id?: string
          initiator_message?: string | null
          milestone_adjustments?: Json | null
          negotiated_version_id?: string | null
          project_id?: string
          proposal_id?: string
          resolved_at?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["negotiation_status"]
          target_reduction_percent?: number | null
          target_total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_sessions_bulk_batch_id_fkey"
            columns: ["bulk_batch_id"]
            isOneToOne: false
            referencedRelation: "bulk_negotiation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_consultant_advisor_id_fkey"
            columns: ["consultant_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_negotiated_version_id_fkey"
            columns: ["negotiated_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number | null
          body_html: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number | null
          notification_type: string
          priority: number | null
          recipient_email: string
          recipient_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_data: Json | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          body_html: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number | null
          notification_type: string
          priority?: number | null
          recipient_email: string
          recipient_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          body_html?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number | null
          notification_type?: string
          priority?: number | null
          recipient_email?: string
          recipient_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_approval_chains: {
        Row: {
          after_status_code: string
          approver_role: string | null
          approver_user_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          notify_email: string | null
          notify_on_enter: boolean
          organization_id: string
          requires_signature: boolean
          signature_type: string | null
          updated_at: string
        }
        Insert: {
          after_status_code: string
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          notify_email?: string | null
          notify_on_enter?: boolean
          organization_id: string
          requires_signature?: boolean
          signature_type?: string | null
          updated_at?: string
        }
        Update: {
          after_status_code?: string
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          notify_email?: string | null
          notify_on_enter?: boolean
          organization_id?: string
          requires_signature?: boolean
          signature_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_approval_chains_after_status_code_fkey"
            columns: ["after_status_code"]
            isOneToOne: false
            referencedRelation: "payment_status_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "organization_approval_chains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_milestones: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          display_order: number | null
          due_date: string | null
          id: string
          name: string
          percentage_of_total: number | null
          project_advisor_id: string | null
          project_id: string
          status: string
          task_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          id?: string
          name: string
          percentage_of_total?: number | null
          project_advisor_id?: string | null
          project_id: string
          status?: string
          task_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          id?: string
          name?: string
          percentage_of_total?: number | null
          project_advisor_id?: string | null
          project_id?: string
          status?: string
          task_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_milestones_project_advisor_id_fkey"
            columns: ["project_advisor_id"]
            isOneToOne: false
            referencedRelation: "project_advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_milestones_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          approver_signature_id: string | null
          attachments: Json | null
          category: string
          created_at: string
          created_by: string | null
          currency: string
          external_party_id: string | null
          external_party_name: string | null
          id: string
          index_adjusted_amount: number | null
          index_adjustment_factor: number | null
          index_base_value: number | null
          index_current_value: number | null
          index_type: string | null
          invoice_file_url: string | null
          notes: string | null
          paid_at: string | null
          payment_milestone_id: string | null
          payment_reference: string | null
          project_advisor_id: string | null
          project_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_number: string | null
          source_type: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number | null
          updated_at: string
          vat_amount: number | null
          vat_percent: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          approver_signature_id?: string | null
          attachments?: Json | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          external_party_id?: string | null
          external_party_name?: string | null
          id?: string
          index_adjusted_amount?: number | null
          index_adjustment_factor?: number | null
          index_base_value?: number | null
          index_current_value?: number | null
          index_type?: string | null
          invoice_file_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_milestone_id?: string | null
          payment_reference?: string | null
          project_advisor_id?: string | null
          project_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          source_type?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          approver_signature_id?: string | null
          attachments?: Json | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          external_party_id?: string | null
          external_party_name?: string | null
          id?: string
          index_adjusted_amount?: number | null
          index_adjustment_factor?: number | null
          index_base_value?: number | null
          index_current_value?: number | null
          index_type?: string | null
          invoice_file_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_milestone_id?: string | null
          payment_reference?: string | null
          project_advisor_id?: string | null
          project_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          source_type?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_approver_signature_id_fkey"
            columns: ["approver_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_payment_milestone_id_fkey"
            columns: ["payment_milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_project_advisor_id_fkey"
            columns: ["project_advisor_id"]
            isOneToOne: false
            referencedRelation: "project_advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_status_definitions: {
        Row: {
          code: string
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          email_template_key: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          is_terminal: boolean
          name: string
          name_en: string | null
          notify_on_enter: boolean
          notify_roles: string[] | null
          requires_signature: boolean
          signature_type: string | null
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          email_template_key?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          is_terminal?: boolean
          name: string
          name_en?: string | null
          notify_on_enter?: boolean
          notify_roles?: string[] | null
          requires_signature?: boolean
          signature_type?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          email_template_key?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          is_terminal?: boolean
          name?: string
          name_en?: string | null
          notify_on_enter?: boolean
          notify_roles?: string[] | null
          requires_signature?: boolean
          signature_type?: string | null
          updated_at?: string
        }
        Relationships: []
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
          organization_id: string | null
          phone: string | null
          requires_password_change: boolean | null
          role: string | null
          tos_accepted_at: string | null
          tos_version: string | null
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
          organization_id?: string | null
          phone?: string | null
          requires_password_change?: boolean | null
          role?: string | null
          tos_accepted_at?: string | null
          tos_version?: string | null
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
          organization_id?: string | null
          phone?: string | null
          requires_password_change?: boolean | null
          role?: string | null
          tos_accepted_at?: string | null
          tos_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_advisors: {
        Row: {
          advisor_id: string
          advisor_type: string | null
          agreement_url: string | null
          created_at: string | null
          deliverables: string[] | null
          end_date: string | null
          fee_amount: number
          fee_currency: string | null
          fee_type: string
          id: string
          notes: string | null
          payment_terms: string | null
          project_id: string
          proposal_id: string | null
          scope_of_work: string | null
          selected_at: string | null
          selected_by: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          advisor_type?: string | null
          agreement_url?: string | null
          created_at?: string | null
          deliverables?: string[] | null
          end_date?: string | null
          fee_amount: number
          fee_currency?: string | null
          fee_type: string
          id?: string
          notes?: string | null
          payment_terms?: string | null
          project_id: string
          proposal_id?: string | null
          scope_of_work?: string | null
          selected_at?: string | null
          selected_by?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          advisor_type?: string | null
          agreement_url?: string | null
          created_at?: string | null
          deliverables?: string[] | null
          end_date?: string | null
          fee_amount?: number
          fee_currency?: string | null
          fee_type?: string
          id?: string
          notes?: string | null
          payment_terms?: string | null
          project_id?: string
          proposal_id?: string | null
          scope_of_work?: string | null
          selected_at?: string | null
          selected_by?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_advisors_advisor"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_advisors_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_advisors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_advisors_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_advisors_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
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
      project_licensing_stages: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          licensing_phase_id: string | null
          name: string
          planned_end_date: string | null
          planned_start_date: string | null
          progress_percent: number | null
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          licensing_phase_id?: string | null
          name: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          progress_percent?: number | null
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          licensing_phase_id?: string | null
          name?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          progress_percent?: number | null
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_licensing_stages_licensing_phase_id_fkey"
            columns: ["licensing_phase_id"]
            isOneToOne: false
            referencedRelation: "licensing_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_licensing_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_advisor_id: string | null
          assigned_user_id: string | null
          block_reason: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          duration_days: number | null
          hierarchy_level: number | null
          hierarchy_path: string | null
          id: string
          is_blocked: boolean | null
          is_milestone: boolean | null
          is_payment_critical: boolean | null
          name: string
          notes: string | null
          parent_task_id: string | null
          payment_milestone_id: string | null
          phase: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          progress_percent: number | null
          project_id: string
          stage_id: string | null
          status: string
          template_id: string | null
          updated_at: string
          wbs_code: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_advisor_id?: string | null
          assigned_user_id?: string | null
          block_reason?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_days?: number | null
          hierarchy_level?: number | null
          hierarchy_path?: string | null
          id?: string
          is_blocked?: boolean | null
          is_milestone?: boolean | null
          is_payment_critical?: boolean | null
          name: string
          notes?: string | null
          parent_task_id?: string | null
          payment_milestone_id?: string | null
          phase?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          progress_percent?: number | null
          project_id: string
          stage_id?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          wbs_code?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_advisor_id?: string | null
          assigned_user_id?: string | null
          block_reason?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_days?: number | null
          hierarchy_level?: number | null
          hierarchy_path?: string | null
          id?: string
          is_blocked?: boolean | null
          is_milestone?: boolean | null
          is_payment_critical?: boolean | null
          name?: string
          notes?: string | null
          parent_task_id?: string | null
          payment_milestone_id?: string | null
          phase?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          progress_percent?: number | null
          project_id?: string
          stage_id?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_advisor_id_fkey"
            columns: ["assigned_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_payment_milestone_id_fkey"
            columns: ["payment_milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_licensing_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
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
          is_large_scale: boolean | null
          location: string | null
          municipality_id: string | null
          name: string
          owner_id: string
          phase: string | null
          status: string
          timeline_end: string
          timeline_start: string
          type: string | null
          units: number | null
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
          is_large_scale?: boolean | null
          location?: string | null
          municipality_id?: string | null
          name: string
          owner_id: string
          phase?: string | null
          status?: string
          timeline_end: string
          timeline_start: string
          type?: string | null
          units?: number | null
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
          is_large_scale?: boolean | null
          location?: string | null
          municipality_id?: string | null
          name?: string
          owner_id?: string
          phase?: string | null
          status?: string
          timeline_end?: string
          timeline_start?: string
          type?: string | null
          units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_optional: boolean | null
          name: string
          proposal_id: string
          proposal_version_id: string | null
          quantity: number | null
          total: number
          unit_price: number
          updated_at: string
          version_number: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_optional?: boolean | null
          name: string
          proposal_id: string
          proposal_version_id?: string | null
          quantity?: number | null
          total: number
          unit_price: number
          updated_at?: string
          version_number?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_optional?: boolean | null
          name?: string
          proposal_id?: string
          proposal_version_id?: string | null
          quantity?: number | null
          total?: number
          unit_price?: number
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_proposal_version_id_fkey"
            columns: ["proposal_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          change_reason: string | null
          conditions_json: Json | null
          created_at: string
          created_by: string | null
          fee_line_items: Json | null
          id: string
          line_items: Json | null
          milestone_adjustments: Json | null
          price: number
          proposal_id: string
          scope_text: string | null
          terms: string | null
          timeline_days: number
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          conditions_json?: Json | null
          created_at?: string
          created_by?: string | null
          fee_line_items?: Json | null
          id?: string
          line_items?: Json | null
          milestone_adjustments?: Json | null
          price: number
          proposal_id: string
          scope_text?: string | null
          terms?: string | null
          timeline_days: number
          version_number?: number
        }
        Update: {
          change_reason?: string | null
          conditions_json?: Json | null
          created_at?: string
          created_by?: string | null
          fee_line_items?: Json | null
          id?: string
          line_items?: Json | null
          milestone_adjustments?: Json | null
          price?: number
          proposal_id?: string
          scope_text?: string | null
          terms?: string | null
          timeline_days?: number
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          advisor_id: string
          advisor_notified_at: string | null
          ai_analysis: string | null
          ai_analysis_generated_at: string | null
          ai_flags: Json | null
          amended_from_id: string | null
          attachment_url: string | null
          conditions_json: Json | null
          consultant_request_files: Json | null
          consultant_request_notes: string | null
          currency: string | null
          current_version: number | null
          declaration_text: string | null
          entrepreneur_notified_at: string | null
          evaluation_completed_at: string | null
          evaluation_error: string | null
          evaluation_metadata: Json | null
          evaluation_rank: number | null
          evaluation_result: Json | null
          evaluation_score: number | null
          evaluation_status: string | null
          extracted_at: string | null
          extracted_text: string | null
          extracted_text_hash: string | null
          fee_line_items: Json | null
          file_summaries: Json | null
          files: Json | null
          has_active_negotiation: boolean | null
          id: string
          milestone_adjustments: Json | null
          negotiation_count: number | null
          price: number
          project_id: string
          rfp_invite_id: string | null
          scope_text: string | null
          seen_by_entrepreneur_at: string | null
          selected_services: Json | null
          services_notes: string | null
          signature_blob: string | null
          signature_meta_json: Json | null
          status: Database["public"]["Enums"]["proposal_status"]
          submit_token: string | null
          submitted_at: string
          supplier_id: string | null
          supplier_name: string
          terms: string | null
          timeline_days: number
          token_used_at: string | null
          version: number | null
        }
        Insert: {
          advisor_id: string
          advisor_notified_at?: string | null
          ai_analysis?: string | null
          ai_analysis_generated_at?: string | null
          ai_flags?: Json | null
          amended_from_id?: string | null
          attachment_url?: string | null
          conditions_json?: Json | null
          consultant_request_files?: Json | null
          consultant_request_notes?: string | null
          currency?: string | null
          current_version?: number | null
          declaration_text?: string | null
          entrepreneur_notified_at?: string | null
          evaluation_completed_at?: string | null
          evaluation_error?: string | null
          evaluation_metadata?: Json | null
          evaluation_rank?: number | null
          evaluation_result?: Json | null
          evaluation_score?: number | null
          evaluation_status?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          extracted_text_hash?: string | null
          fee_line_items?: Json | null
          file_summaries?: Json | null
          files?: Json | null
          has_active_negotiation?: boolean | null
          id?: string
          milestone_adjustments?: Json | null
          negotiation_count?: number | null
          price: number
          project_id: string
          rfp_invite_id?: string | null
          scope_text?: string | null
          seen_by_entrepreneur_at?: string | null
          selected_services?: Json | null
          services_notes?: string | null
          signature_blob?: string | null
          signature_meta_json?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submit_token?: string | null
          submitted_at?: string
          supplier_id?: string | null
          supplier_name: string
          terms?: string | null
          timeline_days: number
          token_used_at?: string | null
          version?: number | null
        }
        Update: {
          advisor_id?: string
          advisor_notified_at?: string | null
          ai_analysis?: string | null
          ai_analysis_generated_at?: string | null
          ai_flags?: Json | null
          amended_from_id?: string | null
          attachment_url?: string | null
          conditions_json?: Json | null
          consultant_request_files?: Json | null
          consultant_request_notes?: string | null
          currency?: string | null
          current_version?: number | null
          declaration_text?: string | null
          entrepreneur_notified_at?: string | null
          evaluation_completed_at?: string | null
          evaluation_error?: string | null
          evaluation_metadata?: Json | null
          evaluation_rank?: number | null
          evaluation_result?: Json | null
          evaluation_score?: number | null
          evaluation_status?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          extracted_text_hash?: string | null
          fee_line_items?: Json | null
          file_summaries?: Json | null
          files?: Json | null
          has_active_negotiation?: boolean | null
          id?: string
          milestone_adjustments?: Json | null
          negotiation_count?: number | null
          price?: number
          project_id?: string
          rfp_invite_id?: string | null
          scope_text?: string | null
          seen_by_entrepreneur_at?: string | null
          selected_services?: Json | null
          services_notes?: string | null
          signature_blob?: string | null
          signature_meta_json?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submit_token?: string | null
          submitted_at?: string
          supplier_id?: string | null
          supplier_name?: string
          terms?: string | null
          timeline_days?: number
          token_used_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_proposals_advisor"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_amended_from_id_fkey"
            columns: ["amended_from_id"]
            isOneToOne: false
            referencedRelation: "proposal_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_amended_from_id_fkey"
            columns: ["amended_from_id"]
            isOneToOne: false
            referencedRelation: "proposals"
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
            foreignKeyName: "proposals_rfp_invite_id_fkey"
            columns: ["rfp_invite_id"]
            isOneToOne: false
            referencedRelation: "rfp_invites"
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
          advisor_type: string | null
          created_at: string
          deadline_at: string | null
          decline_note: string | null
          decline_reason:
            | Database["public"]["Enums"]["decline_reason_type"]
            | null
          delivered_at: string | null
          email: string
          email_attempts: number | null
          email_last_attempt_at: string | null
          email_last_error: string | null
          id: string
          last_notification_at: string | null
          opened_at: string | null
          payment_terms: Json | null
          personalized_body_html: string | null
          reminder_stage: number | null
          request_content: string | null
          request_files: Json | null
          request_title: string | null
          rfp_id: string
          service_details_file: Json | null
          service_details_mode: string | null
          service_details_text: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["rfp_invite_status"]
          submit_token: string
          supplier_id: string | null
          token_used_at: string | null
        }
        Insert: {
          advisor_id?: string | null
          advisor_type?: string | null
          created_at?: string
          deadline_at?: string | null
          decline_note?: string | null
          decline_reason?:
            | Database["public"]["Enums"]["decline_reason_type"]
            | null
          delivered_at?: string | null
          email: string
          email_attempts?: number | null
          email_last_attempt_at?: string | null
          email_last_error?: string | null
          id?: string
          last_notification_at?: string | null
          opened_at?: string | null
          payment_terms?: Json | null
          personalized_body_html?: string | null
          reminder_stage?: number | null
          request_content?: string | null
          request_files?: Json | null
          request_title?: string | null
          rfp_id: string
          service_details_file?: Json | null
          service_details_mode?: string | null
          service_details_text?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["rfp_invite_status"]
          submit_token: string
          supplier_id?: string | null
          token_used_at?: string | null
        }
        Update: {
          advisor_id?: string | null
          advisor_type?: string | null
          created_at?: string
          deadline_at?: string | null
          decline_note?: string | null
          decline_reason?:
            | Database["public"]["Enums"]["decline_reason_type"]
            | null
          delivered_at?: string | null
          email?: string
          email_attempts?: number | null
          email_last_attempt_at?: string | null
          email_last_error?: string | null
          id?: string
          last_notification_at?: string | null
          opened_at?: string | null
          payment_terms?: Json | null
          personalized_body_html?: string | null
          reminder_stage?: number | null
          request_content?: string | null
          request_files?: Json | null
          request_title?: string | null
          rfp_id?: string
          service_details_file?: Json | null
          service_details_mode?: string | null
          service_details_text?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["rfp_invite_status"]
          submit_token?: string
          supplier_id?: string | null
          token_used_at?: string | null
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
      rfp_request_drafts: {
        Row: {
          advisor_type: string
          created_at: string | null
          fee_items: Json | null
          has_been_reviewed: boolean | null
          id: string
          optional_fee_items: Json | null
          payment_terms: Json | null
          project_id: string
          request_attachments: Json | null
          request_content: string | null
          request_title: string | null
          service_details_file: Json | null
          service_details_free_text: string | null
          service_details_mode: string | null
          service_scope_items: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advisor_type: string
          created_at?: string | null
          fee_items?: Json | null
          has_been_reviewed?: boolean | null
          id?: string
          optional_fee_items?: Json | null
          payment_terms?: Json | null
          project_id: string
          request_attachments?: Json | null
          request_content?: string | null
          request_title?: string | null
          service_details_file?: Json | null
          service_details_free_text?: string | null
          service_details_mode?: string | null
          service_scope_items?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advisor_type?: string
          created_at?: string | null
          fee_items?: Json | null
          has_been_reviewed?: boolean | null
          id?: string
          optional_fee_items?: Json | null
          payment_terms?: Json | null
          project_id?: string
          request_attachments?: Json | null
          request_content?: string | null
          request_title?: string | null
          service_details_file?: Json | null
          service_details_free_text?: string | null
          service_details_mode?: string | null
          service_scope_items?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_request_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_request_fee_items: {
        Row: {
          charge_type: string | null
          created_at: string | null
          description: string
          display_order: number
          duration: number | null
          duration_unit: string | null
          id: string
          is_optional: boolean | null
          item_number: number
          quantity: number | null
          rfp_invite_id: string | null
          unit: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          charge_type?: string | null
          created_at?: string | null
          description: string
          display_order?: number
          duration?: number | null
          duration_unit?: string | null
          id?: string
          is_optional?: boolean | null
          item_number: number
          quantity?: number | null
          rfp_invite_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          charge_type?: string | null
          created_at?: string | null
          description?: string
          display_order?: number
          duration?: number | null
          duration_unit?: string | null
          id?: string
          is_optional?: boolean | null
          item_number?: number
          quantity?: number | null
          rfp_invite_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_request_fee_items_rfp_invite_id_fkey"
            columns: ["rfp_invite_id"]
            isOneToOne: false
            referencedRelation: "rfp_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_service_scope_items: {
        Row: {
          created_at: string | null
          display_order: number
          fee_category: string | null
          id: string
          is_included: boolean | null
          is_optional: boolean | null
          rfp_invite_id: string | null
          task_name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          fee_category?: string | null
          id?: string
          is_included?: boolean | null
          is_optional?: boolean | null
          rfp_invite_id?: string | null
          task_name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number
          fee_category?: string | null
          id?: string
          is_included?: boolean | null
          is_optional?: boolean | null
          rfp_invite_id?: string | null
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_service_scope_items_rfp_invite_id_fkey"
            columns: ["rfp_invite_id"]
            isOneToOne: false
            referencedRelation: "rfp_invites"
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
          status: string | null
          subject: string
        }
        Insert: {
          body_html: string
          id?: string
          project_id: string
          sent_at?: string
          sent_by: string
          status?: string | null
          subject: string
        }
        Update: {
          body_html?: string
          id?: string
          project_id?: string
          sent_at?: string
          sent_by?: string
          status?: string | null
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
      signatures: {
        Row: {
          content_hash: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          sign_png: string
          sign_text: string
          sign_vector_json: Json
          signed_at: string
          signer_email_snapshot: string
          signer_ip: string | null
          signer_name_snapshot: string
          signer_user_id: string
          user_agent: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          sign_png: string
          sign_text: string
          sign_vector_json: Json
          signed_at?: string
          signer_email_snapshot: string
          signer_ip?: string | null
          signer_name_snapshot: string
          signer_user_id: string
          user_agent?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          sign_png?: string
          sign_text?: string
          sign_vector_json?: Json
          signed_at?: string
          signer_email_snapshot?: string
          signer_ip?: string | null
          signer_name_snapshot?: string
          signer_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
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
      task_comments: {
        Row: {
          author_id: string
          author_name: string
          author_role: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          author_name?: string
          author_role?: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on_task_id: string
          id: string
          lag_days: number | null
          task_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          lag_days?: number | null
          task_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          lag_days?: number | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          file_size: number | null
          id: string
          mime_type: string | null
          original_name: string
          storage_path: string
          task_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_name: string
          storage_path: string
          task_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string
          storage_path?: string
          task_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          advisor_specialty: string | null
          created_at: string
          created_by_user_id: string | null
          default_duration_days: number | null
          depends_on_template_id: string | null
          description: string | null
          display_order: number | null
          hierarchy_level: number | null
          hierarchy_path: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_milestone: boolean | null
          is_user_template: boolean | null
          licensing_phase_id: string | null
          municipality_id: string | null
          name: string
          parent_template_id: string | null
          phase: string | null
          project_type: string
          template_group_id: string | null
          updated_at: string
          wbs_code: string | null
        }
        Insert: {
          advisor_specialty?: string | null
          created_at?: string
          created_by_user_id?: string | null
          default_duration_days?: number | null
          depends_on_template_id?: string | null
          description?: string | null
          display_order?: number | null
          hierarchy_level?: number | null
          hierarchy_path?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_milestone?: boolean | null
          is_user_template?: boolean | null
          licensing_phase_id?: string | null
          municipality_id?: string | null
          name: string
          parent_template_id?: string | null
          phase?: string | null
          project_type: string
          template_group_id?: string | null
          updated_at?: string
          wbs_code?: string | null
        }
        Update: {
          advisor_specialty?: string | null
          created_at?: string
          created_by_user_id?: string | null
          default_duration_days?: number | null
          depends_on_template_id?: string | null
          description?: string | null
          display_order?: number | null
          hierarchy_level?: number | null
          hierarchy_path?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_milestone?: boolean | null
          is_user_template?: boolean | null
          licensing_phase_id?: string | null
          municipality_id?: string | null
          name?: string
          parent_template_id?: string | null
          phase?: string | null
          project_type?: string
          template_group_id?: string | null
          updated_at?: string
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_depends_on_template_id_fkey"
            columns: ["depends_on_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_licensing_phase_id_fkey"
            columns: ["licensing_phase_id"]
            isOneToOne: false
            referencedRelation: "licensing_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string
          depends_on_template_id: string
          id: string
          lag_days: number | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string
          depends_on_template_id: string
          id?: string
          lag_days?: number | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string
          depends_on_template_id?: string
          id?: string
          lag_days?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_dependencies_depends_on_template_id_fkey"
            columns: ["depends_on_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_dependencies_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          page_url: string | null
          phone: string | null
          rating: number
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          page_url?: string | null
          phone?: string | null
          rating: number
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          page_url?: string | null
          phone?: string | null
          rating?: number
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      proposal_summary: {
        Row: {
          advisor_company: string | null
          advisor_email: string | null
          advisor_id: string | null
          advisor_name: string | null
          file_count: number | null
          id: string | null
          price: number | null
          project_id: string | null
          project_name: string | null
          project_type: string | null
          status: Database["public"]["Enums"]["proposal_status"] | null
          submitted_at: string | null
          timeline_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_proposals_advisor"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
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
        ]
      }
    }
    Functions: {
      approve_proposal_atomic: {
        Args: {
          p_content_hash: string
          p_entrepreneur_notes: string
          p_proposal_id: string
          p_signature_png: string
          p_signature_vector: Json
        }
        Returns: Json
      }
      approve_proposal_with_negotiation_cleanup: {
        Args: {
          p_content_hash?: string
          p_entrepreneur_notes?: string
          p_proposal_id: string
          p_signature_png?: string
          p_signature_vector?: Json
        }
        Returns: Json
      }
      can_access_proposal_file: {
        Args: { file_path: string; user_uuid: string }
        Returns: boolean
      }
      canonicalize_advisor_name: { Args: { name: string }; Returns: string }
      create_organization_for_user: {
        Args: {
          p_activity_categories?: Json
          p_activity_regions?: string[]
          p_activity_scope?: string
          p_activity_scope_tier?: string
          p_country?: string
          p_description?: string
          p_email?: string
          p_employee_count?: string
          p_founding_year?: number
          p_linkedin_url?: string
          p_location?: string
          p_name: string
          p_onboarding_completed_at?: string
          p_onboarding_skipped_at?: string
          p_phone?: string
          p_primary_activity_category?: string
          p_registration_number?: string
          p_type?: string
          p_website?: string
        }
        Returns: Json
      }
      enqueue_notification: {
        Args: {
          p_body_html: string
          p_entity_id?: string
          p_entity_type?: string
          p_notification_type: string
          p_priority?: number
          p_recipient_email: string
          p_recipient_id: string
          p_scheduled_for?: string
          p_subject: string
          p_template_data?: Json
        }
        Returns: string
      }
      expire_old_rfp_invites: { Args: never; Returns: undefined }
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
      get_advisor_id_for_user: { Args: { _user_id: string }; Returns: string }
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
      is_advisor_assigned_to_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      is_advisor_invited_to_entrepreneur: {
        Args: { _advisor_user_id: string; _entrepreneur_user_id: string }
        Returns: boolean
      }
      is_advisor_invited_to_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_invite_visible_to_advisor: {
        Args: { _invite_id: string; _user_id: string }
        Returns: boolean
      }
      is_invite_visible_to_entrepreneur: {
        Args: { _invite_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owned_by_user: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
      is_rfp_sent_by_user: {
        Args: { _rfp_id: string; _user_id: string }
        Returns: boolean
      }
      is_task_project_owner: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_advisor: { Args: { _user_id: string }; Returns: boolean }
      is_user_entrepreneur: { Args: { _user_id: string }; Returns: boolean }
      is_user_invited_to_rfp: {
        Args: { _rfp_id: string; _user_id: string }
        Returns: boolean
      }
      normalize_project_type: { Args: { legacy_type: string }; Returns: string }
      refresh_proposal_summary: { Args: never; Returns: undefined }
      reject_proposal_with_cleanup: {
        Args: {
          p_owner_id?: string
          p_proposal_id: string
          p_rejection_reason?: string
        }
        Returns: Json
      }
      send_rfp_invitations:
        | {
            Args: { project_uuid: string; selected_supplier_ids?: string[] }
            Returns: {
              invites_sent: number
              rfp_id: string
            }[]
          }
        | {
            Args: {
              email_body_html?: string
              email_subject?: string
              project_uuid: string
              selected_supplier_ids?: string[]
            }
            Returns: {
              invites_sent: number
              rfp_id: string
            }[]
          }
      send_rfp_invitations_to_advisors:
        | {
            Args: {
              advisor_type_pairs: Json
              deadline_hours?: number
              email_body_html?: string
              email_subject?: string
              project_uuid: string
            }
            Returns: {
              result_invites_sent: number
              result_rfp_id: string
            }[]
          }
        | {
            Args: {
              advisor_type_pairs: Json
              deadline_hours?: number
              email_body_html?: string
              email_subject?: string
              project_uuid: string
              request_content?: string
              request_files?: Json
              request_title?: string
            }
            Returns: {
              result_invites_sent: number
              result_rfp_id: string
            }[]
          }
      submit_negotiation_response: {
        Args: {
          p_consultant_message?: string
          p_files?: Json
          p_milestone_adjustments?: Json
          p_session_id: string
          p_updated_line_items?: Json
        }
        Returns: Json
      }
      use_magic_link: { Args: { p_token: string }; Returns: Json }
      user_has_task_access: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      validate_magic_link: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "entrepreneur" | "advisor" | "supplier"
      decline_reason_type:
        | "no_capacity"
        | "outside_expertise"
        | "timeline_conflict"
        | "budget_mismatch"
        | "other"
      negotiation_status:
        | "open"
        | "awaiting_response"
        | "responded"
        | "resolved"
        | "cancelled"
      proposal_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "negotiation_requested"
        | "resubmitted"
        | "accepted"
        | "rejected"
        | "withdrawn"
      rfp_invite_status:
        | "pending"
        | "sent"
        | "opened"
        | "in_progress"
        | "submitted"
        | "declined"
        | "expired"
        | "draft"
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
      decline_reason_type: [
        "no_capacity",
        "outside_expertise",
        "timeline_conflict",
        "budget_mismatch",
        "other",
      ],
      negotiation_status: [
        "open",
        "awaiting_response",
        "responded",
        "resolved",
        "cancelled",
      ],
      proposal_status: [
        "draft",
        "submitted",
        "under_review",
        "negotiation_requested",
        "resubmitted",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      rfp_invite_status: [
        "pending",
        "sent",
        "opened",
        "in_progress",
        "submitted",
        "declined",
        "expired",
        "draft",
      ],
    },
  },
} as const
