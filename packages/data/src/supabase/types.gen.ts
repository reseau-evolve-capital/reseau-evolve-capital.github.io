export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
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
      attestation_sends: {
        Row: {
          brevo_message_id: string | null
          created_at: string
          id: string
          membership_id: string
          period: string
          reference: string | null
          sent_at: string
        }
        Insert: {
          brevo_message_id?: string | null
          created_at?: string
          id?: string
          membership_id: string
          period: string
          reference?: string | null
          sent_at?: string
        }
        Update: {
          brevo_message_id?: string | null
          created_at?: string
          id?: string
          membership_id?: string
          period?: string
          reference?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'attestation_sends_membership_id_fkey'
            columns: ['membership_id']
            isOneToOne: false
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      club_reporting_daily: {
        Row: {
          capital_gain: number | null
          club_id: string
          created_at: string
          id: string
          performance_ratio: number | null
          portfolio_value: number
          report_date: string
          synced_at: string
          total_contributions: number
          updated_at: string
        }
        Insert: {
          capital_gain?: number | null
          club_id: string
          created_at?: string
          id?: string
          performance_ratio?: number | null
          portfolio_value: number
          report_date: string
          synced_at: string
          total_contributions: number
          updated_at?: string
        }
        Update: {
          capital_gain?: number | null
          club_id?: string
          created_at?: string
          id?: string
          performance_ratio?: number | null
          portfolio_value?: number
          report_date?: string
          synced_at?: string
          total_contributions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'club_reporting_daily_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      clubs: {
        Row: {
          annual_investment_cap: number | null
          broker_account_ref: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          last_error_email_sent_at: string | null
          min_contribution: number
          name: string
          settings: Json
          sheet_id: string | null
          slug: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          annual_investment_cap?: number | null
          broker_account_ref?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_error_email_sent_at?: string | null
          min_contribution?: number
          name: string
          settings?: Json
          sheet_id?: string | null
          slug: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          annual_investment_cap?: number | null
          broker_account_ref?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_error_email_sent_at?: string | null
          min_contribution?: number
          name?: string
          settings?: Json
          sheet_id?: string | null
          slug?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contribution_months: {
        Row: {
          amount: number
          club_id: string
          created_at: string
          due_date: string | null
          id: string
          membership_id: string
          month: number
          paid_at: string | null
          status: Database['public']['Enums']['month_status']
          synced_at: string
          year: number
        }
        Insert: {
          amount?: number
          club_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          membership_id: string
          month: number
          paid_at?: string | null
          status: Database['public']['Enums']['month_status']
          synced_at: string
          year: number
        }
        Update: {
          amount?: number
          club_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          membership_id?: string
          month?: number
          paid_at?: string | null
          status?: Database['public']['Enums']['month_status']
          synced_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: 'contribution_months_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contribution_months_membership_id_fkey'
            columns: ['membership_id']
            isOneToOne: false
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }
      contributions: {
        Row: {
          amount_due: number
          club_id: string
          created_at: string
          detention_pct: number
          id: string
          membership_id: string
          months_count: number
          net_market_value: number | null
          penalties: number
          status: Database['public']['Enums']['contribution_status']
          synced_at: string
          total_contributed: number
          updated_at: string
        }
        Insert: {
          amount_due?: number
          club_id: string
          created_at?: string
          detention_pct: number
          id?: string
          membership_id: string
          months_count?: number
          net_market_value?: number | null
          penalties?: number
          status: Database['public']['Enums']['contribution_status']
          synced_at: string
          total_contributed: number
          updated_at?: string
        }
        Update: {
          amount_due?: number
          club_id?: string
          created_at?: string
          detention_pct?: number
          id?: string
          membership_id?: string
          months_count?: number
          net_market_value?: number | null
          penalties?: number
          status?: Database['public']['Enums']['contribution_status']
          synced_at?: string
          total_contributed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contributions_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contributions_membership_id_fkey'
            columns: ['membership_id']
            isOneToOne: true
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }
      feedback: {
        Row: {
          ai_category: string | null
          ai_severity: string | null
          ai_summary: string | null
          ai_title: string | null
          club_id: string | null
          created_at: string
          discord_notified: boolean
          email_sent: boolean
          github_issue_url: string | null
          id: string
          message: string
          notion_page_id: string | null
          page_route: string
          page_url: string
          screenshot_urls: string[] | null
          status: string
          type: string
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          ai_category?: string | null
          ai_severity?: string | null
          ai_summary?: string | null
          ai_title?: string | null
          club_id?: string | null
          created_at?: string
          discord_notified?: boolean
          email_sent?: boolean
          github_issue_url?: string | null
          id?: string
          message: string
          notion_page_id?: string | null
          page_route: string
          page_url: string
          screenshot_urls?: string[] | null
          status?: string
          type: string
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          ai_category?: string | null
          ai_severity?: string | null
          ai_summary?: string | null
          ai_title?: string | null
          club_id?: string | null
          created_at?: string
          discord_notified?: boolean
          email_sent?: boolean
          github_issue_url?: string | null
          id?: string
          message?: string
          notion_page_id?: string | null
          page_route?: string
          page_url?: string
          screenshot_urls?: string[] | null
          status?: string
          type?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          club_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string | null
          revoked_at: string | null
          status: Database['public']['Enums']['invitation_status']
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          club_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          revoked_at?: string | null
          status?: Database['public']['Enums']['invitation_status']
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          club_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          revoked_at?: string | null
          status?: Database['public']['Enums']['invitation_status']
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      member_access_events: {
        Row: {
          action: Database['public']['Enums']['access_event_action']
          actor_id: string | null
          created_at: string
          id: string
          membership_id: string
          reason: string | null
        }
        Insert: {
          action: Database['public']['Enums']['access_event_action']
          actor_id?: string | null
          created_at?: string
          id?: string
          membership_id: string
          reason?: string | null
        }
        Update: {
          action?: Database['public']['Enums']['access_event_action']
          actor_id?: string | null
          created_at?: string
          id?: string
          membership_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'member_access_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'member_access_events_membership_id_fkey'
            columns: ['membership_id']
            isOneToOne: false
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }
      memberships: {
        Row: {
          access_status: Database['public']['Enums']['member_access_status']
          club_id: string
          created_at: string
          id: string
          is_active: boolean | null
          joined_at: string
          leave_at: string | null
          leave_with_amount: number | null
          locked_at: string | null
          locked_by: string | null
          locked_reason: string | null
          role: Database['public']['Enums']['member_role']
          role_source: string
          status: Database['public']['Enums']['member_status']
          updated_at: string
          user_id: string
        }
        Insert: {
          access_status?: Database['public']['Enums']['member_access_status']
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          joined_at: string
          leave_at?: string | null
          leave_with_amount?: number | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          role?: Database['public']['Enums']['member_role']
          role_source?: string
          status?: Database['public']['Enums']['member_status']
          updated_at?: string
          user_id: string
        }
        Update: {
          access_status?: Database['public']['Enums']['member_access_status']
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          leave_at?: string | null
          leave_with_amount?: number | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          role?: Database['public']['Enums']['member_role']
          role_source?: string
          status?: Database['public']['Enums']['member_status']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_locked_by_fkey'
            columns: ['locked_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      network_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'network_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      network_members: {
        Row: {
          created_at: string
          role: Database['public']['Enums']['network_role']
          title: Database['public']['Enums']['network_title'] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database['public']['Enums']['network_role']
          title?: Database['public']['Enums']['network_title'] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database['public']['Enums']['network_role']
          title?: Database['public']['Enums']['network_title'] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'network_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      poll_email_sends: {
        Row: {
          brevo_message_id: string | null
          id: string
          poll_id: string
          recipient_count: number
          sent_at: string
          variant: string
        }
        Insert: {
          brevo_message_id?: string | null
          id?: string
          poll_id: string
          recipient_count?: number
          sent_at?: string
          variant: string
        }
        Update: {
          brevo_message_id?: string | null
          id?: string
          poll_id?: string
          recipient_count?: number
          sent_at?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: 'poll_email_sends_poll_id_fkey'
            columns: ['poll_id']
            isOneToOne: false
            referencedRelation: 'polls'
            referencedColumns: ['id']
          },
        ]
      }
      poll_responses: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          selected_options: string[] | null
          text_response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          selected_options?: string[] | null
          text_response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          selected_options?: string[] | null
          text_response?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'poll_responses_poll_id_fkey'
            columns: ['poll_id']
            isOneToOne: false
            referencedRelation: 'polls'
            referencedColumns: ['id']
          },
        ]
      }
      polls: {
        Row: {
          closed_manually_at: string | null
          closes_at: string | null
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          network_wide: boolean
          notify_by_email: boolean
          options: Json | null
          question_type: string
          results_visibility: string
          status: string
          title: string
        }
        Insert: {
          closed_manually_at?: string | null
          closes_at?: string | null
          club_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          network_wide?: boolean
          notify_by_email?: boolean
          options?: Json | null
          question_type: string
          results_visibility?: string
          status?: string
          title: string
        }
        Update: {
          closed_manually_at?: string | null
          closes_at?: string | null
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          network_wide?: boolean
          notify_by_email?: boolean
          options?: Json | null
          question_type?: string
          results_visibility?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'polls_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      portfolio_aggregates: {
        Row: {
          allocation_pct: number | null
          book_value: number | null
          club_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          market_value: number | null
          synced_at: string
          updated_at: string
        }
        Insert: {
          allocation_pct?: number | null
          book_value?: number | null
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          market_value?: number | null
          synced_at: string
          updated_at?: string
        }
        Update: {
          allocation_pct?: number | null
          book_value?: number | null
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          market_value?: number | null
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'portfolio_aggregates_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      positions: {
        Row: {
          allocation_pct: number | null
          book_value: number | null
          category: string | null
          club_id: string
          created_at: string
          currency: string
          currency_ref: string | null
          eps: number | null
          gain_loss_eur: number | null
          gain_loss_pct: number | null
          id: string
          is_active: boolean
          market_price_eur: number | null
          market_value: number | null
          name: string
          pe: number | null
          perf_calibree: number | null
          perf_cible: number | null
          pump: number | null
          quantity: number
          sector: string | null
          stop_loss_pct: number | null
          stop_loss_value: number | null
          symbol: string
          synced_at: string
          take_profit_pct: number | null
          take_profit_value: number | null
          typologie: string | null
          updated_at: string
        }
        Insert: {
          allocation_pct?: number | null
          book_value?: number | null
          category?: string | null
          club_id: string
          created_at?: string
          currency?: string
          currency_ref?: string | null
          eps?: number | null
          gain_loss_eur?: number | null
          gain_loss_pct?: number | null
          id?: string
          is_active?: boolean
          market_price_eur?: number | null
          market_value?: number | null
          name: string
          pe?: number | null
          perf_calibree?: number | null
          perf_cible?: number | null
          pump?: number | null
          quantity: number
          sector?: string | null
          stop_loss_pct?: number | null
          stop_loss_value?: number | null
          symbol: string
          synced_at: string
          take_profit_pct?: number | null
          take_profit_value?: number | null
          typologie?: string | null
          updated_at?: string
        }
        Update: {
          allocation_pct?: number | null
          book_value?: number | null
          category?: string | null
          club_id?: string
          created_at?: string
          currency?: string
          currency_ref?: string | null
          eps?: number | null
          gain_loss_eur?: number | null
          gain_loss_pct?: number | null
          id?: string
          is_active?: boolean
          market_price_eur?: number | null
          market_value?: number | null
          name?: string
          pe?: number | null
          perf_calibree?: number | null
          perf_cible?: number | null
          pump?: number | null
          quantity?: number
          sector?: string | null
          stop_loss_pct?: number | null
          stop_loss_value?: number | null
          symbol?: string
          synced_at?: string
          take_profit_pct?: number | null
          take_profit_value?: number | null
          typologie?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'positions_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      push_delivery_log: {
        Row: {
          club_id: string | null
          created_at: string
          event_type: string
          failed_count: number
          id: string
          poll_id: string | null
          sent_count: number
          skipped_count: number
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          event_type: string
          failed_count?: number
          id?: string
          poll_id?: string | null
          sent_count?: number
          skipped_count?: number
        }
        Update: {
          club_id?: string | null
          created_at?: string
          event_type?: string
          failed_count?: number
          id?: string
          poll_id?: string | null
          sent_count?: number
          skipped_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'push_delivery_log_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'push_delivery_log_poll_id_fkey'
            columns: ['poll_id']
            isOneToOne: false
            referencedRelation: 'polls'
            referencedColumns: ['id']
          },
        ]
      }
      push_preferences: {
        Row: {
          enabled: boolean
          poll_closed: boolean
          poll_opened: boolean
          poll_reminder: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          poll_closed?: boolean
          poll_opened?: boolean
          poll_reminder?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          poll_closed?: boolean
          poll_opened?: boolean
          poll_reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_error_at: string | null
          last_error_code: string | null
          last_success_at: string | null
          p256dh: string
          platform: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_success_at?: string | null
          p256dh: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_success_at?: string | null
          p256dh?: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sheet_snapshots: {
        Row: {
          checksum: string
          club_id: string
          error_message: string | null
          id: string
          raw_data: Json
          row_count: number
          sheet_name: string
          status: Database['public']['Enums']['snapshot_status']
          synced_at: string
        }
        Insert: {
          checksum: string
          club_id: string
          error_message?: string | null
          id?: string
          raw_data: Json
          row_count: number
          sheet_name: string
          status?: Database['public']['Enums']['snapshot_status']
          synced_at?: string
        }
        Update: {
          checksum?: string
          club_id?: string
          error_message?: string | null
          id?: string
          raw_data?: Json
          row_count?: number
          sheet_name?: string
          status?: Database['public']['Enums']['snapshot_status']
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sheet_snapshots_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string | null
          notes: string | null
          price: number | null
          quantity: number | null
          symbol: string | null
          synced_at: string
          total: number | null
          transaction_date: string | null
          type: Database['public']['Enums']['transaction_type']
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          symbol?: string | null
          synced_at: string
          total?: number | null
          transaction_date?: string | null
          type: Database['public']['Enums']['transaction_type']
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          symbol?: string | null
          synced_at?: string
          total?: number | null
          transaction_date?: string | null
          type?: Database['public']['Enums']['transaction_type']
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string
          created_at: string
          directory_opt_in: boolean
          email: string
          email_is_placeholder: boolean
          firstname: string | null
          full_name: string
          id: string
          lastname: string | null
          onboarding_completed: boolean
          phone: string | null
          postal_address: string | null
          rgpd_consented_at: string | null
          updated_at: string
          welcome_sent: boolean
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          directory_opt_in?: boolean
          email: string
          email_is_placeholder?: boolean
          firstname?: string | null
          full_name: string
          id?: string
          lastname?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          postal_address?: string | null
          rgpd_consented_at?: string | null
          updated_at?: string
          welcome_sent?: boolean
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          directory_opt_in?: boolean
          email?: string
          email_is_placeholder?: boolean
          firstname?: string | null
          full_name?: string
          id?: string
          lastname?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          postal_address?: string | null
          rgpd_consented_at?: string | null
          updated_at?: string
          welcome_sent?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      member_quote_part: {
        Row: {
          amount_due: number | null
          club_id: string | null
          contribution_status: Database['public']['Enums']['contribution_status'] | null
          detention_pct: number | null
          joined_at: string | null
          membership_status: Database['public']['Enums']['member_status'] | null
          net_market_value: number | null
          role: Database['public']['Enums']['member_role'] | null
          synced_at: string | null
          total_contributed: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token_hash: string }; Returns: string }
      admin_change_member_role: {
        Args: {
          p_membership_id: string
          p_role: Database['public']['Enums']['member_role']
        }
        Returns: undefined
      }
      admin_create_invitation: {
        Args: { p_club_id: string; p_email: string; p_token_hash: string }
        Returns: string
      }
      admin_resend_invitation: {
        Args: { p_invitation_id: string; p_token_hash: string }
        Returns: undefined
      }
      admin_revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      admin_set_member_access: {
        Args: { p_locked: boolean; p_membership_id: string; p_reason?: string }
        Returns: undefined
      }
      close_due_polls: {
        Args: never
        Returns: {
          club_id: string
          poll_id: string
        }[]
      }
      current_user_access_blocked: { Args: never; Returns: boolean }
      email_is_invited: { Args: { p_email: string }; Returns: boolean }
      get_poll_results: { Args: { p_poll_id: string }; Returns: Json }
      get_user_club_ids: { Args: never; Returns: string[] }
      get_user_role_in_club: {
        Args: { p_club_id: string }
        Returns: Database['public']['Enums']['member_role']
      }
      has_club_staff_access: { Args: { p_club_id: string }; Returns: boolean }
      has_voted: { Args: { p_poll_id: string }; Returns: boolean }
      health_status: { Args: never; Returns: Json }
      is_club_staff: { Args: { p_club_id: string }; Returns: boolean }
      is_network_admin: { Args: never; Returns: boolean }
      is_network_member: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      network_create_club: {
        Args: {
          p_city?: string
          p_country?: string
          p_currency?: string
          p_min_contribution?: number
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      network_delete_club: { Args: { p_club_id: string }; Returns: undefined }
      network_disable_club: {
        Args: { p_club_id: string; p_reason?: string }
        Returns: undefined
      }
      network_enable_club: { Args: { p_club_id: string }; Returns: undefined }
      network_grant_role: {
        Args: {
          p_role: Database['public']['Enums']['network_role']
          p_title?: Database['public']['Enums']['network_title']
          p_user_id: string
        }
        Returns: undefined
      }
      network_list_board: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          role: Database['public']['Enums']['network_role']
          title: Database['public']['Enums']['network_title']
          user_id: string
        }[]
      }
      network_list_club_members: {
        Args: { p_club_id: string }
        Returns: {
          email: string
          full_name: string
          role: Database['public']['Enums']['member_role']
          status: Database['public']['Enums']['member_status']
          user_id: string
        }[]
      }
      network_list_clubs: {
        Args: never
        Returns: {
          active_members_count: number
          aggregated_valuation: number
          city: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string
          matrix_connected: boolean
          name: string
          slug: string
        }[]
      }
      network_list_eligible_members: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          is_member: boolean
          user_id: string
        }[]
      }
      network_list_sheet_snapshots: {
        Args: { p_club_id: string; p_limit?: number }
        Returns: {
          first_error: string
          sheets_count: number
          status: Database['public']['Enums']['snapshot_status']
          synced_at: string
          total_rows: number
        }[]
      }
      network_log_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      network_provision_first_staff: {
        Args: {
          p_club_id: string
          p_role: Database['public']['Enums']['member_role']
          p_user_id: string
        }
        Returns: string
      }
      network_revoke_role: { Args: { p_user_id: string }; Returns: undefined }
      network_set_club_active: {
        Args: { p_active: boolean; p_club_id: string; p_reason?: string }
        Returns: undefined
      }
      network_set_club_sheet: {
        Args: { p_club_id: string; p_sheet_id: string }
        Returns: undefined
      }
      network_update_club_settings: {
        Args: {
          p_annual_investment_cap?: number
          p_broker_account_ref?: string
          p_city?: string
          p_club_id: string
          p_country?: string
          p_min_contribution?: number
          p_name?: string
        }
        Returns: undefined
      }
      record_attestation_ref: {
        Args: { p_membership_id: string; p_period: string; p_reference: string }
        Returns: undefined
      }
      refresh_member_quote_part: { Args: never; Returns: undefined }
      submit_vote: {
        Args: {
          p_poll_id: string
          p_selected_options?: string[]
          p_text_response?: string
        }
        Returns: string
      }
      update_club_settings: {
        Args: {
          p_annual_investment_cap?: number
          p_broker_account_ref?: string
          p_city?: string
          p_club_id: string
          p_country?: string
          p_min_contribution?: number
          p_name?: string
        }
        Returns: undefined
      }
      update_member_email: {
        Args: { p_email: string; p_membership_id: string }
        Returns: undefined
      }
      user_is_staff: { Args: never; Returns: boolean }
      verify_attestation: {
        Args: { p_reference: string }
        Returns: {
          club_name: string
          issued_at: string
          period: string
        }[]
      }
    }
    Enums: {
      access_event_action: 'locked' | 'unlocked'
      contribution_status: 'ok' | 'pending' | 'late' | 'exempt'
      invitation_status: 'pending' | 'accepted' | 'expired' | 'revoked'
      member_access_status: 'active' | 'locked'
      member_role: 'member' | 'treasurer' | 'president' | 'network_admin' | 'secretary'
      member_status: 'active' | 'left'
      month_status: 'paid' | 'due' | 'late' | 'exempt'
      network_role: 'network_admin' | 'network_board'
      network_title: 'president' | 'vice_president' | 'treasurer' | 'secretary'
      snapshot_status: 'success' | 'partial' | 'failed'
      transaction_type: 'buy' | 'sell' | 'dividend' | 'coupon' | 'other'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_event_action: ['locked', 'unlocked'],
      contribution_status: ['ok', 'pending', 'late', 'exempt'],
      invitation_status: ['pending', 'accepted', 'expired', 'revoked'],
      member_access_status: ['active', 'locked'],
      member_role: ['member', 'treasurer', 'president', 'network_admin', 'secretary'],
      member_status: ['active', 'left'],
      month_status: ['paid', 'due', 'late', 'exempt'],
      network_role: ['network_admin', 'network_board'],
      network_title: ['president', 'vice_president', 'treasurer', 'secretary'],
      snapshot_status: ['success', 'partial', 'failed'],
      transaction_type: ['buy', 'sell', 'dividend', 'coupon', 'other'],
    },
  },
} as const
