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
      clubs: {
        Row: {
          city: string | null
          country: string
          created_at: string
          currency: string
          id: string
          min_contribution: number | null
          name: string
          settings: Json
          sheet_id: string | null
          slug: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          min_contribution?: number | null
          name: string
          settings?: Json
          sheet_id?: string | null
          slug: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          min_contribution?: number | null
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
      memberships: {
        Row: {
          club_id: string
          created_at: string
          id: string
          is_active: boolean | null
          joined_at: string
          leave_at: string | null
          leave_with_amount: number | null
          role: Database['public']['Enums']['member_role']
          status: Database['public']['Enums']['member_status']
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          joined_at: string
          leave_at?: string | null
          leave_with_amount?: number | null
          role?: Database['public']['Enums']['member_role']
          status?: Database['public']['Enums']['member_status']
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          leave_at?: string | null
          leave_with_amount?: number | null
          role?: Database['public']['Enums']['member_role']
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
            foreignKeyName: 'memberships_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
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
          transaction_date: string
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
          transaction_date: string
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
          transaction_date?: string
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
          firstname: string | null
          full_name: string
          id: string
          lastname: string | null
          onboarding_completed: boolean
          phone: string | null
          rgpd_consented_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          directory_opt_in?: boolean
          email: string
          firstname?: string | null
          full_name: string
          id?: string
          lastname?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          rgpd_consented_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          directory_opt_in?: boolean
          email?: string
          firstname?: string | null
          full_name?: string
          id?: string
          lastname?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          rgpd_consented_at?: string | null
          updated_at?: string
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
      get_user_club_ids: { Args: never; Returns: string[] }
      get_user_role_in_club: {
        Args: { p_club_id: string }
        Returns: Database['public']['Enums']['member_role']
      }
      refresh_member_quote_part: { Args: never; Returns: undefined }
    }
    Enums: {
      contribution_status: 'ok' | 'pending' | 'late' | 'exempt'
      member_role: 'member' | 'treasurer' | 'president' | 'network_admin'
      member_status: 'active' | 'left'
      month_status: 'paid' | 'due' | 'late' | 'exempt'
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
      contribution_status: ['ok', 'pending', 'late', 'exempt'],
      member_role: ['member', 'treasurer', 'president', 'network_admin'],
      member_status: ['active', 'left'],
      month_status: ['paid', 'due', 'late', 'exempt'],
      snapshot_status: ['success', 'partial', 'failed'],
      transaction_type: ['buy', 'sell', 'dividend', 'coupon', 'other'],
    },
  },
} as const
