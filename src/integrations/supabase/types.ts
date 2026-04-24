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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          device_type: string | null
          distance_cluster: string | null
          experience_cluster: string | null
          had_ebike_before: string | null
          had_ebike_before_label: string | null
          id: string
          intent_cluster: string | null
          landing_path: string | null
          last_interaction_at: string | null
          last_webhook_sent_at: string | null
          main_use: string | null
          main_use_label: string | null
          name: string | null
          operating_system: string | null
          phone: string | null
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
          route_cluster: string | null
          route_type: string | null
          route_type_label: string | null
          source_url: string | null
          started_at: string | null
          status: string
          updated_at: string
          usage_cluster: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          webhook_error_message: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandonment_webhook_sent?: boolean
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
          device_type?: string | null
          distance_cluster?: string | null
          experience_cluster?: string | null
          had_ebike_before?: string | null
          had_ebike_before_label?: string | null
          id?: string
          intent_cluster?: string | null
          landing_path?: string | null
          last_interaction_at?: string | null
          last_webhook_sent_at?: string | null
          main_use?: string | null
          main_use_label?: string | null
          name?: string | null
          operating_system?: string | null
          phone?: string | null
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
          route_cluster?: string | null
          route_type?: string | null
          route_type_label?: string | null
          source_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          usage_cluster?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_error_message?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandonment_webhook_sent?: boolean
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
          device_type?: string | null
          distance_cluster?: string | null
          experience_cluster?: string | null
          had_ebike_before?: string | null
          had_ebike_before_label?: string | null
          id?: string
          intent_cluster?: string | null
          landing_path?: string | null
          last_interaction_at?: string | null
          last_webhook_sent_at?: string | null
          main_use?: string | null
          main_use_label?: string | null
          name?: string | null
          operating_system?: string | null
          phone?: string | null
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
          route_cluster?: string | null
          route_type?: string | null
          route_type_label?: string | null
          source_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          usage_cluster?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_error_message?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
