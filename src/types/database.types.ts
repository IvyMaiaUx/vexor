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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          resource_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description_en: string | null
          description_pt: string | null
          id: string
          is_active: boolean
          name_en: string
          name_pt: string
          scope: Database["public"]["Enums"]["category_scope"]
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_pt: string
          scope?: Database["public"]["Enums"]["category_scope"]
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_pt?: string
          scope?: Database["public"]["Enums"]["category_scope"]
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      direct_conversation_members: {
        Row: {
          conversation_id: string
          is_archived: boolean
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_archived?: boolean
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_archived?: boolean
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_high: string
          participant_low: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_high: string
          participant_low: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_high?: string
          participant_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_conversations_participant_high_fkey"
            columns: ["participant_high"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversations_participant_high_fkey"
            columns: ["participant_high"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversations_participant_low_fkey"
            columns: ["participant_low"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversations_participant_low_fkey"
            columns: ["participant_low"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          sender_id: string | null
          status: Database["public"]["Enums"]["content_status"]
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          metadata: Json
          post_id: string | null
          read_at: string | null
          research_id: string | null
          resource_id: string | null
          topic_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          warning_id: string | null
        }
        Insert: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json
          post_id?: string | null
          read_at?: string | null
          research_id?: string | null
          resource_id?: string | null
          topic_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          warning_id?: string | null
        }
        Update: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json
          post_id?: string | null
          read_at?: string | null
          research_id?: string | null
          resource_id?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
          warning_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_warning_id_fkey"
            columns: ["warning_id"]
            isOneToOne: false
            referencedRelation: "user_warnings"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["content_status"]
          topic_id: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["content_status"]
          topic_id: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["content_status"]
          topic_id?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          github_url: string | null
          id: string
          interests: string[]
          is_suspended: boolean
          linkedin_url: string | null
          preferred_locale: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          github_url?: string | null
          id: string
          interests?: string[]
          is_suspended?: boolean
          linkedin_url?: string | null
          preferred_locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          github_url?: string | null
          id?: string
          interests?: string[]
          is_suspended?: boolean
          linkedin_url?: string | null
          preferred_locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reported_message_snapshots: {
        Row: {
          body_snapshot: string
          captured_by: string | null
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          retention_until: string
          sender_id: string | null
          sent_at: string
        }
        Insert: {
          body_snapshot: string
          captured_by?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          retention_until?: string
          sender_id?: string | null
          sent_at: string
        }
        Update: {
          body_snapshot?: string
          captured_by?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          retention_until?: string
          sender_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_message_snapshots_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reported_message_snapshots_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reported_message_snapshots_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reported_message_snapshots_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          message_id: string | null
          message_snapshot_id: string | null
          post_id: string | null
          profile_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          research_id: string | null
          resolution_note: string | null
          resource_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message_id?: string | null
          message_snapshot_id?: string | null
          post_id?: string | null
          profile_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          research_id?: string | null
          resolution_note?: string | null
          resource_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message_id?: string | null
          message_snapshot_id?: string | null
          post_id?: string | null
          profile_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          research_id?: string | null
          resolution_note?: string | null
          resource_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_message_snapshot_id_fkey"
            columns: ["message_snapshot_id"]
            isOneToOne: false
            referencedRelation: "reported_message_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      research_recipients: {
        Row: {
          created_at: string
          granted_by: string | null
          justification: string | null
          research_id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          justification?: string | null
          research_id: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          justification?: string | null
          research_id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_recipients_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_recipients_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_recipients_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_recipients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_recipients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_submissions: {
        Row: {
          attack_techniques: string[]
          author_id: string | null
          body_en: string | null
          body_pt: string
          category_id: string
          confidence_level: string | null
          created_at: string
          cves: string[]
          domain: Database["public"]["Enums"]["research_domain"]
          id: string
          methodology: string | null
          published_at: string | null
          read_time_minutes: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["research_severity"]
          slug: string
          source_references: Json
          status: Database["public"]["Enums"]["research_status"]
          summary_en: string | null
          summary_pt: string
          title_en: string | null
          title_pt: string
          tlp: Database["public"]["Enums"]["research_tlp"]
          updated_at: string
        }
        Insert: {
          attack_techniques?: string[]
          author_id?: string | null
          body_en?: string | null
          body_pt: string
          category_id: string
          confidence_level?: string | null
          created_at?: string
          cves?: string[]
          domain: Database["public"]["Enums"]["research_domain"]
          id?: string
          methodology?: string | null
          published_at?: string | null
          read_time_minutes?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["research_severity"]
          slug: string
          source_references?: Json
          status?: Database["public"]["Enums"]["research_status"]
          summary_en?: string | null
          summary_pt: string
          title_en?: string | null
          title_pt: string
          tlp?: Database["public"]["Enums"]["research_tlp"]
          updated_at?: string
        }
        Update: {
          attack_techniques?: string[]
          author_id?: string | null
          body_en?: string | null
          body_pt?: string
          category_id?: string
          confidence_level?: string | null
          created_at?: string
          cves?: string[]
          domain?: Database["public"]["Enums"]["research_domain"]
          id?: string
          methodology?: string | null
          published_at?: string | null
          read_time_minutes?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["research_severity"]
          slug?: string
          source_references?: Json
          status?: Database["public"]["Enums"]["research_status"]
          summary_en?: string | null
          summary_pt?: string
          title_en?: string | null
          title_pt?: string
          tlp?: Database["public"]["Enums"]["research_tlp"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_submissions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_submissions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          author_name: string | null
          category_id: string
          course_metadata: Json | null
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          free_tier_limits: string | null
          id: string
          language: string
          name: string
          pricing_model: string | null
          pricing_notes: string | null
          published_at: string | null
          rejection_reason: string | null
          requires_credit_card: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_vector: unknown
          slug: string
          status: Database["public"]["Enums"]["resource_status"]
          submitted_by: string | null
          tags: string[]
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          url: string
        }
        Insert: {
          author_name?: string | null
          category_id: string
          course_metadata?: Json | null
          created_at?: string
          description: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          free_tier_limits?: string | null
          id?: string
          language?: string
          name: string
          pricing_model?: string | null
          pricing_notes?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          requires_credit_card?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          slug: string
          status?: Database["public"]["Enums"]["resource_status"]
          submitted_by?: string | null
          tags?: string[]
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url: string
        }
        Update: {
          author_name?: string | null
          category_id?: string
          course_metadata?: Json | null
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          free_tier_limits?: string | null
          id?: string
          language?: string
          name?: string
          pricing_model?: string | null
          pricing_notes?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          requires_credit_card?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["resource_status"]
          submitted_by?: string | null
          tags?: string[]
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      topic_tags: {
        Row: {
          tag_id: string
          topic_id: string
        }
        Insert: {
          tag_id: string
          topic_id: string
        }
        Update: {
          tag_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_tags_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_votes: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_votes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          accepted_post_id: string | null
          author_id: string | null
          body: string
          category_id: string
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          kind: Database["public"]["Enums"]["topic_kind"]
          last_activity_at: string
          resource_id: string | null
          search_vector: unknown
          shared_url: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          accepted_post_id?: string | null
          author_id?: string | null
          body: string
          category_id: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          kind?: Database["public"]["Enums"]["topic_kind"]
          last_activity_at?: string
          resource_id?: string | null
          search_vector?: unknown
          shared_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          accepted_post_id?: string | null
          author_id?: string | null
          body?: string
          category_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          kind?: Database["public"]["Enums"]["topic_kind"]
          last_activity_at?: string
          resource_id?: string | null
          search_vector?: unknown
          shared_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_accepted_post_fk"
            columns: ["accepted_post_id", "id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id", "topic_id"]
          },
          {
            foreignKeyName: "topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          description: string
          id: string
          moderator_id: string | null
          post_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          report_id: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          severity: Database["public"]["Enums"]["warning_severity"]
          status: Database["public"]["Enums"]["warning_status"]
          topic_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          description: string
          id?: string
          moderator_id?: string | null
          post_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          report_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          severity?: Database["public"]["Enums"]["warning_severity"]
          status?: Database["public"]["Enums"]["warning_status"]
          topic_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          description?: string
          id?: string
          moderator_id?: string | null
          post_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          report_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          severity?: Database["public"]["Enums"]["warning_severity"]
          status?: Database["public"]["Enums"]["warning_status"]
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          github_url: string | null
          id: string | null
          interests: string[] | null
          linkedin_url: string | null
          preferred_locale: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          github_url?: string | null
          id?: string | null
          interests?: string[] | null
          linkedin_url?: string | null
          preferred_locale?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          github_url?: string | null
          id?: string | null
          interests?: string[] | null
          linkedin_url?: string | null
          preferred_locale?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      acknowledge_user_warning: {
        Args: { p_warning_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_user_suspension: {
        Args: { p_reason?: string; p_suspended: boolean; p_user_id: string }
        Returns: undefined
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_or_create_dm_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      get_reported_message_evidence: {
        Args: { p_report_id: string }
        Returns: {
          body_snapshot: string
          conversation_id: string
          message_id: string
          retention_until: string
          sender_id: string
          sent_at: string
          snapshot_id: string
        }[]
      }
      grant_research_recipient: {
        Args: {
          p_justification?: string
          p_research_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_active_member: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_dm_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_moderator: { Args: never; Returns: boolean }
      is_research_author: { Args: { p_research_id: string }; Returns: boolean }
      issue_user_warning: {
        Args: {
          p_description: string
          p_post_id?: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_report_id?: string
          p_severity: Database["public"]["Enums"]["warning_severity"]
          p_topic_id?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_dm_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: string
      }
      moderate_post: {
        Args: { p_action: string; p_post_id: string; p_reason?: string }
        Returns: undefined
      }
      moderate_research: {
        Args: {
          p_decision: Database["public"]["Enums"]["research_status"]
          p_reason?: string
          p_research_id: string
        }
        Returns: undefined
      }
      moderate_resource: {
        Args: {
          p_decision: Database["public"]["Enums"]["resource_status"]
          p_reason?: string
          p_resource_id: string
        }
        Returns: undefined
      }
      moderate_topic: {
        Args: { p_action: string; p_reason?: string; p_topic_id: string }
        Returns: undefined
      }
      normalize_resource_url: { Args: { p_url: string }; Returns: string }
      notify_mentions: {
        Args: {
          p_actor_id: string
          p_body: string
          p_post_id?: string
          p_topic_id: string
        }
        Returns: number
      }
      report_direct_message: {
        Args: {
          p_details?: string
          p_message_id: string
          p_reason: Database["public"]["Enums"]["report_reason"]
        }
        Returns: string
      }
      research_valid_code_array: {
        Args: { p_items: string[]; p_max_len: number; p_pattern: string }
        Returns: boolean
      }
      resolve_report: {
        Args: {
          p_note?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      resubmit_research: {
        Args: {
          p_attack_techniques?: string[]
          p_body_en?: string
          p_body_pt: string
          p_category_id: string
          p_confidence_level?: string
          p_cves?: string[]
          p_domain: Database["public"]["Enums"]["research_domain"]
          p_methodology?: string
          p_read_time_minutes?: number
          p_research_id: string
          p_severity: Database["public"]["Enums"]["research_severity"]
          p_source_references?: Json
          p_summary_en?: string
          p_summary_pt: string
          p_title_en?: string
          p_title_pt: string
          p_tlp: Database["public"]["Enums"]["research_tlp"]
        }
        Returns: undefined
      }
      resubmit_resource: { Args: { p_resource_id: string }; Returns: undefined }
      revoke_research_recipient: {
        Args: { p_research_id: string; p_user_id: string }
        Returns: undefined
      }
      revoke_user_warning: {
        Args: { p_reason: string; p_warning_id: string }
        Returns: undefined
      }
      send_direct_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: string
      }
      set_accepted_post: {
        Args: { p_post_id?: string; p_topic_id: string }
        Returns: undefined
      }
      topic_has_replies: { Args: { p_topic_id: string }; Returns: boolean }
      write_audit_log: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      category_scope: "resource" | "forum" | "both" | "research"
      content_status: "published" | "hidden" | "deleted"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      notification_type:
        | "topic_reply"
        | "solution_accepted"
        | "resource_approved"
        | "resource_rejected"
        | "research_approved"
        | "research_rejected"
        | "topic_upvoted"
        | "post_upvoted"
        | "post_reply"
        | "mention"
        | "direct_message"
        | "user_warning"
        | "content_hidden"
        | "content_removed"
      report_reason:
        | "spam"
        | "malicious_content"
        | "personal_data"
        | "harassment"
        | "unauthorized_attack"
        | "copyright"
        | "other"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      research_domain:
        | "malware"
        | "ransomware"
        | "apt"
        | "darkweb"
        | "fraud"
        | "botnets"
        | "identity"
        | "legal"
      research_severity: "critical" | "high" | "medium" | "info"
      research_status: "pending" | "approved" | "rejected" | "archived"
      research_tlp: "CLEAR" | "GREEN" | "AMBER" | "AMBER+" | "RED"
      resource_status: "pending" | "approved" | "rejected" | "archived"
      resource_type:
        | "tool"
        | "repository"
        | "script"
        | "framework"
        | "documentation"
        | "lab"
        | "ctf_platform"
        | "course"
        | "article"
      topic_kind: "discussion" | "question" | "tool_share" | "note"
      user_role: "member" | "moderator" | "admin"
      warning_severity: "low" | "medium" | "high"
      warning_status: "active" | "acknowledged" | "revoked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      bucket_lifecycle_states: {
        Row: {
          bucket_id: string
          claim_id: string | null
          claim_until: string | null
          continuation: Json | null
          failure_count: number
          generation: string | null
          last_completed_at: string | null
          last_error: Json | null
          last_result: Json | null
          last_started_at: string | null
          last_success_at: string | null
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          bucket_id: string
          claim_id?: string | null
          claim_until?: string | null
          continuation?: Json | null
          failure_count?: number
          generation?: string | null
          last_completed_at?: string | null
          last_error?: Json | null
          last_result?: Json | null
          last_started_at?: string | null
          last_success_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          claim_id?: string | null
          claim_until?: string | null
          continuation?: Json | null
          failure_count?: number
          generation?: string | null
          last_completed_at?: string | null
          last_error?: Json | null
          last_result?: Json | null
          last_started_at?: string | null
          last_success_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_lifecycle_states_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: true
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          lifecycle_configuration: Json | null
          lifecycle_configuration_generation: string | null
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          lifecycle_configuration?: Json | null
          lifecycle_configuration_generation?: string | null
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          lifecycle_configuration?: Json | null
          lifecycle_configuration_generation?: string | null
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      lifecycle_abandoned_artifacts: {
        Row: {
          attempted_at: string
          bucket_id: string
          key: string
          name: string
          version: string | null
        }
        Insert: {
          attempted_at?: string
          bucket_id: string
          key: string
          name: string
          version?: string | null
        }
        Update: {
          attempted_at?: string
          bucket_id?: string
          key?: string
          name?: string
          version?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_lifecycle_objects: {
        Args: { object_ids: string[] }
        Returns: {
          id: string
          is_delete_marker: boolean
          metadata: Json
        }[]
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: { delete_markers?: string; noncurrent_versions?: string }
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
          raw_prefix_param?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delete_markers?: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          next_token_archived_at?: string
          next_token_version?: string
          noncurrent_versions?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      operation: { Args: never; Returns: string }
      reconcile_lifecycle_state: {
        Args: { policy_changed: boolean; target_bucket_id: string }
        Returns: undefined
      }
      search: {
        Args: {
          bucketname: string
          delete_markers?: string
          levels?: number
          limits?: number
          noncurrent_versions?: string
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          delete_markers?: string
          noncurrent_versions?: string
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
          p_start_after_version?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          delete_markers?: string
          levels?: number
          limits?: number
          noncurrent_versions?: string
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
          start_after_archived_at?: string
          start_after_is_continuation?: boolean
          start_after_version?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_scope: ["resource", "forum", "both", "research"],
      content_status: ["published", "hidden", "deleted"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      notification_type: [
        "topic_reply",
        "solution_accepted",
        "resource_approved",
        "resource_rejected",
        "research_approved",
        "research_rejected",
        "topic_upvoted",
        "post_upvoted",
        "post_reply",
        "mention",
        "direct_message",
        "user_warning",
        "content_hidden",
        "content_removed",
      ],
      report_reason: [
        "spam",
        "malicious_content",
        "personal_data",
        "harassment",
        "unauthorized_attack",
        "copyright",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      research_domain: [
        "malware",
        "ransomware",
        "apt",
        "darkweb",
        "fraud",
        "botnets",
        "identity",
        "legal",
      ],
      research_severity: ["critical", "high", "medium", "info"],
      research_status: ["pending", "approved", "rejected", "archived"],
      research_tlp: ["CLEAR", "GREEN", "AMBER", "AMBER+", "RED"],
      resource_status: ["pending", "approved", "rejected", "archived"],
      resource_type: [
        "tool",
        "repository",
        "script",
        "framework",
        "documentation",
        "lab",
        "ctf_platform",
        "course",
        "article",
      ],
      topic_kind: ["discussion", "question", "tool_share", "note"],
      user_role: ["member", "moderator", "admin"],
      warning_severity: ["low", "medium", "high"],
      warning_status: ["active", "acknowledged", "revoked"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
