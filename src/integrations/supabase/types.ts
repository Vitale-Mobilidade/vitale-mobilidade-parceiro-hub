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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      bike_admin_audit: {
        Row: {
          action: string
          actor: string | null
          bike_id: string | null
          created_at: string
          detail: Json | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          bike_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          bike_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Relationships: []
      }
      bike_admin_overrides: {
        Row: {
          bike_id: string
          created_at: string
          eligible: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bike_id: string
          created_at?: string
          eligible?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bike_id?: string
          created_at?: string
          eligible?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bike_assets: {
        Row: {
          attempts: number
          bike_id: string
          bytes: number | null
          checksum: string | null
          content_type: string | null
          created_at: string
          downloaded_at: string | null
          error_message: string | null
          needs_review: boolean
          public_url: string | null
          source_url: string | null
          status: string
          storage_path: string | null
          stored_source_url: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          bike_id: string
          bytes?: number | null
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          downloaded_at?: string | null
          error_message?: string | null
          needs_review?: boolean
          public_url?: string | null
          source_url?: string | null
          status?: string
          storage_path?: string | null
          stored_source_url?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          bike_id?: string
          bytes?: number | null
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          downloaded_at?: string | null
          error_message?: string | null
          needs_review?: boolean
          public_url?: string | null
          source_url?: string | null
          status?: string
          storage_path?: string | null
          stored_source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bike_catalog_snapshot: {
        Row: {
          content_hash: string | null
          data: Json
          id: string
          ignored_count: number
          recognized_count: number
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          data?: Json
          id?: string
          ignored_count?: number
          recognized_count?: number
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          data?: Json
          id?: string
          ignored_count?: number
          recognized_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      bike_catalog_sync_state: {
        Row: {
          error_message: string | null
          id: string
          ignored_count: number
          ignored_rows: Json
          last_attempt_at: string | null
          last_success_at: string | null
          next_run_at: string
          recognized_count: number
          running_since: string | null
          status: string
          updated_at: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          ignored_count?: number
          ignored_rows?: Json
          last_attempt_at?: string | null
          last_success_at?: string | null
          next_run_at?: string
          recognized_count?: number
          running_since?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          ignored_count?: number
          ignored_rows?: Json
          last_attempt_at?: string | null
          last_success_at?: string | null
          next_run_at?: string
          recognized_count?: number
          running_since?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bike_panel_credentials: {
        Row: {
          created_at: string
          hash_base64: string
          id: string
          iterations: number
          salt_base64: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hash_base64: string
          id?: string
          iterations?: number
          salt_base64: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hash_base64?: string
          id?: string
          iterations?: number
          salt_base64?: string
          updated_at?: string
        }
        Relationships: []
      }
      bike_panel_login_attempts: {
        Row: {
          attempts: number
          fingerprint: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          fingerprint: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          fingerprint?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bike_panel_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_seen_at: string
          remember: boolean
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_seen_at?: string
          remember?: boolean
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          remember?: boolean
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      bike_profile_jobs: {
        Row: {
          attempts: number
          bike_id: string
          created_at: string
          error_message: string | null
          id: string
          locked_at: string | null
          payload: Json | null
          status: string
          technical_hash: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          bike_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          locked_at?: string | null
          payload?: Json | null
          status?: string
          technical_hash: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          bike_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          locked_at?: string | null
          payload?: Json | null
          status?: string
          technical_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      bike_profiles: {
        Row: {
          attempts: number
          bike_id: string
          created_at: string
          data: Json | null
          error_message: string | null
          missing_fields: Json
          model: string | null
          status: string
          technical_hash: string
          updated_at: string
          version: number
        }
        Insert: {
          attempts?: number
          bike_id: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          missing_fields?: Json
          model?: string | null
          status?: string
          technical_hash: string
          updated_at?: string
          version?: number
        }
        Update: {
          attempts?: number
          bike_id?: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          missing_fields?: Json
          model?: string | null
          status?: string
          technical_hash?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          attempt: number | null
          created_at: string
          destination: string
          error_message: string | null
          event_name: string
          http_status: number | null
          id: string
          lead_id: string | null
          request_payload: Json | null
          response_payload: string | null
          status: string
        }
        Insert: {
          attempt?: number | null
          created_at?: string
          destination: string
          error_message?: string | null
          event_name: string
          http_status?: number | null
          id?: string
          lead_id?: string | null
          request_payload?: Json | null
          response_payload?: string | null
          status: string
        }
        Update: {
          attempt?: number | null
          created_at?: string
          destination?: string
          error_message?: string | null
          event_name?: string
          http_status?: number | null
          id?: string
          lead_id?: string | null
          request_payload?: Json | null
          response_payload?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "quiz_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_events: {
        Row: {
          created_at: string
          event_name: string
          field_label: string | null
          field_name: string | null
          field_value: string | null
          id: string
          lead_id: string | null
          payload: Json | null
          step: number | null
        }
        Insert: {
          created_at?: string
          event_name: string
          field_label?: string | null
          field_name?: string | null
          field_value?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          step?: number | null
        }
        Update: {
          created_at?: string
          event_name?: string
          field_label?: string | null
          field_name?: string | null
          field_value?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "quiz_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_leads: {
        Row: {
          abandoned_at: string | null
          abandonment_webhook_sent: boolean
          bike_model_clicked: string | null
          browser: string | null
          budget_cluster: string | null
          budget_range: string | null
          budget_range_label: string | null
          buy_click_count: number
          clicked_at: string | null
          clicked_bike_link: string | null
          clicked_bike_name: string | null
          clicked_bike_position: string | null
          completed_at: string | null
          completion_percentage: number
          conversion_status: string | null
          created_at: string
          crm_webhook_status: string | null
          current_step: number
          daily_km_range: string | null
          daily_km_range_label: string | null
          detected_medium: string | null
          detected_source: string | null
          device_type: string | null
          distance_cluster: string | null
          experience_cluster: string | null
          fbclid: string | null
          first_seen_at: string | null
          first_url: string | null
          gclid: string | null
          had_ebike_before: string | null
          had_ebike_before_label: string | null
          id: string
          intent_cluster: string | null
          landing_path: string | null
          last_interaction_at: string | null
          last_webhook_sent_at: string | null
          link_group_used: string | null
          main_use: string | null
          main_use_label: string | null
          name: string | null
          operating_system: string | null
          passenger_cluster: string | null
          phone: string | null
          purchase_link_used: string | null
          raw_answers_json: Json | null
          raw_recommendation_json: Json | null
          recommendation_profile: string | null
          recommendation_reason: string | null
          recommended_bike_1: string | null
          recommended_bike_1_label: string | null
          recommended_bike_1_link: string | null
          recommended_bike_1_reason: string | null
          recommended_bike_1_score: number | null
          recommended_bike_2: string | null
          recommended_bike_2_label: string | null
          recommended_bike_2_link: string | null
          recommended_bike_2_reason: string | null
          recommended_bike_2_score: number | null
          referrer: string | null
          referrer_domain: string | null
          rider_capacity_need: string | null
          rider_capacity_need_label: string | null
          route_cluster: string | null
          route_type: string | null
          route_type_label: string | null
          sdr_affiliate_disclosure_shown: boolean | null
          sdr_bike_list_link_clicked: boolean | null
          sdr_bike_list_link_sent: boolean | null
          sdr_conversation_started_at: string | null
          sdr_conversation_status: string | null
          sdr_conversation_summary: string | null
          sdr_human_handoff_requested: boolean | null
          sdr_intent_level: string | null
          sdr_last_interaction_at: string | null
          sdr_link_clicked: boolean | null
          sdr_link_offered: boolean | null
          sdr_link_sent: boolean | null
          sdr_main_objection: string | null
          sdr_main_objection_label: string | null
          sdr_message_count: number | null
          sdr_offers_group_link_clicked: boolean | null
          sdr_offers_group_link_sent: boolean | null
          sdr_preferred_bike: string | null
          sdr_purchase_timing: string | null
          source_url: string | null
          started_at: string | null
          status: string
          submitted_at: string | null
          traffic_origin: string | null
          updated_at: string
          usage_cluster: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          webhook_attempts: number
          webhook_error_message: string | null
          webhook_last_attempt_at: string | null
          webhook_last_error: string | null
          webhook_last_response: string | null
          webhook_sent_at: string | null
          webhook_status: string | null
          weight_cluster: string | null
          weight_range: string | null
          weight_range_label: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandonment_webhook_sent?: boolean
          bike_model_clicked?: string | null
          browser?: string | null
          budget_cluster?: string | null
          budget_range?: string | null
          budget_range_label?: string | null
          buy_click_count?: number
          clicked_at?: string | null
          clicked_bike_link?: string | null
          clicked_bike_name?: string | null
          clicked_bike_position?: string | null
          completed_at?: string | null
          completion_percentage?: number
          conversion_status?: string | null
          created_at?: string
          crm_webhook_status?: string | null
          current_step?: number
          daily_km_range?: string | null
          daily_km_range_label?: string | null
          detected_medium?: string | null
          detected_source?: string | null
          device_type?: string | null
          distance_cluster?: string | null
          experience_cluster?: string | null
          fbclid?: string | null
          first_seen_at?: string | null
          first_url?: string | null
          gclid?: string | null
          had_ebike_before?: string | null
          had_ebike_before_label?: string | null
          id?: string
          intent_cluster?: string | null
          landing_path?: string | null
          last_interaction_at?: string | null
          last_webhook_sent_at?: string | null
          link_group_used?: string | null
          main_use?: string | null
          main_use_label?: string | null
          name?: string | null
          operating_system?: string | null
          passenger_cluster?: string | null
          phone?: string | null
          purchase_link_used?: string | null
          raw_answers_json?: Json | null
          raw_recommendation_json?: Json | null
          recommendation_profile?: string | null
          recommendation_reason?: string | null
          recommended_bike_1?: string | null
          recommended_bike_1_label?: string | null
          recommended_bike_1_link?: string | null
          recommended_bike_1_reason?: string | null
          recommended_bike_1_score?: number | null
          recommended_bike_2?: string | null
          recommended_bike_2_label?: string | null
          recommended_bike_2_link?: string | null
          recommended_bike_2_reason?: string | null
          recommended_bike_2_score?: number | null
          referrer?: string | null
          referrer_domain?: string | null
          rider_capacity_need?: string | null
          rider_capacity_need_label?: string | null
          route_cluster?: string | null
          route_type?: string | null
          route_type_label?: string | null
          sdr_affiliate_disclosure_shown?: boolean | null
          sdr_bike_list_link_clicked?: boolean | null
          sdr_bike_list_link_sent?: boolean | null
          sdr_conversation_started_at?: string | null
          sdr_conversation_status?: string | null
          sdr_conversation_summary?: string | null
          sdr_human_handoff_requested?: boolean | null
          sdr_intent_level?: string | null
          sdr_last_interaction_at?: string | null
          sdr_link_clicked?: boolean | null
          sdr_link_offered?: boolean | null
          sdr_link_sent?: boolean | null
          sdr_main_objection?: string | null
          sdr_main_objection_label?: string | null
          sdr_message_count?: number | null
          sdr_offers_group_link_clicked?: boolean | null
          sdr_offers_group_link_sent?: boolean | null
          sdr_preferred_bike?: string | null
          sdr_purchase_timing?: string | null
          source_url?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          traffic_origin?: string | null
          updated_at?: string
          usage_cluster?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_attempts?: number
          webhook_error_message?: string | null
          webhook_last_attempt_at?: string | null
          webhook_last_error?: string | null
          webhook_last_response?: string | null
          webhook_sent_at?: string | null
          webhook_status?: string | null
          weight_cluster?: string | null
          weight_range?: string | null
          weight_range_label?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandonment_webhook_sent?: boolean
          bike_model_clicked?: string | null
          browser?: string | null
          budget_cluster?: string | null
          budget_range?: string | null
          budget_range_label?: string | null
          buy_click_count?: number
          clicked_at?: string | null
          clicked_bike_link?: string | null
          clicked_bike_name?: string | null
          clicked_bike_position?: string | null
          completed_at?: string | null
          completion_percentage?: number
          conversion_status?: string | null
          created_at?: string
          crm_webhook_status?: string | null
          current_step?: number
          daily_km_range?: string | null
          daily_km_range_label?: string | null
          detected_medium?: string | null
          detected_source?: string | null
          device_type?: string | null
          distance_cluster?: string | null
          experience_cluster?: string | null
          fbclid?: string | null
          first_seen_at?: string | null
          first_url?: string | null
          gclid?: string | null
          had_ebike_before?: string | null
          had_ebike_before_label?: string | null
          id?: string
          intent_cluster?: string | null
          landing_path?: string | null
          last_interaction_at?: string | null
          last_webhook_sent_at?: string | null
          link_group_used?: string | null
          main_use?: string | null
          main_use_label?: string | null
          name?: string | null
          operating_system?: string | null
          passenger_cluster?: string | null
          phone?: string | null
          purchase_link_used?: string | null
          raw_answers_json?: Json | null
          raw_recommendation_json?: Json | null
          recommendation_profile?: string | null
          recommendation_reason?: string | null
          recommended_bike_1?: string | null
          recommended_bike_1_label?: string | null
          recommended_bike_1_link?: string | null
          recommended_bike_1_reason?: string | null
          recommended_bike_1_score?: number | null
          recommended_bike_2?: string | null
          recommended_bike_2_label?: string | null
          recommended_bike_2_link?: string | null
          recommended_bike_2_reason?: string | null
          recommended_bike_2_score?: number | null
          referrer?: string | null
          referrer_domain?: string | null
          rider_capacity_need?: string | null
          rider_capacity_need_label?: string | null
          route_cluster?: string | null
          route_type?: string | null
          route_type_label?: string | null
          sdr_affiliate_disclosure_shown?: boolean | null
          sdr_bike_list_link_clicked?: boolean | null
          sdr_bike_list_link_sent?: boolean | null
          sdr_conversation_started_at?: string | null
          sdr_conversation_status?: string | null
          sdr_conversation_summary?: string | null
          sdr_human_handoff_requested?: boolean | null
          sdr_intent_level?: string | null
          sdr_last_interaction_at?: string | null
          sdr_link_clicked?: boolean | null
          sdr_link_offered?: boolean | null
          sdr_link_sent?: boolean | null
          sdr_main_objection?: string | null
          sdr_main_objection_label?: string | null
          sdr_message_count?: number | null
          sdr_offers_group_link_clicked?: boolean | null
          sdr_offers_group_link_sent?: boolean | null
          sdr_preferred_bike?: string | null
          sdr_purchase_timing?: string | null
          source_url?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          traffic_origin?: string | null
          updated_at?: string
          usage_cluster?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_attempts?: number
          webhook_error_message?: string | null
          webhook_last_attempt_at?: string | null
          webhook_last_error?: string | null
          webhook_last_response?: string | null
          webhook_sent_at?: string | null
          webhook_status?: string | null
          weight_cluster?: string | null
          weight_range?: string | null
          weight_range_label?: string | null
        }
        Relationships: []
      }
      worker_events: {
        Row: {
          bike_id: string | null
          created_at: string
          detail: Json
          event: string
          id: string
          worker: string
        }
        Insert: {
          bike_id?: string | null
          created_at?: string
          detail?: Json
          event: string
          id?: string
          worker: string
        }
        Update: {
          bike_id?: string | null
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          worker?: string
        }
        Relationships: []
      }
      worker_runs: {
        Row: {
          created_at: string
          failed: number
          finished_at: string | null
          id: string
          note: string | null
          processed: number
          started_at: string
          succeeded: number
          worker: string
        }
        Insert: {
          created_at?: string
          failed?: number
          finished_at?: string | null
          id?: string
          note?: string | null
          processed?: number
          started_at?: string
          succeeded?: number
          worker: string
        }
        Update: {
          created_at?: string
          failed?: number
          finished_at?: string | null
          id?: string
          note?: string | null
          processed?: number
          started_at?: string
          succeeded?: number
          worker?: string
        }
        Relationships: []
      }
      worker_state: {
        Row: {
          consecutive_failures: number
          last_run_at: string | null
          paused_reason: string | null
          resume_at: string | null
          running_since: string | null
          status: string
          updated_at: string
          worker: string
        }
        Insert: {
          consecutive_failures?: number
          last_run_at?: string | null
          paused_reason?: string | null
          resume_at?: string | null
          running_since?: string | null
          status?: string
          updated_at?: string
          worker: string
        }
        Update: {
          consecutive_failures?: number
          last_run_at?: string | null
          paused_reason?: string | null
          resume_at?: string | null
          running_since?: string | null
          status?: string
          updated_at?: string
          worker?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_quiz_catalog: { Args: never; Returns: Json }
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
