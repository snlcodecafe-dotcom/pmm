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
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_path: string | null
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          page_path?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_settings: {
        Row: {
          default_image_url: string | null
          end_time: string
          id: number
          is_enabled: boolean
          last_generated_for: string | null
          platforms: string[]
          posts_per_day: number
          start_time: string
          updated_at: string
        }
        Insert: {
          default_image_url?: string | null
          end_time?: string
          id: number
          is_enabled?: boolean
          last_generated_for?: string | null
          platforms?: string[]
          posts_per_day?: number
          start_time?: string
          updated_at?: string
        }
        Update: {
          default_image_url?: string | null
          end_time?: string
          id?: number
          is_enabled?: boolean
          last_generated_for?: string | null
          platforms?: string[]
          posts_per_day?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_activity_log: {
        Row: {
          action_detail: string
          action_type: string
          created_at: string
          id: string
          platform: string
          status: string
          token_symbol: string
        }
        Insert: {
          action_detail: string
          action_type: string
          created_at?: string
          id?: string
          platform: string
          status?: string
          token_symbol: string
        }
        Update: {
          action_detail?: string
          action_type?: string
          created_at?: string
          id?: string
          platform?: string
          status?: string
          token_symbol?: string
        }
        Relationships: []
      }
      campaign_execution_logs: {
        Row: {
          action_type: string
          error_message: string | null
          executed_at: string
          external_url: string | null
          id: string
          platform: string
          request_payload: Json | null
          response_payload: Json | null
          status: string
          submission_id: string | null
        }
        Insert: {
          action_type: string
          error_message?: string | null
          executed_at?: string
          external_url?: string | null
          id?: string
          platform: string
          request_payload?: Json | null
          response_payload?: Json | null
          status: string
          submission_id?: string | null
        }
        Update: {
          action_type?: string
          error_message?: string | null
          executed_at?: string
          external_url?: string | null
          id?: string
          platform?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_execution_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "token_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string
          created_at: string
          current_participants: number | null
          description: string | null
          end_time: string | null
          id: string
          name: string
          reward_pool: number | null
          start_time: string | null
          status: string
          target_participants: number | null
          token_address: string | null
          token_symbol: string | null
        }
        Insert: {
          campaign_type?: string
          created_at?: string
          current_participants?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          name: string
          reward_pool?: number | null
          start_time?: string | null
          status?: string
          target_participants?: number | null
          token_address?: string | null
          token_symbol?: string | null
        }
        Update: {
          campaign_type?: string
          created_at?: string
          current_participants?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          name?: string
          reward_pool?: number | null
          start_time?: string | null
          status?: string
          target_participants?: number | null
          token_address?: string | null
          token_symbol?: string | null
        }
        Relationships: []
      }
      community_missions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reward_sol: number
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reward_sol?: number
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reward_sol?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      content_schedule: {
        Row: {
          created_at: string
          id: string
          platform: string
          posted_at: string | null
          scheduled_at: string
          status: string
          viral_content_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          posted_at?: string | null
          scheduled_at: string
          status?: string
          viral_content_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          posted_at?: string | null
          scheduled_at?: string
          status?: string
          viral_content_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_schedule_viral_content_id_fkey"
            columns: ["viral_content_id"]
            isOneToOne: false
            referencedRelation: "viral_content"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_webhooks: {
        Row: {
          channel_name: string | null
          created_at: string
          id: string
          is_active: boolean
          last_post_at: string | null
          server_name: string
          total_posts: number
          webhook_url: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_post_at?: string | null
          server_name: string
          total_posts?: number
          webhook_url: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_post_at?: string | null
          server_name?: string
          total_posts?: number
          webhook_url?: string
        }
        Relationships: []
      }
      engagement_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json
          user_id: string | null
          viral_content_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id?: string | null
          viral_content_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id?: string | null
          viral_content_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_actions_viral_content_id_fkey"
            columns: ["viral_content_id"]
            isOneToOne: false
            referencedRelation: "viral_content"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_type: string
          balance_sol: number
          created_at: string
          id: string
          label: string | null
          scope_token: string | null
          scope_user: string | null
        }
        Insert: {
          account_type: string
          balance_sol?: number
          created_at?: string
          id?: string
          label?: string | null
          scope_token?: string | null
          scope_user?: string | null
        }
        Update: {
          account_type?: string
          balance_sol?: number
          created_at?: string
          id?: string
          label?: string | null
          scope_token?: string | null
          scope_user?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount_sol: number
          amount_usd_at_time: number | null
          created_at: string
          destination: string | null
          destination_account_id: string | null
          id: string
          network: string | null
          notes: string | null
          occurred_at: string
          partner_user_id: string | null
          referral_code: string | null
          related_earning_id: string | null
          related_submission_id: string | null
          sol_usd_at_time: number | null
          source: string | null
          source_account_id: string | null
          token_address: string | null
          token_symbol: string | null
          tx_signature: string | null
          tx_type: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          amount_sol?: number
          amount_usd_at_time?: number | null
          created_at?: string
          destination?: string | null
          destination_account_id?: string | null
          id?: string
          network?: string | null
          notes?: string | null
          occurred_at?: string
          partner_user_id?: string | null
          referral_code?: string | null
          related_earning_id?: string | null
          related_submission_id?: string | null
          sol_usd_at_time?: number | null
          source?: string | null
          source_account_id?: string | null
          token_address?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          tx_type: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          amount_sol?: number
          amount_usd_at_time?: number | null
          created_at?: string
          destination?: string | null
          destination_account_id?: string | null
          id?: string
          network?: string | null
          notes?: string | null
          occurred_at?: string
          partner_user_id?: string | null
          referral_code?: string | null
          related_earning_id?: string | null
          related_submission_id?: string | null
          sol_usd_at_time?: number | null
          source?: string | null
          source_account_id?: string | null
          token_address?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          tx_type?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_related_earning_id_fkey"
            columns: ["related_earning_id"]
            isOneToOne: false
            referencedRelation: "partner_earnings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_related_submission_id_fkey"
            columns: ["related_submission_id"]
            isOneToOne: false
            referencedRelation: "token_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_posts: {
        Row: {
          content: string
          content_hash: string
          created_at: string
          error_message: string | null
          external_ref: string | null
          id: string
          image_url: string | null
          platform: string
          posted_at: string | null
          scheduled_time: string
          status: string
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string
          error_message?: string | null
          external_ref?: string | null
          id?: string
          image_url?: string | null
          platform: string
          posted_at?: string | null
          scheduled_time: string
          status?: string
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string
          error_message?: string | null
          external_ref?: string | null
          id?: string
          image_url?: string | null
          platform?: string
          posted_at?: string | null
          scheduled_time?: string
          status?: string
        }
        Relationships: []
      }
      metadata: {
        Row: {
          created_at: string
          id: string
          payload: Json
          token_address: string | null
          uri: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          token_address?: string | null
          uri?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          token_address?: string | null
          uri?: string | null
        }
        Relationships: []
      }
      partner_channels: {
        Row: {
          bot_is_admin: boolean
          created_at: string
          discord_invite_link: string | null
          discord_server_name: string | null
          id: string
          joined_main_channel: boolean
          last_checked_at: string | null
          platform: string
          referral_code: string | null
          rejection_reason: string | null
          subscriber_count: number
          telegram_channel_id: string | null
          telegram_channel_link: string | null
          telegram_channel_name: string | null
          tier_percent: number
          updated_at: string
          user_id: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          bot_is_admin?: boolean
          created_at?: string
          discord_invite_link?: string | null
          discord_server_name?: string | null
          id?: string
          joined_main_channel?: boolean
          last_checked_at?: string | null
          platform?: string
          referral_code?: string | null
          rejection_reason?: string | null
          subscriber_count?: number
          telegram_channel_id?: string | null
          telegram_channel_link?: string | null
          telegram_channel_name?: string | null
          tier_percent?: number
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          bot_is_admin?: boolean
          created_at?: string
          discord_invite_link?: string | null
          discord_server_name?: string | null
          id?: string
          joined_main_channel?: boolean
          last_checked_at?: string | null
          platform?: string
          referral_code?: string | null
          rejection_reason?: string | null
          subscriber_count?: number
          telegram_channel_id?: string | null
          telegram_channel_link?: string | null
          telegram_channel_name?: string | null
          tier_percent?: number
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      partner_earnings: {
        Row: {
          channel_id: string | null
          commission_sol: number
          created_at: string
          id: string
          paid_at: string | null
          partner_user_id: string
          payout_status: string
          payout_tx_signature: string | null
          referral_code: string | null
          tier_percent_at_time: number
          token_submission_id: string | null
        }
        Insert: {
          channel_id?: string | null
          commission_sol?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_user_id: string
          payout_status?: string
          payout_tx_signature?: string | null
          referral_code?: string | null
          tier_percent_at_time?: number
          token_submission_id?: string | null
        }
        Update: {
          channel_id?: string | null
          commission_sol?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_user_id?: string
          payout_status?: string
          payout_tx_signature?: string | null
          referral_code?: string | null
          tier_percent_at_time?: number
          token_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_earnings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "partner_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_earnings_token_submission_id_fkey"
            columns: ["token_submission_id"]
            isOneToOne: false
            referencedRelation: "token_submissions"
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
          id: string
          onboarding_completed: boolean
          primary_role: Database["public"]["Enums"]["primary_role"] | null
          primary_wallet: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          primary_role?: Database["public"]["Enums"]["primary_role"] | null
          primary_wallet?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          primary_role?: Database["public"]["Enums"]["primary_role"] | null
          primary_wallet?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          total_points_earned: number
          user_id: string | null
          uses_count: number
          wallet_address: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          total_points_earned?: number
          user_id?: string | null
          uses_count?: number
          wallet_address?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          total_points_earned?: number
          user_id?: string | null
          uses_count?: number
          wallet_address?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          likes: number | null
          platform: string
          post_text: string
          reactions: number | null
          shares: number | null
          token_submission_id: string | null
          views: number | null
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          likes?: number | null
          platform: string
          post_text: string
          reactions?: number | null
          shares?: number | null
          token_submission_id?: string | null
          views?: number | null
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          likes?: number | null
          platform?: string
          post_text?: string
          reactions?: number | null
          shares?: number | null
          token_submission_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_token_submission_id_fkey"
            columns: ["token_submission_id"]
            isOneToOne: false
            referencedRelation: "token_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sol_price_snapshots: {
        Row: {
          captured_at: string
          id: string
          price_usd: number
          source: string
        }
        Insert: {
          captured_at?: string
          id?: string
          price_usd: number
          source?: string
        }
        Update: {
          captured_at?: string
          id?: string
          price_usd?: number
          source?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      telegram_bot_users: {
        Row: {
          first_name: string | null
          id: string
          is_blocked: boolean
          joined_at: string
          last_active_at: string | null
          telegram_user_id: string
          username: string | null
        }
        Insert: {
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          joined_at?: string
          last_active_at?: string | null
          telegram_user_id: string
          username?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          joined_at?: string
          last_active_at?: string | null
          telegram_user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      telegram_groups: {
        Row: {
          category: string
          chat_id: string
          cooldown_minutes: number
          created_at: string
          group_name: string | null
          id: string
          is_active: boolean
          last_post_at: string | null
          member_count: number | null
          total_posts: number
        }
        Insert: {
          category?: string
          chat_id: string
          cooldown_minutes?: number
          created_at?: string
          group_name?: string | null
          id?: string
          is_active?: boolean
          last_post_at?: string | null
          member_count?: number | null
          total_posts?: number
        }
        Update: {
          category?: string
          chat_id?: string
          cooldown_minutes?: number
          created_at?: string
          group_name?: string | null
          id?: string
          is_active?: boolean
          last_post_at?: string | null
          member_count?: number | null
          total_posts?: number
        }
        Relationships: []
      }
      token_launches: {
        Row: {
          amm_type: string | null
          auto_promo_submission_id: string | null
          base_amount_sol: number | null
          create_tx_signature: string | null
          created_at: string
          current_phase: string
          decimals: number | null
          description: string | null
          details: Json
          flag_reason: string | null
          flagged: boolean
          id: string
          indexed_dexscreener: boolean
          indexed_jupiter: boolean
          indexing_alert_contact: string | null
          indexing_alert_sent: boolean
          initial_supply: number | null
          liquidity_added: boolean
          liquidity_locked: boolean
          lock_address: string | null
          lock_unlock_at: string | null
          logo_url: string | null
          lp_mint: string | null
          metadata_attached: boolean
          metadata_tx_signature: string | null
          metadata_uri: string | null
          mint_address: string | null
          network: string | null
          pool_address: string | null
          promotion_started: boolean
          quote_amount_tokens: number | null
          telegram: string | null
          token_created: boolean
          token_name: string | null
          token_symbol: string | null
          total_supply: number | null
          twitter: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
          website: string | null
        }
        Insert: {
          amm_type?: string | null
          auto_promo_submission_id?: string | null
          base_amount_sol?: number | null
          create_tx_signature?: string | null
          created_at?: string
          current_phase?: string
          decimals?: number | null
          description?: string | null
          details?: Json
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          indexed_dexscreener?: boolean
          indexed_jupiter?: boolean
          indexing_alert_contact?: string | null
          indexing_alert_sent?: boolean
          initial_supply?: number | null
          liquidity_added?: boolean
          liquidity_locked?: boolean
          lock_address?: string | null
          lock_unlock_at?: string | null
          logo_url?: string | null
          lp_mint?: string | null
          metadata_attached?: boolean
          metadata_tx_signature?: string | null
          metadata_uri?: string | null
          mint_address?: string | null
          network?: string | null
          pool_address?: string | null
          promotion_started?: boolean
          quote_amount_tokens?: number | null
          telegram?: string | null
          token_created?: boolean
          token_name?: string | null
          token_symbol?: string | null
          total_supply?: number | null
          twitter?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          website?: string | null
        }
        Update: {
          amm_type?: string | null
          auto_promo_submission_id?: string | null
          base_amount_sol?: number | null
          create_tx_signature?: string | null
          created_at?: string
          current_phase?: string
          decimals?: number | null
          description?: string | null
          details?: Json
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          indexed_dexscreener?: boolean
          indexed_jupiter?: boolean
          indexing_alert_contact?: string | null
          indexing_alert_sent?: boolean
          initial_supply?: number | null
          liquidity_added?: boolean
          liquidity_locked?: boolean
          lock_address?: string | null
          lock_unlock_at?: string | null
          logo_url?: string | null
          lp_mint?: string | null
          metadata_attached?: boolean
          metadata_tx_signature?: string | null
          metadata_uri?: string | null
          mint_address?: string | null
          network?: string | null
          pool_address?: string | null
          promotion_started?: boolean
          quote_amount_tokens?: number | null
          telegram?: string | null
          token_created?: boolean
          token_name?: string | null
          token_symbol?: string | null
          total_supply?: number | null
          twitter?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_launches_auto_promo_submission_id_fkey"
            columns: ["auto_promo_submission_id"]
            isOneToOne: false
            referencedRelation: "token_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      token_submissions: {
        Row: {
          campaign_status: string
          created_at: string
          engagement_score: number
          expires_at: string | null
          id: string
          partner_user_id: string | null
          price_sol: number
          promotion_type: string
          referral_code: string | null
          services_delivered: Json
          status: string
          token_address: string
          token_name: string | null
          token_symbol: string | null
          tx_signature: string | null
          updated_at: string
          user_id: string | null
          views: number
          wallet_address: string | null
        }
        Insert: {
          campaign_status?: string
          created_at?: string
          engagement_score?: number
          expires_at?: string | null
          id?: string
          partner_user_id?: string | null
          price_sol?: number
          promotion_type?: string
          referral_code?: string | null
          services_delivered?: Json
          status?: string
          token_address: string
          token_name?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          updated_at?: string
          user_id?: string | null
          views?: number
          wallet_address?: string | null
        }
        Update: {
          campaign_status?: string
          created_at?: string
          engagement_score?: number
          expires_at?: string | null
          id?: string
          partner_user_id?: string | null
          price_sol?: number
          promotion_type?: string
          referral_code?: string | null
          services_delivered?: Json
          status?: string
          token_address?: string
          token_name?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          updated_at?: string
          user_id?: string | null
          views?: number
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          user_id: string
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          user_id: string
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          user_id?: string
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      viral_content: {
        Row: {
          body: string
          content_type: string
          created_at: string
          id: string
          metadata: Json
          platform: string | null
          status: string
          token_address: string | null
          token_symbol: string | null
        }
        Insert: {
          body: string
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          platform?: string | null
          status?: string
          token_address?: string | null
          token_symbol?: string | null
        }
        Update: {
          body?: string
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          platform?: string | null
          status?: string
          token_address?: string | null
          token_symbol?: string | null
        }
        Relationships: []
      }
      wallet_claim_nonces: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          nonce: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          nonce: string
          user_id: string
          wallet_address: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_labels: {
        Row: {
          created_at: string
          id: string
          label: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fin_get_or_create_account: {
        Args: {
          _account_type: string
          _label: string
          _scope_token: string
          _scope_user: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_referral_count: { Args: { _code: string }; Returns: undefined }
      increment_views_if_exists: {
        Args: { _submission_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      primary_role: "token_owner" | "partner"
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
      app_role: ["admin", "moderator", "user"],
      primary_role: ["token_owner", "partner"],
    },
  },
} as const
