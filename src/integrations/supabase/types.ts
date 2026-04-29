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
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          source_platform: string | null
          source_url: string | null
          token_submission_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          source_platform?: string | null
          source_url?: string | null
          token_submission_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          source_platform?: string | null
          source_url?: string | null
          token_submission_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_token_submission_id_fkey"
            columns: ["token_submission_id"]
            isOneToOne: false
            referencedRelation: "token_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_activity_log: {
        Row: {
          action_detail: string
          action_type: string
          created_at: string
          id: string
          platform: string
          status: string
          token_submission_id: string | null
          token_symbol: string
        }
        Insert: {
          action_detail: string
          action_type: string
          created_at?: string
          id?: string
          platform: string
          status?: string
          token_submission_id?: string | null
          token_symbol: string
        }
        Update: {
          action_detail?: string
          action_type?: string
          created_at?: string
          id?: string
          platform?: string
          status?: string
          token_submission_id?: string | null
          token_symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_activity_log_token_submission_id_fkey"
            columns: ["token_submission_id"]
            isOneToOne: false
            referencedRelation: "token_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_execution_logs: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          executed_at: string
          external_id: string | null
          external_url: string | null
          id: string
          platform: string
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number
          status: string
          token_submission_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          error_message?: string | null
          executed_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          platform: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status?: string
          token_submission_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          executed_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          platform?: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status?: string
          token_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_execution_logs_token_submission_id_fkey"
            columns: ["token_submission_id"]
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
          start_time: string
          status: string
          target_participants: number | null
          token_address: string | null
          token_symbol: string | null
        }
        Insert: {
          campaign_type: string
          created_at?: string
          current_participants?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          name: string
          reward_pool?: number | null
          start_time?: string
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
          start_time?: string
          status?: string
          target_participants?: number | null
          token_address?: string | null
          token_symbol?: string | null
        }
        Relationships: []
      }
      community_missions: {
        Row: {
          completions_count: number | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          mission_type: string
          required_amount: number | null
          reward_points: number
          status: string
          title: string
          token_address: string | null
          token_symbol: string | null
        }
        Insert: {
          completions_count?: number | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          mission_type: string
          required_amount?: number | null
          reward_points?: number
          status?: string
          title: string
          token_address?: string | null
          token_symbol?: string | null
        }
        Update: {
          completions_count?: number | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          mission_type?: string
          required_amount?: number | null
          reward_points?: number
          status?: string
          title?: string
          token_address?: string | null
          token_symbol?: string | null
        }
        Relationships: []
      }
      content_schedule: {
        Row: {
          channel_id: string | null
          content_id: string | null
          created_at: string
          error_message: string | null
          id: string
          posted: boolean
          posted_at: string | null
          scheduled_at: string
          telegram_message_id: number | null
        }
        Insert: {
          channel_id?: string | null
          content_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          posted?: boolean
          posted_at?: string | null
          scheduled_at: string
          telegram_message_id?: number | null
        }
        Update: {
          channel_id?: string | null
          content_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          posted?: boolean
          posted_at?: string | null
          scheduled_at?: string
          telegram_message_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_schedule_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "viral_content"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_webhooks: {
        Row: {
          channel_name: string
          created_at: string
          id: string
          is_active: boolean
          last_post_at: string | null
          server_name: string
          total_posts: number
          webhook_url: string
        }
        Insert: {
          channel_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_post_at?: string | null
          server_name: string
          total_posts?: number
          webhook_url: string
        }
        Update: {
          channel_name?: string
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
          content_id: string | null
          created_at: string
          id: string
          payload: Json
          posted: boolean
          posted_at: string | null
          telegram_message_id: number | null
        }
        Insert: {
          action_type: string
          content_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          posted?: boolean
          posted_at?: string | null
          telegram_message_id?: number | null
        }
        Update: {
          action_type?: string
          content_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          posted?: boolean
          posted_at?: string | null
          telegram_message_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_actions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "viral_content"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["financial_account_type"]
          balance_sol: number
          created_at: string
          id: string
          metadata: Json | null
          scope_label: string | null
          scope_token_address: string | null
          scope_user_id: string | null
          total_in_sol: number
          total_out_sol: number
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["financial_account_type"]
          balance_sol?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          scope_label?: string | null
          scope_token_address?: string | null
          scope_user_id?: string | null
          total_in_sol?: number
          total_out_sol?: number
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["financial_account_type"]
          balance_sol?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          scope_label?: string | null
          scope_token_address?: string | null
          scope_user_id?: string | null
          total_in_sol?: number
          total_out_sol?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount_sol: number
          amount_usd_at_time: number | null
          created_at: string
          destination: Database["public"]["Enums"]["financial_party"]
          destination_account_id: string | null
          id: string
          metadata: Json | null
          network: string | null
          notes: string | null
          occurred_at: string
          partner_user_id: string | null
          referral_code: string | null
          related_earning_id: string | null
          related_launch_id: string | null
          related_submission_id: string | null
          sol_usd_at_time: number | null
          source: Database["public"]["Enums"]["financial_party"]
          source_account_id: string | null
          token_address: string | null
          token_symbol: string | null
          tx_signature: string | null
          tx_type: Database["public"]["Enums"]["financial_tx_type"]
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          amount_sol: number
          amount_usd_at_time?: number | null
          created_at?: string
          destination: Database["public"]["Enums"]["financial_party"]
          destination_account_id?: string | null
          id?: string
          metadata?: Json | null
          network?: string | null
          notes?: string | null
          occurred_at?: string
          partner_user_id?: string | null
          referral_code?: string | null
          related_earning_id?: string | null
          related_launch_id?: string | null
          related_submission_id?: string | null
          sol_usd_at_time?: number | null
          source: Database["public"]["Enums"]["financial_party"]
          source_account_id?: string | null
          token_address?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          tx_type: Database["public"]["Enums"]["financial_tx_type"]
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          amount_sol?: number
          amount_usd_at_time?: number | null
          created_at?: string
          destination?: Database["public"]["Enums"]["financial_party"]
          destination_account_id?: string | null
          id?: string
          metadata?: Json | null
          network?: string | null
          notes?: string | null
          occurred_at?: string
          partner_user_id?: string | null
          referral_code?: string | null
          related_earning_id?: string | null
          related_launch_id?: string | null
          related_submission_id?: string | null
          sol_usd_at_time?: number | null
          source?: Database["public"]["Enums"]["financial_party"]
          source_account_id?: string | null
          token_address?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          tx_type?: Database["public"]["Enums"]["financial_tx_type"]
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
            foreignKeyName: "financial_transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_completions: {
        Row: {
          created_at: string
          id: string
          mission_id: string | null
          points_earned: number
          proof_data: Json | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id?: string | null
          points_earned?: number
          proof_data?: Json | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string | null
          points_earned?: number
          proof_data?: Json | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_completions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "community_missions"
            referencedColumns: ["id"]
          },
        ]
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
          referral_code: string
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
          referral_code: string
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
          referral_code?: string
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
          primary_role: string | null
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
          primary_role?: string | null
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
          primary_role?: string | null
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
          uses_count: number
          wallet_address: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          total_points_earned?: number
          uses_count?: number
          wallet_address: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          total_points_earned?: number
          uses_count?: number
          wallet_address?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          created_at: string
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
          fetched_at: string
          id: string
          price_usd: number
          source: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          price_usd: number
          source?: string
        }
        Update: {
          fetched_at?: string
          id?: string
          price_usd?: number
          source?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_bot_users: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          is_blocked: boolean
          joined_channel: boolean
          referral_code: string | null
          referred_by: string | null
          segments: string[] | null
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          joined_channel?: boolean
          referral_code?: string | null
          referred_by?: string | null
          segments?: string[] | null
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          joined_channel?: boolean
          referral_code?: string | null
          referred_by?: string | null
          segments?: string[] | null
          telegram_id?: number
          updated_at?: string
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
          group_name: string
          id: string
          is_active: boolean
          last_post_at: string | null
          total_posts: number
        }
        Insert: {
          category?: string
          chat_id: string
          cooldown_minutes?: number
          created_at?: string
          group_name: string
          id?: string
          is_active?: boolean
          last_post_at?: string | null
          total_posts?: number
        }
        Update: {
          category?: string
          chat_id?: string
          cooldown_minutes?: number
          created_at?: string
          group_name?: string
          id?: string
          is_active?: boolean
          last_post_at?: string | null
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
          decimals: number
          description: string | null
          flag_reason: string | null
          flagged: boolean
          id: string
          indexed_dexscreener: boolean
          indexed_jupiter: boolean
          indexing_alert_contact: string | null
          indexing_alert_sent: boolean
          last_indexing_check_at: string | null
          liquidity_added: boolean
          liquidity_locked: boolean
          lock_address: string | null
          lock_provider: string | null
          lock_unlock_at: string | null
          logo_url: string | null
          lp_mint: string | null
          metadata_attached: boolean
          metadata_tx_signature: string | null
          metadata_uri: string | null
          mint_address: string
          network: string
          pool_address: string | null
          promotion_started: boolean
          quote_amount_tokens: number | null
          telegram: string | null
          token_created: boolean
          token_name: string
          token_symbol: string
          total_supply: number
          twitter: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string
          website: string | null
        }
        Insert: {
          amm_type?: string | null
          auto_promo_submission_id?: string | null
          base_amount_sol?: number | null
          create_tx_signature?: string | null
          created_at?: string
          decimals?: number
          description?: string | null
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          indexed_dexscreener?: boolean
          indexed_jupiter?: boolean
          indexing_alert_contact?: string | null
          indexing_alert_sent?: boolean
          last_indexing_check_at?: string | null
          liquidity_added?: boolean
          liquidity_locked?: boolean
          lock_address?: string | null
          lock_provider?: string | null
          lock_unlock_at?: string | null
          logo_url?: string | null
          lp_mint?: string | null
          metadata_attached?: boolean
          metadata_tx_signature?: string | null
          metadata_uri?: string | null
          mint_address: string
          network: string
          pool_address?: string | null
          promotion_started?: boolean
          quote_amount_tokens?: number | null
          telegram?: string | null
          token_created?: boolean
          token_name: string
          token_symbol: string
          total_supply: number
          twitter?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address: string
          website?: string | null
        }
        Update: {
          amm_type?: string | null
          auto_promo_submission_id?: string | null
          base_amount_sol?: number | null
          create_tx_signature?: string | null
          created_at?: string
          decimals?: number
          description?: string | null
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          indexed_dexscreener?: boolean
          indexed_jupiter?: boolean
          indexing_alert_contact?: string | null
          indexing_alert_sent?: boolean
          last_indexing_check_at?: string | null
          liquidity_added?: boolean
          liquidity_locked?: boolean
          lock_address?: string | null
          lock_provider?: string | null
          lock_unlock_at?: string | null
          logo_url?: string | null
          lp_mint?: string | null
          metadata_attached?: boolean
          metadata_tx_signature?: string | null
          metadata_uri?: string | null
          mint_address?: string
          network?: string
          pool_address?: string | null
          promotion_started?: boolean
          quote_amount_tokens?: number | null
          telegram?: string | null
          token_created?: boolean
          token_name?: string
          token_symbol?: string
          total_supply?: number
          twitter?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string
          website?: string | null
        }
        Relationships: []
      }
      token_risk_scores: {
        Row: {
          checked_at: string | null
          contract_renounced: boolean | null
          created_at: string
          honeypot_detected: boolean | null
          id: string
          liquidity_locked: boolean | null
          liquidity_sol: number | null
          risk_level: string
          risk_notes: string[] | null
          token_address: string
          top_holder_pct: number | null
        }
        Insert: {
          checked_at?: string | null
          contract_renounced?: boolean | null
          created_at?: string
          honeypot_detected?: boolean | null
          id?: string
          liquidity_locked?: boolean | null
          liquidity_sol?: number | null
          risk_level?: string
          risk_notes?: string[] | null
          token_address: string
          top_holder_pct?: number | null
        }
        Update: {
          checked_at?: string | null
          contract_renounced?: boolean | null
          created_at?: string
          honeypot_detected?: boolean | null
          id?: string
          liquidity_locked?: boolean | null
          liquidity_sol?: number | null
          risk_level?: string
          risk_notes?: string[] | null
          token_address?: string
          top_holder_pct?: number | null
        }
        Relationships: []
      }
      token_submissions: {
        Row: {
          campaign_status: string
          created_at: string
          engagement_score: number | null
          expires_at: string | null
          id: string
          price_sol: number
          promotion_type: string
          referral_code: string | null
          services_delivered: Json | null
          status: string
          token_address: string
          token_name: string | null
          token_symbol: string | null
          tx_signature: string | null
          user_id: string | null
          views: number | null
          wallet_address: string | null
        }
        Insert: {
          campaign_status?: string
          created_at?: string
          engagement_score?: number | null
          expires_at?: string | null
          id?: string
          price_sol?: number
          promotion_type: string
          referral_code?: string | null
          services_delivered?: Json | null
          status?: string
          token_address: string
          token_name?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          user_id?: string | null
          views?: number | null
          wallet_address?: string | null
        }
        Update: {
          campaign_status?: string
          created_at?: string
          engagement_score?: number | null
          expires_at?: string | null
          id?: string
          price_sol?: number
          promotion_type?: string
          referral_code?: string | null
          services_delivered?: Json | null
          status?: string
          token_address?: string
          token_name?: string | null
          token_symbol?: string | null
          tx_signature?: string | null
          user_id?: string | null
          views?: number | null
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
          verified_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          user_id: string
          verified_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          user_id?: string
          verified_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      viral_content: {
        Row: {
          clicks: number
          content_type: string
          created_at: string
          id: string
          image_url: string | null
          is_posted: boolean
          mcap: string | null
          narrative: string | null
          posted_at: string | null
          reactions: number
          shares: number
          telegram_message_id: number | null
          text: string
          token_address: string
          token_name: string
          token_symbol: string | null
          views: number
          volume: string | null
        }
        Insert: {
          clicks?: number
          content_type: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_posted?: boolean
          mcap?: string | null
          narrative?: string | null
          posted_at?: string | null
          reactions?: number
          shares?: number
          telegram_message_id?: number | null
          text: string
          token_address: string
          token_name: string
          token_symbol?: string | null
          views?: number
          volume?: string | null
        }
        Update: {
          clicks?: number
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_posted?: boolean
          mcap?: string | null
          narrative?: string | null
          posted_at?: string | null
          reactions?: number
          shares?: number
          telegram_message_id?: number | null
          text?: string
          token_address?: string
          token_name?: string
          token_symbol?: string | null
          views?: number
          volume?: string | null
        }
        Relationships: []
      }
      wallet_claim_nonces: {
        Row: {
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          nonce: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          nonce: string
          user_id: string
          wallet_address: string
        }
        Update: {
          consumed?: boolean
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
          last_activity: string | null
          metadata: Json | null
          score: number | null
          tokens_tracked: number | null
          total_volume_sol: number | null
          wallet_address: string
          win_rate: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          last_activity?: string | null
          metadata?: Json | null
          score?: number | null
          tokens_tracked?: number | null
          total_volume_sol?: number | null
          wallet_address: string
          win_rate?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_activity?: string | null
          metadata?: Json | null
          score?: number | null
          tokens_tracked?: number | null
          total_volume_sol?: number | null
          wallet_address?: string
          win_rate?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_partner_tier: { Args: { subs: number }; Returns: number }
      fin_get_or_create_account: {
        Args: {
          _account_type: Database["public"]["Enums"]["financial_account_type"]
          _label?: string
          _scope_token?: string
          _scope_user?: string
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      financial_account_type:
        | "launch"
        | "pmm_revenue"
        | "user_escrow"
        | "partner_commission"
        | "trading_fee_pool"
      financial_party:
        | "user"
        | "system"
        | "pmm"
        | "blockchain"
        | "liquidity_pool"
        | "partner"
        | "pool"
      financial_tx_type:
        | "launch_fee"
        | "liquidity"
        | "gas_fee"
        | "promotion_fee"
        | "trading_fee"
        | "partner_commission"
        | "partner_payout"
        | "refund"
        | "adjustment"
        | "mint_creation"
        | "metadata_pin"
        | "lp_lock"
        | "authority_revoke"
        | "indexer_submission"
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
      financial_account_type: [
        "launch",
        "pmm_revenue",
        "user_escrow",
        "partner_commission",
        "trading_fee_pool",
      ],
      financial_party: [
        "user",
        "system",
        "pmm",
        "blockchain",
        "liquidity_pool",
        "partner",
        "pool",
      ],
      financial_tx_type: [
        "launch_fee",
        "liquidity",
        "gas_fee",
        "promotion_fee",
        "trading_fee",
        "partner_commission",
        "partner_payout",
        "refund",
        "adjustment",
        "mint_creation",
        "metadata_pin",
        "lp_lock",
        "authority_revoke",
        "indexer_submission",
      ],
    },
  },
} as const
