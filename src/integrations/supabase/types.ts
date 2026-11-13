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
          source_kind: string
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
          source_kind?: string
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
          source_kind?: string
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
      bike_offers: {
        Row: {
          bike_id: string
          created_at: string
          currency: string
          end_reason: string | null
          ended_at: string | null
          first_seen_at: string
          id: string
          is_current: boolean
          override_eligible: boolean | null
          price: number
          radar_eligible: boolean
          sheet_eligible: boolean | null
          sheet_status: string | null
          source: string
          synced_at: string
          updated_at: string
          url: string
          verified_at: string | null
        }
        Insert: {
          bike_id: string
          created_at?: string
          currency?: string
          end_reason?: string | null
          ended_at?: string | null
          first_seen_at?: string
          id?: string
          is_current?: boolean
          override_eligible?: boolean | null
          price: number
          radar_eligible?: boolean
          sheet_eligible?: boolean | null
          sheet_status?: string | null
          source?: string
          synced_at?: string
          updated_at?: string
          url: string
          verified_at?: string | null
        }
        Update: {
          bike_id?: string
          created_at?: string
          currency?: string
          end_reason?: string | null
          ended_at?: string | null
          first_seen_at?: string
          id?: string
          is_current?: boolean
          override_eligible?: boolean | null
          price?: number
          radar_eligible?: boolean
          sheet_eligible?: boolean | null
          sheet_status?: string | null
          source?: string
          synced_at?: string
          updated_at?: string
          url?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_offers_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["bike_id"]
          },
        ]
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
      bike_price_alert_throttle: {
        Row: {
          attempts: number
          fingerprint: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempts?: number
          fingerprint: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          attempts?: number
          fingerprint?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      bike_price_alerts: {
        Row: {
          bike_id: string
          bike_name: string
          condition: string
          consent: boolean
          consent_at: string
          consent_text: string
          consent_version: string
          created_at: string
          delivery_enabled: boolean
          email: string | null
          id: string
          person_name: string
          phone_e164: string
          reference_price: number
          source_url: string | null
          status: string
          target_price: number | null
          traffic_origin: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          bike_id: string
          bike_name: string
          condition?: string
          consent?: boolean
          consent_at?: string
          consent_text: string
          consent_version?: string
          created_at?: string
          delivery_enabled?: boolean
          email?: string | null
          id?: string
          person_name: string
          phone_e164: string
          reference_price: number
          source_url?: string | null
          status?: string
          target_price?: number | null
          traffic_origin?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          bike_id?: string
          bike_name?: string
          condition?: string
          consent?: boolean
          consent_at?: string
          consent_text?: string
          consent_version?: string
          created_at?: string
          delivery_enabled?: boolean
          email?: string | null
          id?: string
          person_name?: string
          phone_e164?: string
          reference_price?: number
          source_url?: string | null
          status?: string
          target_price?: number | null
          traffic_origin?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      bike_price_daily: {
        Row: {
          bike_id: string
          changed: boolean
          close: number
          created_at: string
          day: string
          high: number
          last_verified_at: string | null
          low: number
          updated_at: string
          verification: string
          verified_runs: number
        }
        Insert: {
          bike_id: string
          changed?: boolean
          close: number
          created_at?: string
          day: string
          high: number
          last_verified_at?: string | null
          low: number
          updated_at?: string
          verification?: string
          verified_runs?: number
        }
        Update: {
          bike_id?: string
          changed?: boolean
          close?: number
          created_at?: string
          day?: string
          high?: number
          last_verified_at?: string | null
          low?: number
          updated_at?: string
          verification?: string
          verified_runs?: number
        }
        Relationships: []
      }
      bike_price_history: {
        Row: {
          bike_id: string
          bike_name: string
          confidence: string
          created_at: string
          eligible: boolean
          id: string
          link_vitale: string | null
          observed_at: string
          price: number
          source: string
          source_run_id: string | null
        }
        Insert: {
          bike_id: string
          bike_name: string
          confidence?: string
          created_at?: string
          eligible?: boolean
          id?: string
          link_vitale?: string | null
          observed_at?: string
          price: number
          source?: string
          source_run_id?: string | null
        }
        Update: {
          bike_id?: string
          bike_name?: string
          confidence?: string
          created_at?: string
          eligible?: boolean
          id?: string
          link_vitale?: string | null
          observed_at?: string
          price?: number
          source?: string
          source_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_price_history_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "bike_sync_runs"
            referencedColumns: ["id"]
          },
        ]
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
      bike_sync_changes: {
        Row: {
          bike_id: string
          bike_name: string | null
          change_type: string
          created_at: string
          field: string | null
          field_label: string | null
          id: string
          new_value: string | null
          old_value: string | null
          run_id: string
        }
        Insert: {
          bike_id: string
          bike_name?: string | null
          change_type: string
          created_at?: string
          field?: string | null
          field_label?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          run_id: string
        }
        Update: {
          bike_id?: string
          bike_name?: string | null
          change_type?: string
          created_at?: string
          field?: string | null
          field_label?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bike_sync_changes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "bike_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_sync_runs: {
        Row: {
          changed_bikes: number
          changed_fields: number
          created_at: string
          detail: Json
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          ignored_count: number | null
          origin: string
          recognized_count: number | null
          scheduled_for: string | null
          snapshot_written: boolean
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          changed_bikes?: number
          changed_fields?: number
          created_at?: string
          detail?: Json
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          ignored_count?: number | null
          origin?: string
          recognized_count?: number | null
          scheduled_for?: string | null
          snapshot_written?: boolean
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          changed_bikes?: number
          changed_fields?: number
          created_at?: string
          detail?: Json
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          ignored_count?: number | null
          origin?: string
          recognized_count?: number | null
          scheduled_for?: string | null
          snapshot_written?: boolean
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bikes: {
        Row: {
          autonomy_km: number | null
          autonomy_label: string | null
          battery: string | null
          bike_id: string
          capacity_label: string | null
          capacity_people: number | null
          category: string | null
          created_at: string
          description: string | null
          image_url: string | null
          max_speed_kmh: number | null
          motor_w: number | null
          name: string
          short_description: string | null
          slug: string
          source: string
          updated_at: string
        }
        Insert: {
          autonomy_km?: number | null
          autonomy_label?: string | null
          battery?: string | null
          bike_id: string
          capacity_label?: string | null
          capacity_people?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          image_url?: string | null
          max_speed_kmh?: number | null
          motor_w?: number | null
          name: string
          short_description?: string | null
          slug: string
          source?: string
          updated_at?: string
        }
        Update: {
          autonomy_km?: number | null
          autonomy_label?: string | null
          battery?: string | null
          bike_id?: string
          capacity_label?: string | null
          capacity_people?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          image_url?: string | null
          max_speed_kmh?: number | null
          motor_w?: number | null
          name?: string
          short_description?: string | null
          slug?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      editorial_admin_memberships: {
        Row: {
          active: boolean
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      editorial_articles: {
        Row: {
          blocks: Json
          content_type: string
          created_at: string
          created_by: string | null
          faq: Json
          foundation_required: boolean
          id: string
          indexable: boolean
          meta_description: string
          model: string | null
          og_description: string
          og_image_url: string | null
          og_title: string
          primary_bike_id: string | null
          prompt_version: number | null
          published_at: string | null
          published_by: string | null
          related_article_ids: string[]
          related_bike_ids: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          revision: number
          seo_title: string
          slug: string | null
          status: string
          summary: string
          summary_source_excerpt: string
          title: string
          updated_at: string
          updated_by: string | null
          validation_errors: Json
          video_id: string
        }
        Insert: {
          blocks?: Json
          content_type?: string
          created_at?: string
          created_by?: string | null
          faq?: Json
          foundation_required?: boolean
          id?: string
          indexable?: boolean
          meta_description?: string
          model?: string | null
          og_description?: string
          og_image_url?: string | null
          og_title?: string
          primary_bike_id?: string | null
          prompt_version?: number | null
          published_at?: string | null
          published_by?: string | null
          related_article_ids?: string[]
          related_bike_ids?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number
          seo_title?: string
          slug?: string | null
          status?: string
          summary?: string
          summary_source_excerpt?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          validation_errors?: Json
          video_id: string
        }
        Update: {
          blocks?: Json
          content_type?: string
          created_at?: string
          created_by?: string | null
          faq?: Json
          foundation_required?: boolean
          id?: string
          indexable?: boolean
          meta_description?: string
          model?: string | null
          og_description?: string
          og_image_url?: string | null
          og_title?: string
          primary_bike_id?: string | null
          prompt_version?: number | null
          published_at?: string | null
          published_by?: string | null
          related_article_ids?: string[]
          related_bike_ids?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number
          seo_title?: string
          slug?: string | null
          status?: string
          summary?: string
          summary_source_excerpt?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          validation_errors?: Json
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_articles_primary_bike_id_fkey"
            columns: ["primary_bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["bike_id"]
          },
          {
            foreignKeyName: "editorial_articles_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "editorial_videos"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "editorial_articles_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "podcast_article_ready_videos"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "editorial_articles_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "podcast_queue_candidates"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      editorial_audit_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          detail: Json
          entity_id: string
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          detail?: Json
          entity_id: string
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string
          entity_type?: string
          id?: never
        }
        Relationships: []
      }
      editorial_briefs: {
        Row: {
          archetype: string | null
          article_id: string
          article_revision: number | null
          created_at: string
          payload: Json
          primary_intent: string | null
          quality_report: Json
          stages: Json
          status: string
          updated_at: string
          version: number
          video_id: string
        }
        Insert: {
          archetype?: string | null
          article_id: string
          article_revision?: number | null
          created_at?: string
          payload?: Json
          primary_intent?: string | null
          quality_report?: Json
          stages?: Json
          status?: string
          updated_at?: string
          version?: number
          video_id: string
        }
        Update: {
          archetype?: string | null
          article_id?: string
          article_revision?: number | null
          created_at?: string
          payload?: Json
          primary_intent?: string | null
          quality_report?: Json
          stages?: Json
          status?: string
          updated_at?: string
          version?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_briefs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "editorial_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_briefs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "editorial_videos"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "editorial_briefs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "podcast_article_ready_videos"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "editorial_briefs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "podcast_queue_candidates"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      editorial_compiler_runs: {
        Row: {
          actor: string | null
          article_id: string | null
          completed_at: string | null
          error_code: string | null
          id: string
          kind: string
          model: string
          prompt_version: number
          started_at: string
          status: string
        }
        Insert: {
          actor?: string | null
          article_id?: string | null
          completed_at?: string | null
          error_code?: string | null
          id?: string
          kind: string
          model: string
          prompt_version: number
          started_at?: string
          status: string
        }
        Update: {
          actor?: string | null
          article_id?: string | null
          completed_at?: string | null
          error_code?: string | null
          id?: string
          kind?: string
          model?: string
          prompt_version?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_compiler_runs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "editorial_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_compiler_runs_prompt_version_fkey"
            columns: ["prompt_version"]
            isOneToOne: false
            referencedRelation: "editorial_prompt_versions"
            referencedColumns: ["version"]
          },
        ]
      }
      editorial_prompt_versions: {
        Row: {
          change_reason: string
          changed_by: string | null
          created_at: string
          model: string
          schema_version: number
          system_prompt: string
          version: number
        }
        Insert: {
          change_reason: string
          changed_by?: string | null
          created_at?: string
          model: string
          schema_version?: number
          system_prompt: string
          version: number
        }
        Update: {
          change_reason?: string
          changed_by?: string | null
          created_at?: string
          model?: string
          schema_version?: number
          system_prompt?: string
          version?: number
        }
        Relationships: []
      }
      editorial_videos: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          primary_bike_id: string | null
          published_on: string | null
          related_bike_ids: string[]
          status: string
          thumbnail_url: string | null
          title: string
          transcript: string | null
          updated_at: string
          updated_by: string | null
          youtube_id: string
          youtube_url: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          primary_bike_id?: string | null
          published_on?: string | null
          related_bike_ids?: string[]
          status?: string
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
          updated_by?: string | null
          youtube_id: string
          youtube_url: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          primary_bike_id?: string | null
          published_on?: string | null
          related_bike_ids?: string[]
          status?: string
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
          updated_by?: string | null
          youtube_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_videos_primary_bike_id_fkey"
            columns: ["primary_bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["bike_id"]
          },
        ]
      }
      heatmap_daily: {
        Row: {
          action: string
          count: number
          day: string
          kind: string
          layout: string
          path: string
          screen: string
          x: number
          y: number
        }
        Insert: {
          action: string
          count: number
          day: string
          kind: string
          layout: string
          path: string
          screen: string
          x: number
          y: number
        }
        Update: {
          action?: string
          count?: number
          day?: string
          kind?: string
          layout?: string
          path?: string
          screen?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      heatmap_elements_daily: {
        Row: {
          count: number
          day: string
          kind: string
          layout: string
          path: string
          screen: string
          target: string
          viewport: number
          x: number
          y: number
        }
        Insert: {
          count: number
          day: string
          kind: string
          layout: string
          path: string
          screen: string
          target: string
          viewport: number
          x: number
          y: number
        }
        Update: {
          count?: number
          day?: string
          kind?: string
          layout?: string
          path?: string
          screen?: string
          target?: string
          viewport?: number
          x?: number
          y?: number
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
      member_account_removals: {
        Row: {
          actor_id: string
          completed_at: string | null
          requested_at: string
          user_id: string
        }
        Insert: {
          actor_id: string
          completed_at?: string | null
          requested_at?: string
          user_id: string
        }
        Update: {
          actor_id?: string
          completed_at?: string | null
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_article_comments: {
        Row: {
          article_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          article_id: string
          author_name: string
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          article_id?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_article_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "editorial_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_article_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_bike_listings: {
        Row: {
          battery: string
          bike_id: string | null
          brand: string
          channel_expires_at: string | null
          channel_whatsapp: string | null
          city: string
          condition: string
          confirmed_phone: string | null
          contact_confirmed_at: string | null
          contact_consent_at: string | null
          created_at: string
          description: string
          fee_cents: number
          fee_status: string
          first_published_at: string | null
          id: string
          invoice: boolean
          maintenance: string
          mileage_km: number | null
          model: string
          model_year: number | null
          price_cents: number
          published_at: string | null
          seller_kind: string
          state: string
          status: string
          title: string
          updated_at: string
          user_id: string
          whatsapp_message: string
        }
        Insert: {
          battery?: string
          bike_id?: string | null
          brand?: string
          channel_expires_at?: string | null
          channel_whatsapp?: string | null
          city?: string
          condition?: string
          confirmed_phone?: string | null
          contact_confirmed_at?: string | null
          contact_consent_at?: string | null
          created_at?: string
          description?: string
          fee_cents?: number
          fee_status?: string
          first_published_at?: string | null
          id?: string
          invoice?: boolean
          maintenance?: string
          mileage_km?: number | null
          model?: string
          model_year?: number | null
          price_cents?: number
          published_at?: string | null
          seller_kind?: string
          state?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          whatsapp_message?: string
        }
        Update: {
          battery?: string
          bike_id?: string | null
          brand?: string
          channel_expires_at?: string | null
          channel_whatsapp?: string | null
          city?: string
          condition?: string
          confirmed_phone?: string | null
          contact_confirmed_at?: string | null
          contact_consent_at?: string | null
          created_at?: string
          description?: string
          fee_cents?: number
          fee_status?: string
          first_published_at?: string | null
          id?: string
          invoice?: boolean
          maintenance?: string
          mileage_km?: number | null
          model?: string
          model_year?: number | null
          price_cents?: number
          published_at?: string | null
          seller_kind?: string
          state?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          whatsapp_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_bike_listings_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["bike_id"]
          },
        ]
      }
      member_billing_customers: {
        Row: {
          asaas_customer_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_billing_events: {
        Row: {
          attempts: number
          available_at: string
          created_at: string
          id: string
          kind: string
          lease_token: string | null
          lease_until: string | null
          order_reference: string | null
          resource_id: string
          resource_type: string
          status: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          created_at?: string
          id: string
          kind: string
          lease_token?: string | null
          lease_until?: string | null
          order_reference?: string | null
          resource_id: string
          resource_type: string
          status?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          created_at?: string
          id?: string
          kind?: string
          lease_token?: string | null
          lease_until?: string | null
          order_reference?: string | null
          resource_id?: string
          resource_type?: string
          status?: string
        }
        Relationships: []
      }
      member_billing_settings: {
        Row: {
          enabled: boolean
          hosted_ready: boolean
          last_health_at: string | null
          provider_ready: boolean
          purchase_ready: boolean
          signing_key: string
          singleton: boolean
        }
        Insert: {
          enabled?: boolean
          hosted_ready?: boolean
          last_health_at?: string | null
          provider_ready?: boolean
          purchase_ready?: boolean
          signing_key?: string
          singleton?: boolean
        }
        Update: {
          enabled?: boolean
          hosted_ready?: boolean
          last_health_at?: string | null
          provider_ready?: boolean
          purchase_ready?: boolean
          signing_key?: string
          singleton?: boolean
        }
        Relationships: []
      }
      member_classifieds_settings: {
        Row: {
          channel_seller_user_id: string | null
          enabled: boolean
          listing_fee_cents: number
          pilot_user_id: string | null
          public_enabled: boolean
          singleton: boolean
        }
        Insert: {
          channel_seller_user_id?: string | null
          enabled?: boolean
          listing_fee_cents?: number
          pilot_user_id?: string | null
          public_enabled?: boolean
          singleton?: boolean
        }
        Update: {
          channel_seller_user_id?: string | null
          enabled?: boolean
          listing_fee_cents?: number
          pilot_user_id?: string | null
          public_enabled?: boolean
          singleton?: boolean
        }
        Relationships: []
      }
      member_community_settings: {
        Row: {
          enabled: boolean
          singleton: boolean
        }
        Insert: {
          enabled?: boolean
          singleton?: boolean
        }
        Update: {
          enabled?: boolean
          singleton?: boolean
        }
        Relationships: []
      }
      member_courtesy_audit: {
        Row: {
          action: string
          actor_id: string | null
          courtesy_id: string
          created_at: string
          from_listing_id: string | null
          id: number
          reason: string | null
          to_listing_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          courtesy_id: string
          created_at?: string
          from_listing_id?: string | null
          id?: never
          reason?: string | null
          to_listing_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          courtesy_id?: string
          created_at?: string
          from_listing_id?: string | null
          id?: never
          reason?: string | null
          to_listing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_courtesy_audit_courtesy_id_fkey"
            columns: ["courtesy_id"]
            isOneToOne: false
            referencedRelation: "member_listing_courtesies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_courtesy_audit_from_listing_id_fkey"
            columns: ["from_listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_courtesy_audit_to_listing_id_fkey"
            columns: ["to_listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      member_identity_challenges: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          delivered_at: string | null
          destination: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          destination: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          destination?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_identity_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_identity_verifications: {
        Row: {
          email_address: string | null
          email_verified_at: string | null
          phone_number: string | null
          phone_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          email_address?: string | null
          email_verified_at?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          email_address?: string | null
          email_verified_at?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "member_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_listing_billing: {
        Row: {
          amount_cents: number
          attempts: number
          authorization_id: string | null
          billing_model: string
          cancel_requested_at: string | null
          cancelled_at: string | null
          checkout_expires_at: string | null
          checkout_id: string | null
          conciliation_id: string | null
          contact_consent_at: string
          created_at: string
          customer_id: string | null
          display_days: number
          display_started_at: string | null
          error_code: string | null
          financial_started: boolean
          hold: boolean
          id: string
          lease_token: string | null
          lease_until: string | null
          listing_id: string
          listing_revision: string
          method: string
          monthly_accepted_at: string
          monthly_cents: number
          next_attempt_at: string
          paid_at: string | null
          paid_until: string | null
          payment_url: string | null
          pix_image: string | null
          pix_payload: string | null
          provider_billing_type: string | null
          publish_requested: boolean
          purchase_accepted_at: string | null
          purchased_listing_id: string
          qr_expires_at: string | null
          renewal_status: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          attempts?: number
          authorization_id?: string | null
          billing_model?: string
          cancel_requested_at?: string | null
          cancelled_at?: string | null
          checkout_expires_at?: string | null
          checkout_id?: string | null
          conciliation_id?: string | null
          contact_consent_at: string
          created_at?: string
          customer_id?: string | null
          display_days?: number
          display_started_at?: string | null
          error_code?: string | null
          financial_started?: boolean
          hold?: boolean
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          listing_id: string
          listing_revision: string
          method: string
          monthly_accepted_at: string
          monthly_cents?: number
          next_attempt_at?: string
          paid_at?: string | null
          paid_until?: string | null
          payment_url?: string | null
          pix_image?: string | null
          pix_payload?: string | null
          provider_billing_type?: string | null
          publish_requested?: boolean
          purchase_accepted_at?: string | null
          purchased_listing_id: string
          qr_expires_at?: string | null
          renewal_status?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          attempts?: number
          authorization_id?: string | null
          billing_model?: string
          cancel_requested_at?: string | null
          cancelled_at?: string | null
          checkout_expires_at?: string | null
          checkout_id?: string | null
          conciliation_id?: string | null
          contact_consent_at?: string
          created_at?: string
          customer_id?: string | null
          display_days?: number
          display_started_at?: string | null
          error_code?: string | null
          financial_started?: boolean
          hold?: boolean
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          listing_id?: string
          listing_revision?: string
          method?: string
          monthly_accepted_at?: string
          monthly_cents?: number
          next_attempt_at?: string
          paid_at?: string | null
          paid_until?: string | null
          payment_url?: string | null
          pix_image?: string | null
          pix_payload?: string | null
          provider_billing_type?: string | null
          publish_requested?: boolean
          purchase_accepted_at?: string | null
          purchased_listing_id?: string
          qr_expires_at?: string | null
          renewal_status?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_listing_billing_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_listing_billing_purchased_listing_id_fkey"
            columns: ["purchased_listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      member_listing_courtesies: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          listing_id: string | null
          reason: string
          request_id: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          started_at: string | null
          unit: number
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          request_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          started_at?: string | null
          unit: number
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          request_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          started_at?: string | null
          unit?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_listing_courtesies_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_listing_courtesies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_listing_events: {
        Row: {
          day: string
          event: string
          listing_id: string
          visitor_key: string
        }
        Insert: {
          day?: string
          event: string
          listing_id: string
          visitor_key: string
        }
        Update: {
          day?: string
          event?: string
          listing_id?: string
          visitor_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_listing_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      member_listing_payment_cycles: {
        Row: {
          due_date: string
          observed_at: string
          order_id: string
          paid: boolean
          payment_id: string
          period_end: string | null
          status: string
        }
        Insert: {
          due_date: string
          observed_at?: string
          order_id: string
          paid: boolean
          payment_id: string
          period_end?: string | null
          status: string
        }
        Update: {
          due_date?: string
          observed_at?: string
          order_id?: string
          paid?: boolean
          payment_id?: string
          period_end?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_listing_payment_cycles_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "member_listing_billing"
            referencedColumns: ["id"]
          },
        ]
      }
      member_listing_period_transfers: {
        Row: {
          from_listing_id: string
          id: number
          order_id: string
          to_listing_id: string
          transferred_at: string
          user_id: string
        }
        Insert: {
          from_listing_id: string
          id?: never
          order_id: string
          to_listing_id: string
          transferred_at?: string
          user_id: string
        }
        Update: {
          from_listing_id?: string
          id?: never
          order_id?: string
          to_listing_id?: string
          transferred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_listing_period_transfers_from_listing_id_fkey"
            columns: ["from_listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_listing_period_transfers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "member_listing_billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_listing_period_transfers_to_listing_id_fkey"
            columns: ["to_listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      member_media_assets: {
        Row: {
          created_at: string
          id: string
          kind: string
          listing_id: string | null
          object_path: string
          position: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          listing_id?: string | null
          object_path: string
          position?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string | null
          object_path?: string
          position?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_media_assets_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "member_bike_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      member_moderation_audit: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: number
          target_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: never
          target_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: never
          target_id?: string
        }
        Relationships: []
      }
      member_operation_alert_settings: {
        Row: {
          enabled: boolean
          recipient: string | null
          singleton: boolean
          starts_at: string
        }
        Insert: {
          enabled?: boolean
          recipient?: string | null
          singleton?: boolean
          starts_at?: string
        }
        Update: {
          enabled?: boolean
          recipient?: string | null
          singleton?: boolean
          starts_at?: string
        }
        Relationships: []
      }
      member_operation_alerts: {
        Row: {
          accepted_at: string | null
          attempts: number
          available_at: string
          created_at: string
          delivery_body: string | null
          delivery_from: string | null
          delivery_to: string | null
          error_code: string | null
          event_kind: string
          first_attempt_at: string | null
          id: string
          lease_token: string | null
          lease_until: string | null
          payload: Json
          provider_id: string | null
          source_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          attempts?: number
          available_at?: string
          created_at?: string
          delivery_body?: string | null
          delivery_from?: string | null
          delivery_to?: string | null
          error_code?: string | null
          event_kind: string
          first_attempt_at?: string | null
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          payload: Json
          provider_id?: string | null
          source_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          attempts?: number
          available_at?: string
          created_at?: string
          delivery_body?: string | null
          delivery_from?: string | null
          delivery_to?: string | null
          error_code?: string | null
          event_kind?: string
          first_attempt_at?: string | null
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          payload?: Json
          provider_id?: string | null
          source_id?: string
          status?: string
        }
        Relationships: []
      }
      member_profiles: {
        Row: {
          avatar_asset_id: string | null
          comment_day: string | null
          comment_day_count: number
          community_consent_version: string | null
          community_joined_at: string | null
          created_at: string
          display_name: string
          last_comment_at: string | null
          newsletter_subscription_id: string | null
          privacy_acknowledged_at: string
          privacy_version: string
          suspended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_asset_id?: string | null
          comment_day?: string | null
          comment_day_count?: number
          community_consent_version?: string | null
          community_joined_at?: string | null
          created_at?: string
          display_name: string
          last_comment_at?: string | null
          newsletter_subscription_id?: string | null
          privacy_acknowledged_at?: string
          privacy_version?: string
          suspended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_asset_id?: string | null
          comment_day?: string | null
          comment_day_count?: number
          community_consent_version?: string | null
          community_joined_at?: string | null
          created_at?: string
          display_name?: string
          last_comment_at?: string | null
          newsletter_subscription_id?: string | null
          privacy_acknowledged_at?: string
          privacy_version?: string
          suspended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_avatar_asset_id_fkey"
            columns: ["avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "member_media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_profiles_newsletter_subscription_id_fkey"
            columns: ["newsletter_subscription_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_radar_favorites: {
        Row: {
          bike_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          bike_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          bike_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_radar_favorites_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["bike_id"]
          },
        ]
      }
      member_referral_links: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_referral_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "member_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_referral_settings: {
        Row: {
          daily_mail_limit: number
          enabled: boolean
          mail_attempts: number
          mail_day: string | null
          singleton: boolean
        }
        Insert: {
          daily_mail_limit?: number
          enabled?: boolean
          mail_attempts?: number
          mail_day?: string | null
          singleton?: boolean
        }
        Update: {
          daily_mail_limit?: number
          enabled?: boolean
          mail_attempts?: number
          mail_day?: string | null
          singleton?: boolean
        }
        Relationships: []
      }
      member_referral_signups: {
        Row: {
          candidate_email: string | null
          candidate_name: string | null
          community_member: boolean
          confirmed_at: string | null
          consent_at: string
          created_at: string
          credited: boolean
          email_key: string
          expires_at: string
          id: string
          invitee_user_id: string | null
          last_mail_attempt_at: string | null
          mail_state: string
          nonce: string
          referrer_id: string
          status: string
          subscription_id: string | null
          token_hash: string | null
        }
        Insert: {
          candidate_email?: string | null
          candidate_name?: string | null
          community_member?: boolean
          confirmed_at?: string | null
          consent_at?: string
          created_at?: string
          credited?: boolean
          email_key: string
          expires_at?: string
          id?: string
          invitee_user_id?: string | null
          last_mail_attempt_at?: string | null
          mail_state?: string
          nonce?: string
          referrer_id: string
          status?: string
          subscription_id?: string | null
          token_hash?: string | null
        }
        Update: {
          candidate_email?: string | null
          candidate_name?: string | null
          community_member?: boolean
          confirmed_at?: string | null
          consent_at?: string
          created_at?: string
          credited?: boolean
          email_key?: string
          expires_at?: string
          id?: string
          invitee_user_id?: string | null
          last_mail_attempt_at?: string | null
          mail_state?: string
          nonce?: string
          referrer_id?: string
          status?: string
          subscription_id?: string | null
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_referral_signups_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "member_referral_links"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "member_referral_signups_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "newsletter_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_referral_visits: {
        Row: {
          code: string
          day: string
          visits: number
        }
        Insert: {
          code: string
          day: string
          visits?: number
        }
        Update: {
          code?: string
          day?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_referral_visits_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "member_referral_links"
            referencedColumns: ["code"]
          },
        ]
      }
      member_reporting_settings: {
        Row: {
          excluded_order_ids: string[]
          note: string
          singleton: boolean
          tracking_since: string | null
          updated_at: string
        }
        Insert: {
          excluded_order_ids?: string[]
          note?: string
          singleton?: boolean
          tracking_since?: string | null
          updated_at?: string
        }
        Update: {
          excluded_order_ids?: string[]
          note?: string
          singleton?: boolean
          tracking_since?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_campaigns: {
        Row: {
          created_at: string
          edition_day: string
          fingerprint: string
          id: string
          last_error: string | null
          manual_send_until: string | null
          payload: Json
          resend_id: string | null
          segment: string
          sent_at: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          edition_day: string
          fingerprint: string
          id?: string
          last_error?: string | null
          manual_send_until?: string | null
          payload: Json
          resend_id?: string | null
          segment: string
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          edition_day?: string
          fingerprint?: string
          id?: string
          last_error?: string | null
          manual_send_until?: string | null
          payload?: Json
          resend_id?: string | null
          segment?: string
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      newsletter_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_revision: number | null
          content: Json
          created_at: string
          edited_by: string | null
          edition_day: string | null
          fingerprint: string | null
          generation_mode: string
          id: string
          manual_send_until: string | null
          origin: string
          revision: number
          schedule_hold: boolean
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_revision?: number | null
          content: Json
          created_at?: string
          edited_by?: string | null
          edition_day?: string | null
          fingerprint?: string | null
          generation_mode?: string
          id?: string
          manual_send_until?: string | null
          origin: string
          revision?: number
          schedule_hold?: boolean
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_revision?: number | null
          content?: Json
          created_at?: string
          edited_by?: string | null
          edition_day?: string | null
          fingerprint?: string | null
          generation_mode?: string
          id?: string
          manual_send_until?: string | null
          origin?: string
          revision?: number
          schedule_hold?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_preparations: {
        Row: {
          attempts: number
          edition_day: string
          feedback: Json
          last_error: string | null
          next_attempt_at: string | null
        }
        Insert: {
          attempts: number
          edition_day: string
          feedback?: Json
          last_error?: string | null
          next_attempt_at?: string | null
        }
        Update: {
          attempts?: number
          edition_day?: string
          feedback?: Json
          last_error?: string | null
          next_attempt_at?: string | null
        }
        Relationships: []
      }
      newsletter_recipients: {
        Row: {
          campaign_id: string
          consent_at: string
          edition_day: string
          excluded: boolean
          subscription_id: string
          synced: boolean
        }
        Insert: {
          campaign_id: string
          consent_at: string
          edition_day: string
          excluded?: boolean
          subscription_id: string
          synced?: boolean
        }
        Update: {
          campaign_id?: string
          consent_at?: string
          edition_day?: string
          excluded?: boolean
          subscription_id?: string
          synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_recipients_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_rewrites: {
        Row: {
          actor_id: string
          attempts: number
          base_revision: number
          candidate: Json | null
          created_at: string
          draft_id: string
          feedback: Json
          id: string
          last_error: string | null
          next_attempt_at: string
          prompt: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_id: string
          attempts?: number
          base_revision: number
          candidate?: Json | null
          created_at?: string
          draft_id: string
          feedback?: Json
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          prompt: string
          status?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string
          attempts?: number
          base_revision?: number
          candidate?: Json | null
          created_at?: string
          draft_id?: string
          feedback?: Json
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          prompt?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_rewrites_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "newsletter_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_settings: {
        Row: {
          enabled: boolean
          from_email: string
          last_error: string | null
          lease_token: string | null
          lease_until: string | null
          reply_to: string
          retry_until: string | null
          segments: Json
          signing_key: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          from_email?: string
          last_error?: string | null
          lease_token?: string | null
          lease_until?: string | null
          reply_to?: string
          retry_until?: string | null
          segments?: Json
          signing_key?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          from_email?: string
          last_error?: string | null
          lease_token?: string | null
          lease_until?: string | null
          reply_to?: string
          retry_until?: string | null
          segments?: Json
          signing_key?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          consent_at: string
          consent_text: string
          consent_version: string
          created_at: string
          delivery_enabled: boolean
          email: string
          id: string
          interest: string
          person_name: string
          resend_contact_id: string | null
          source_url: string | null
          status: string
          suppressed_at: string | null
          updated_at: string
        }
        Insert: {
          consent_at?: string
          consent_text: string
          consent_version: string
          created_at?: string
          delivery_enabled?: boolean
          email: string
          id?: string
          interest?: string
          person_name: string
          resend_contact_id?: string | null
          source_url?: string | null
          status?: string
          suppressed_at?: string | null
          updated_at?: string
        }
        Update: {
          consent_at?: string
          consent_text?: string
          consent_version?: string
          created_at?: string
          delivery_enabled?: boolean
          email?: string
          id?: string
          interest?: string
          person_name?: string
          resend_contact_id?: string | null
          source_url?: string | null
          status?: string
          suppressed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_throttle: {
        Row: {
          attempts: number
          fingerprint: string
          window_started_at: string
        }
        Insert: {
          attempts?: number
          fingerprint: string
          window_started_at?: string
        }
        Update: {
          attempts?: number
          fingerprint?: string
          window_started_at?: string
        }
        Relationships: []
      }
      newsletter_webhook_events: {
        Row: {
          campaign_id: string | null
          email_id: string | null
          event_id: string
          event_type: string
          received_at: string
          recipient_emails: string[]
        }
        Insert: {
          campaign_id?: string | null
          email_id?: string | null
          event_id: string
          event_type: string
          received_at?: string
          recipient_emails?: string[]
        }
        Update: {
          campaign_id?: string | null
          email_id?: string | null
          event_id?: string
          event_type?: string
          received_at?: string
          recipient_emails?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_webhook_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      offers_group_settings: {
        Row: {
          active_group_id: number
          groups: Json
          id: boolean
          revision: number
          url: string
        }
        Insert: {
          active_group_id?: number
          groups?: Json
          id?: boolean
          revision?: number
          url: string
        }
        Update: {
          active_group_id?: number
          groups?: Json
          id?: boolean
          revision?: number
          url?: string
        }
        Relationships: []
      }
      podcast_audio_settings: {
        Row: {
          enabled: boolean
          singleton: boolean
        }
        Insert: {
          enabled?: boolean
          singleton?: boolean
        }
        Update: {
          enabled?: boolean
          singleton?: boolean
        }
        Relationships: []
      }
      podcast_distribution_settings: {
        Row: {
          feed_enabled: boolean
          instagram_enabled: boolean
          scheduler_enabled: boolean
          singleton: boolean
          verification_email: string | null
        }
        Insert: {
          feed_enabled?: boolean
          instagram_enabled?: boolean
          scheduler_enabled?: boolean
          singleton?: boolean
          verification_email?: string | null
        }
        Update: {
          feed_enabled?: boolean
          instagram_enabled?: boolean
          scheduler_enabled?: boolean
          singleton?: boolean
          verification_email?: string | null
        }
        Relationships: []
      }
      podcast_episode_queue: {
        Row: {
          created_at: string
          object_path: string
          original_description: string
          preparation_attempted_at: string | null
          prepared_article_version: string | null
          prepared_instagram_post: Json | null
          release_at: string | null
          released_at: string | null
          size_bytes: number
          source_folder_created_at: string | null
          title: string
          youtube_id: string
        }
        Insert: {
          created_at?: string
          object_path: string
          original_description: string
          preparation_attempted_at?: string | null
          prepared_article_version?: string | null
          prepared_instagram_post?: Json | null
          release_at?: string | null
          released_at?: string | null
          size_bytes: number
          source_folder_created_at?: string | null
          title: string
          youtube_id: string
        }
        Update: {
          created_at?: string
          object_path?: string
          original_description?: string
          preparation_attempted_at?: string | null
          prepared_article_version?: string | null
          prepared_instagram_post?: Json | null
          release_at?: string | null
          released_at?: string | null
          size_bytes?: number
          source_folder_created_at?: string | null
          title?: string
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episode_queue_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_video_audio"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      podcast_instagram_deliveries: {
        Row: {
          claim_token: string | null
          container_id: string | null
          error_code: string | null
          lease_until: string | null
          permalink: string | null
          publish_attempted_at: string | null
          published_at: string | null
          scheduled_at: string | null
          slot_at: string
          status: string
          youtube_id: string
        }
        Insert: {
          claim_token?: string | null
          container_id?: string | null
          error_code?: string | null
          lease_until?: string | null
          permalink?: string | null
          publish_attempted_at?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slot_at: string
          status?: string
          youtube_id: string
        }
        Update: {
          claim_token?: string | null
          container_id?: string | null
          error_code?: string | null
          lease_until?: string | null
          permalink?: string | null
          publish_attempted_at?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slot_at?: string
          status?: string
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_instagram_deliveries_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_episode_queue"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "podcast_instagram_deliveries_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_pending_preparation"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "podcast_instagram_deliveries_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_prepared_episodes"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "podcast_instagram_deliveries_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_released_episodes"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      podcast_spotify_episodes: {
        Row: {
          spotify_episode_id: string
          youtube_id: string
        }
        Insert: {
          spotify_episode_id: string
          youtube_id: string
        }
        Update: {
          spotify_episode_id?: string
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_spotify_episodes_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_episode_queue"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "podcast_spotify_episodes_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_pending_preparation"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "podcast_spotify_episodes_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_prepared_episodes"
            referencedColumns: ["youtube_id"]
          },
          {
            foreignKeyName: "podcast_spotify_episodes_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_released_episodes"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      podcast_video_audio: {
        Row: {
          attached_by: string
          file_name: string
          object_path: string
          size_bytes: number
          upload_id: string
          uploaded_at: string
          youtube_id: string
        }
        Insert: {
          attached_by: string
          file_name: string
          object_path: string
          size_bytes: number
          upload_id: string
          uploaded_at: string
          youtube_id: string
        }
        Update: {
          attached_by?: string
          file_name?: string
          object_path?: string
          size_bytes?: number
          upload_id?: string
          uploaded_at?: string
          youtube_id?: string
        }
        Relationships: []
      }
      podcast_worker_credentials: {
        Row: {
          actor_id: string | null
          signing_key: string
          singleton: boolean
        }
        Insert: {
          actor_id?: string | null
          signing_key?: string
          singleton?: boolean
        }
        Update: {
          actor_id?: string | null
          signing_key?: string
          singleton?: boolean
        }
        Relationships: []
      }
      price_alert_hotpipe_outbox: {
        Row: {
          alert_id: string
          attempts: number
          created_at: string
          delivered_at: string | null
          event_id: string
          last_http_status: number | null
          lease_token: string | null
          lease_until: string | null
          next_attempt_at: string
          payload: Json
          sequence: number
          status: string
        }
        Insert: {
          alert_id: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          last_http_status?: number | null
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          payload: Json
          sequence?: never
          status?: string
        }
        Update: {
          alert_id?: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          last_http_status?: number | null
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          payload?: Json
          sequence?: never
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alert_hotpipe_outbox_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "bike_price_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alert_hotpipe_requests: {
        Row: {
          alert_id: string
          request_id: string
          revision: number
        }
        Insert: {
          alert_id: string
          request_id: string
          revision?: number
        }
        Update: {
          alert_id?: string
          request_id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_alert_hotpipe_requests_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: true
            referencedRelation: "bike_price_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alert_hotpipe_settings: {
        Row: {
          enabled: boolean
          signing_key: string
          singleton: boolean
        }
        Insert: {
          enabled?: boolean
          signing_key?: string
          singleton?: boolean
        }
        Update: {
          enabled?: boolean
          signing_key?: string
          singleton?: boolean
        }
        Relationships: []
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
      quiz_funnel_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          device_type: string | null
          first_seen_at: string
          highest_answered_step: number
          landing_path: string | null
          last_activity_at: string
          lead_form_reached_at: string | null
          page_viewed_at: string | null
          referrer_domain: string | null
          session_id: string
          started_at: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          highest_answered_step?: number
          landing_path?: string | null
          last_activity_at?: string
          lead_form_reached_at?: string | null
          page_viewed_at?: string | null
          referrer_domain?: string | null
          session_id: string
          started_at?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          highest_answered_step?: number
          landing_path?: string | null
          last_activity_at?: string
          lead_form_reached_at?: string | null
          page_viewed_at?: string | null
          referrer_domain?: string | null
          session_id?: string
          started_at?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
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
      site_analytics_daily: {
        Row: {
          bike_id: string
          day: string
          event_count: number
          event_name: string
          position: string
          source_path: string
          target_path: string
        }
        Insert: {
          bike_id?: string
          day: string
          event_count?: number
          event_name: string
          position?: string
          source_path: string
          target_path?: string
        }
        Update: {
          bike_id?: string
          day?: string
          event_count?: number
          event_name?: string
          position?: string
          source_path?: string
          target_path?: string
        }
        Relationships: []
      }
      site_analytics_hourly: {
        Row: {
          hour_start: string
          views: number
        }
        Insert: {
          hour_start: string
          views: number
        }
        Update: {
          hour_start?: string
          views?: number
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
      youtube_editorial_inventory: {
        Row: {
          created_at: string
          historical: boolean
          video_id: string
        }
        Insert: {
          created_at?: string
          historical: boolean
          video_id: string
        }
        Update: {
          created_at?: string
          historical?: boolean
          video_id?: string
        }
        Relationships: []
      }
      youtube_editorial_snapshot_state: {
        Row: {
          initialized: boolean
          singleton: boolean
        }
        Insert: {
          initialized?: boolean
          singleton?: boolean
        }
        Update: {
          initialized?: boolean
          singleton?: boolean
        }
        Relationships: []
      }
      youtube_editorial_sources: {
        Row: {
          article_id: string | null
          caption_retry_at: string | null
          caption_retry_bike_ids: string[] | null
          capture: Json | null
          captured_at: string | null
          created_at: string
          created_by: string
          state: string
          state_changed_at: string
          video_id: string
        }
        Insert: {
          article_id?: string | null
          caption_retry_at?: string | null
          caption_retry_bike_ids?: string[] | null
          capture?: Json | null
          captured_at?: string | null
          created_at?: string
          created_by: string
          state: string
          state_changed_at?: string
          video_id: string
        }
        Update: {
          article_id?: string | null
          caption_retry_at?: string | null
          caption_retry_bike_ids?: string[] | null
          capture?: Json | null
          captured_at?: string | null
          created_at?: string
          created_by?: string
          state?: string
          state_changed_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_editorial_sources_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "editorial_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_editorial_worker_settings: {
        Row: {
          actor_id: string
          ai_retry_at: string | null
          enabled: boolean
          signing_key: string
          singleton: boolean
        }
        Insert: {
          actor_id: string
          ai_retry_at?: string | null
          enabled?: boolean
          signing_key?: string
          singleton?: boolean
        }
        Update: {
          actor_id?: string
          ai_retry_at?: string | null
          enabled?: boolean
          signing_key?: string
          singleton?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      podcast_article_ready_videos: {
        Row: {
          published_on: string | null
          title: string | null
          youtube_id: string | null
        }
        Insert: {
          published_on?: string | null
          title?: string | null
          youtube_id?: string | null
        }
        Update: {
          published_on?: string | null
          title?: string | null
          youtube_id?: string | null
        }
        Relationships: []
      }
      podcast_pending_preparation: {
        Row: {
          created_at: string | null
          preparation_attempted_at: string | null
          title: string | null
          youtube_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episode_queue_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_video_audio"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      podcast_prepared_episodes: {
        Row: {
          position: number | null
          published_on: string | null
          source_folder_created_at: string | null
          title: string | null
          youtube_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episode_queue_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_video_audio"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      podcast_queue_candidates: {
        Row: {
          published_on: string | null
          title: string | null
          uploaded_at: string | null
          youtube_id: string | null
        }
        Relationships: []
      }
      podcast_released_episodes: {
        Row: {
          object_path: string | null
          original_description: string | null
          released_at: string | null
          size_bytes: number | null
          spotify_episode_id: string | null
          title: string | null
          youtube_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episode_queue_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "podcast_video_audio"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
    }
    Functions: {
      admin_channel_classifieds: {
        Args: { p_action?: string; p_actor: string; p_payload?: Json }
        Returns: Json
      }
      admin_channel_classifieds_before_seller_experience: {
        Args: { p_action: string; p_actor: string; p_payload?: Json }
        Returns: Json
      }
      admin_community_manage: {
        Args: { p_action: string; p_actor: string; p_payload?: Json }
        Returns: Json
      }
      admin_community_manage_before_workspace: {
        Args: { p_action: string; p_actor: string; p_payload?: Json }
        Returns: Json
      }
      admin_heatmap: {
        Args: {
          p_days: number
          p_layout: string
          p_path: string
          p_screen: string
        }
        Returns: Json
      }
      admin_heatmap_elements: {
        Args: {
          p_days: number
          p_layout: string
          p_path: string
          p_screen: string
          p_viewport: number
        }
        Returns: Json
      }
      admin_listing_summary: { Args: { p_id: string }; Returns: Json }
      admin_member_metrics: {
        Args: { p_actor: string; p_days?: number }
        Returns: Json
      }
      admin_member_metrics_before_reporting_start: {
        Args: { p_actor: string; p_days?: number }
        Returns: Json
      }
      admin_member_period_metrics: {
        Args: {
          p_actor: string
          p_end?: string
          p_period?: string
          p_start?: string
        }
        Returns: Json
      }
      admin_member_summary: { Args: { p_id: string }; Returns: Json }
      admin_member_summary_before_workspace: {
        Args: { p_id: string }
        Returns: Json
      }
      admin_public_traffic: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      admin_public_traffic_hours: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      admin_quiz_bike_counts_range: {
        Args: { p_since: string; p_until: string }
        Returns: {
          bike_id: string
          bike_name: string
          primary_recommendations: number
          quiz_offer_clicks: number
          secondary_recommendations: number
        }[]
      }
      admin_quiz_bike_metrics: {
        Args: { p_since: string }
        Returns: {
          bike_id: string
          bike_name: string
          primary_recommendations: number
          quiz_offer_clicks: number
          secondary_recommendations: number
        }[]
      }
      admin_quiz_bike_metrics_json: { Args: { p_since: string }; Returns: Json }
      admin_quiz_bikes_range: {
        Args: { p_since: string; p_until: string }
        Returns: Json
      }
      admin_quiz_funnel_metrics: { Args: { p_since: string }; Returns: Json }
      admin_quiz_funnel_range: {
        Args: { p_since: string; p_until: string }
        Returns: Json
      }
      admin_site_analytics_metrics: { Args: { p_since: string }; Returns: Json }
      admin_site_analytics_range: {
        Args: { p_since: string; p_until: string }
        Returns: Json
      }
      attach_podcast_video_audio: {
        Args: {
          p_actor: string
          p_file_name: string
          p_size: number
          p_upload_id: string
          p_youtube_id: string
        }
        Returns: Json
      }
      authorize_podcast_tick: {
        Args: { p_issued_at: string; p_signature: string }
        Returns: string
      }
      authorize_price_alert_hotpipe: {
        Args: { issued_at: string; signature: string }
        Returns: boolean
      }
      authorize_youtube_editorial_tick: {
        Args: { issued_at: string; signature: string; tick_action: string }
        Returns: Json
      }
      claim_podcast_instagram: {
        Args: never
        Returns: {
          claim_token: string | null
          container_id: string | null
          error_code: string | null
          lease_until: string | null
          permalink: string | null
          publish_attempted_at: string | null
          published_at: string | null
          scheduled_at: string | null
          slot_at: string
          status: string
          youtube_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "podcast_instagram_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_price_alert_hotpipe: {
        Args: never
        Returns: {
          alert_id: string
          attempts: number
          created_at: string
          delivered_at: string | null
          event_id: string
          last_http_status: number | null
          lease_token: string | null
          lease_until: string | null
          next_attempt_at: string
          payload: Json
          sequence: number
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "price_alert_hotpipe_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_scheduled_podcast_instagram: {
        Args: never
        Returns: {
          claim_token: string | null
          container_id: string | null
          error_code: string | null
          lease_until: string | null
          permalink: string | null
          publish_attempted_at: string | null
          published_at: string | null
          scheduled_at: string | null
          slot_at: string
          status: string
          youtube_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "podcast_instagram_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_youtube_editorial_cover: { Args: never; Returns: Json }
      claim_youtube_editorial_cover_render: { Args: never; Returns: Json }
      claim_youtube_editorial_publication: { Args: never; Returns: Json }
      claim_youtube_editorial_rewrite: { Args: never; Returns: Json }
      dispatch_podcast_instagram_schedule: { Args: never; Returns: number }
      dispatch_podcast_tick: { Args: never; Returns: number }
      dispatch_price_alert_hotpipe: { Args: never; Returns: number }
      dispatch_youtube_editorial_tick: {
        Args: { tick_action: string }
        Returns: number
      }
      get_bike_price_history: {
        Args: { p_bike_id: string; p_days?: number }
        Returns: Json
      }
      get_bikes_public_catalog: { Args: never; Returns: Json }
      get_price_tracker_catalog: { Args: never; Returns: Json }
      get_published_editorial_article: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_published_editorial_index: { Args: never; Returns: Json }
      get_quiz_catalog: { Args: never; Returns: Json }
      get_radar_offer_click_ranks_30d: {
        Args: never
        Returns: {
          bike_id: string
          relevance_rank: number
        }[]
      }
      import_podcast_video_audio: {
        Args: {
          p_actor: string
          p_file_name: string
          p_size: number
          p_upload_id: string
          p_youtube_id: string
        }
        Returns: Json
      }
      ingest_youtube_editorial_snapshot: {
        Args: { video_ids: string[] }
        Returns: string
      }
      manage_offers_groups: {
        Args: {
          p_action?: string
          p_group_id?: number
          p_name?: string
          p_revision?: number
          p_url?: string
        }
        Returns: Json
      }
      member_available_periods: {
        Args: { p_actor: string; p_target: string }
        Returns: Json
      }
      member_bike_image_public: { Args: { p_id: string }; Returns: string }
      member_bike_listings_public: {
        Args: { p_id?: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      member_billing_authorize: {
        Args: { issued_at: string; signature: string }
        Returns: boolean
      }
      member_billing_checkout: {
        Args: {
          p_actor: string
          p_contact: boolean
          p_id: string
          p_method: string
          p_monthly: boolean
        }
        Returns: Json
      }
      member_billing_claim_cancellations: {
        Args: never
        Returns: {
          amount_cents: number
          attempts: number
          authorization_id: string | null
          billing_model: string
          cancel_requested_at: string | null
          cancelled_at: string | null
          checkout_expires_at: string | null
          checkout_id: string | null
          conciliation_id: string | null
          contact_consent_at: string
          created_at: string
          customer_id: string | null
          display_days: number
          display_started_at: string | null
          error_code: string | null
          financial_started: boolean
          hold: boolean
          id: string
          lease_token: string | null
          lease_until: string | null
          listing_id: string
          listing_revision: string
          method: string
          monthly_accepted_at: string
          monthly_cents: number
          next_attempt_at: string
          paid_at: string | null
          paid_until: string | null
          payment_url: string | null
          pix_image: string | null
          pix_payload: string | null
          provider_billing_type: string | null
          publish_requested: boolean
          purchase_accepted_at: string | null
          purchased_listing_id: string
          qr_expires_at: string | null
          renewal_status: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "member_listing_billing"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      member_billing_claim_events: {
        Args: never
        Returns: {
          attempts: number
          available_at: string
          created_at: string
          id: string
          kind: string
          lease_token: string | null
          lease_until: string | null
          order_reference: string | null
          resource_id: string
          resource_type: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "member_billing_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      member_billing_claim_uncertain: {
        Args: never
        Returns: {
          amount_cents: number
          attempts: number
          authorization_id: string | null
          billing_model: string
          cancel_requested_at: string | null
          cancelled_at: string | null
          checkout_expires_at: string | null
          checkout_id: string | null
          conciliation_id: string | null
          contact_consent_at: string
          created_at: string
          customer_id: string | null
          display_days: number
          display_started_at: string | null
          error_code: string | null
          financial_started: boolean
          hold: boolean
          id: string
          lease_token: string | null
          lease_until: string | null
          listing_id: string
          listing_revision: string
          method: string
          monthly_accepted_at: string
          monthly_cents: number
          next_attempt_at: string
          paid_at: string | null
          paid_until: string | null
          payment_url: string | null
          pix_image: string | null
          pix_payload: string | null
          provider_billing_type: string | null
          publish_requested: boolean
          purchase_accepted_at: string | null
          purchased_listing_id: string
          qr_expires_at: string | null
          renewal_status: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "member_listing_billing"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      member_billing_dispatch: { Args: never; Returns: number }
      member_billing_expire_periods: { Args: never; Returns: undefined }
      member_billing_expire_periods_before_courtesies: {
        Args: never
        Returns: undefined
      }
      member_billing_purchase: {
        Args: {
          p_accepted: boolean
          p_actor: string
          p_contact: boolean
          p_id: string
        }
        Returns: Json
      }
      member_billing_purchase_before_courtesies: {
        Args: {
          p_accepted: boolean
          p_actor: string
          p_contact: boolean
          p_id: string
        }
        Returns: Json
      }
      member_billing_purchase_before_seller_experience: {
        Args: {
          p_accepted: boolean
          p_actor: string
          p_contact: boolean
          p_id: string
        }
        Returns: Json
      }
      member_billing_recalculate: {
        Args: { p_order: string }
        Returns: undefined
      }
      member_billing_recalculate_before_seller_experience: {
        Args: { p_order: string }
        Returns: undefined
      }
      member_billing_record_payment: {
        Args: {
          p_due: string
          p_observed: string
          p_order: string
          p_paid: boolean
          p_payment: string
          p_status: string
        }
        Returns: undefined
      }
      member_billing_record_payment_before_seller_experience: {
        Args: {
          p_due: string
          p_observed: string
          p_order: string
          p_paid: boolean
          p_payment: string
          p_status: string
        }
        Returns: undefined
      }
      member_claim_period: {
        Args: { p_actor: string; p_order: string; p_target: string }
        Returns: undefined
      }
      member_claim_period_before_courtesies: {
        Args: { p_actor: string; p_order: string; p_target: string }
        Returns: undefined
      }
      member_classifieds: {
        Args: { p_action?: string; p_payload?: Json }
        Returns: Json
      }
      member_classifieds_before_courtesies: {
        Args: { p_action?: string; p_payload?: Json }
        Returns: Json
      }
      member_classifieds_before_seller_experience: {
        Args: { p_action?: string; p_payload?: Json }
        Returns: Json
      }
      member_classifieds_pilot: { Args: { p_actor: string }; Returns: boolean }
      member_classifieds_visible: { Args: { p_user: string }; Returns: boolean }
      member_community: {
        Args: { p_action: string; p_payload?: Json }
        Returns: Json
      }
      member_community_account: {
        Args: { p_action?: string; p_payload?: Json }
        Returns: Json
      }
      member_courtesy_entitled: { Args: { p_id: string }; Returns: boolean }
      member_courtesy_periods: {
        Args: { p_actor: string; p_target: string }
        Returns: Json
      }
      member_google_email: { Args: never; Returns: Json }
      member_identity: {
        Args: { p_action?: string; p_payload?: Json }
        Returns: Json
      }
      member_identity_service: {
        Args: { p_action: string; p_actor: string; p_payload?: Json }
        Returns: Json
      }
      member_identity_verified: { Args: { p_user: string }; Returns: boolean }
      member_listing_entitled: { Args: { p_id: string }; Returns: boolean }
      member_listing_entitled_before_courtesies: {
        Args: { p_id: string }
        Returns: boolean
      }
      member_listing_has_content: {
        Args: {
          p_listing: Database["public"]["Tables"]["member_bike_listings"]["Row"]
        }
        Returns: boolean
      }
      member_listing_json: {
        Args: {
          p_listing: Database["public"]["Tables"]["member_bike_listings"]["Row"]
        }
        Returns: Json
      }
      member_listing_json_before_courtesies: {
        Args: {
          p_listing: Database["public"]["Tables"]["member_bike_listings"]["Row"]
        }
        Returns: Json
      }
      member_listing_json_before_seller_experience: {
        Args: {
          p_listing: Database["public"]["Tables"]["member_bike_listings"]["Row"]
        }
        Returns: Json
      }
      member_listing_metrics: { Args: { p_id: string }; Returns: Json }
      member_listing_reorder: {
        Args: { p_id: string; p_images: Json }
        Returns: undefined
      }
      member_listing_track: {
        Args: { p_event: string; p_id: string; p_visitor: string }
        Returns: undefined
      }
      member_listing_visible: { Args: { p_id: string }; Returns: boolean }
      member_listing_visible_before_seller_experience: {
        Args: { p_id: string }
        Returns: boolean
      }
      member_media_access: {
        Args: { p_operation: string; p_path: string }
        Returns: boolean
      }
      member_metrics_between: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      member_operation_alert_claim: {
        Args: never
        Returns: {
          accepted_at: string | null
          attempts: number
          available_at: string
          created_at: string
          delivery_body: string | null
          delivery_from: string | null
          delivery_to: string | null
          error_code: string | null
          event_kind: string
          first_attempt_at: string | null
          id: string
          lease_token: string | null
          lease_until: string | null
          payload: Json
          provider_id: string | null
          source_id: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "member_operation_alerts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      member_operation_alert_finish: {
        Args: {
          p_error?: string
          p_id: string
          p_lease: string
          p_provider?: string
        }
        Returns: boolean
      }
      member_operation_alert_prepare: {
        Args: { p_body: string; p_id: string; p_lease: string }
        Returns: string
      }
      member_password_recovery_budget: {
        Args: { p_email: string; p_fingerprint: string }
        Returns: boolean
      }
      member_radar_favorites: {
        Args: { p_action: string; p_bike_id?: string; p_saved?: boolean }
        Returns: Json
      }
      member_referrals: { Args: never; Returns: Json }
      member_reporting_period: {
        Args: {
          p_end?: string
          p_now?: string
          p_period: string
          p_start?: string
        }
        Returns: Json
      }
      newsletter_acquire: { Args: never; Returns: string }
      newsletter_authorize: {
        Args: { issued_at: string; signature: string }
        Returns: boolean
      }
      newsletter_campaign_report: { Args: never; Returns: Json }
      newsletter_dispatch: { Args: never; Returns: number }
      newsletter_form_campaign: {
        Args: {
          p_clock?: string
          p_day: string
          p_fingerprint: string
          p_payload: Json
          p_segment: string
          tok: string
        }
        Returns: string
      }
      newsletter_live_recipients: {
        Args: { p_campaign: string }
        Returns: {
          consent_at: string
          email: string
          id: string
          person_name: string
          resend_contact_id: string
          synced: boolean
        }[]
      }
      newsletter_next_edition_number: { Args: never; Returns: number }
      newsletter_people: {
        Args: { p_campaign?: string; p_filter?: string; p_page?: number }
        Returns: Json
      }
      newsletter_record_event: {
        Args: {
          p_broadcast?: string
          p_contact: string
          p_email_id?: string
          p_emails: string[]
          p_id: string
          p_occurred: string
          p_type: string
        }
        Returns: boolean
      }
      newsletter_referral_service: {
        Args: { p_action: string; p_payload?: Json }
        Returns: Json
      }
      newsletter_release: { Args: { tok: string }; Returns: undefined }
      newsletter_renew: { Args: { tok: string }; Returns: boolean }
      newsletter_set_enabled: {
        Args: { actor_id: string; p_enabled: boolean }
        Returns: undefined
      }
      podcast_release_slot: { Args: { p_now: string }; Returns: string }
      podcast_upcoming_windows: { Args: never; Returns: string[] }
      podcast_worker_windows: { Args: never; Returns: Json }
      project_bike_offers_from_snapshot: {
        Args: { p_rows: Json }
        Returns: Json
      }
      project_bikes_from_snapshot: { Args: { p_rows: Json }; Returns: Json }
      public_video_catalog: { Args: never; Returns: Json }
      reconcile_youtube_editorial_stalls: { Args: never; Returns: Json }
      record_heatmap_batch: {
        Args: {
          p_bins: Json
          p_layout: string
          p_path: string
          p_screen: string
        }
        Returns: undefined
      }
      record_heatmap_elements: {
        Args: {
          p_bins: Json
          p_layout: string
          p_path: string
          p_screen: string
          p_viewport: number
        }
        Returns: undefined
      }
      record_site_analytics: {
        Args: {
          p_bike_id: string
          p_event_name: string
          p_position: string
          p_source_path: string
          p_target_path: string
        }
        Returns: undefined
      }
      release_next_podcast_episode: {
        Args: { p_now?: string }
        Returns: string
      }
      schedule_podcast_instagram_delivery: {
        Args: { p_episode_id: string; p_local_time: string }
        Returns: string
      }
      track_quiz_funnel_session: {
        Args: {
          p_device?: string
          p_event: string
          p_path?: string
          p_referrer?: string
          p_session_id: string
          p_step?: number
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
        }
        Returns: undefined
      }
      update_offers_group_url: {
        Args: { p_revision: number; p_url: string }
        Returns: Json
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
