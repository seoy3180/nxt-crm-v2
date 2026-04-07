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
      client_edu_details: {
        Row: {
          client_id: string
          created_at: string
          edu_grade: string | null
          id: string
          memo: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          edu_grade?: string | null
          id?: string
          memo?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          edu_grade?: string | null
          id?: string
          memo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_edu_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_msp_details: {
        Row: {
          aws_account_ids: string[] | null
          aws_am: string | null
          client_id: string
          company_size: string | null
          created_at: string
          id: string
          industry: string | null
          memo: string | null
          msp_grade: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          aws_account_ids?: string[] | null
          aws_am?: string | null
          client_id: string
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          memo?: string | null
          msp_grade?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          aws_account_ids?: string[] | null
          aws_am?: string | null
          client_id?: string
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          memo?: string | null
          msp_grade?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_msp_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_to: string | null
          business_types: Database["public"]["Enums"]["business_type"][] | null
          client_id: string
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string
          deleted_at: string | null
          grade: Database["public"]["Enums"]["client_grade"] | null
          id: string
          memo: string | null
          name: string
          parent_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_types?: Database["public"]["Enums"]["business_type"][] | null
          client_id: string
          client_type: Database["public"]["Enums"]["client_type"]
          created_at?: string
          deleted_at?: string | null
          grade?: Database["public"]["Enums"]["client_grade"] | null
          id?: string
          memo?: string | null
          name: string
          parent_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_types?: Database["public"]["Enums"]["business_type"][] | null
          client_id?: string
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          deleted_at?: string | null
          grade?: Database["public"]["Enums"]["client_grade"] | null
          id?: string
          memo?: string | null
          name?: string
          parent_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          position: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_history: {
        Row: {
          changed_by: string
          contract_id: string
          created_at: string
          from_stage: string | null
          id: string
          note: string | null
          to_stage: string
        }
        Insert: {
          changed_by: string
          contract_id: string
          created_at?: string
          from_stage?: string | null
          id?: string
          note?: string | null
          to_stage: string
        }
        Update: {
          changed_by?: string
          contract_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          note?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_msp_details: {
        Row: {
          aws_amount: number | null
          billing_level: string | null
          contract_id: string
          created_at: string
          credit_share: number | null
          expected_mrr: number | null
          has_management_fee: boolean | null
          id: string
          payer: string | null
          payment_method: string | null
          sales_rep: string | null
          updated_at: string
        }
        Insert: {
          aws_amount?: number | null
          billing_level?: string | null
          contract_id: string
          created_at?: string
          credit_share?: number | null
          expected_mrr?: number | null
          has_management_fee?: boolean | null
          id?: string
          payer?: string | null
          payment_method?: string | null
          sales_rep?: string | null
          updated_at?: string
        }
        Update: {
          aws_amount?: number | null
          billing_level?: string | null
          contract_id?: string
          created_at?: string
          credit_share?: number | null
          expected_mrr?: number | null
          has_management_fee?: boolean | null
          id?: string
          payer?: string | null
          payment_method?: string | null
          sales_rep?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_msp_details_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_msp_details_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_teams: {
        Row: {
          contract_id: string
          created_at: string
          deleted_at: string | null
          id: string
          percentage: number
          team_id: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          percentage: number
          team_id: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          percentage?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_teams_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_teams_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_tt_details: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_tt_details_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_tt_details_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          assigned_to: string | null
          client_id: string
          contact_id: string | null
          contract_id: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          stage: string | null
          total_amount: number | null
          type: Database["public"]["Enums"]["contract_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          contact_id?: string | null
          contract_id: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          stage?: string | null
          total_amount?: number | null
          type: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          contact_id?: string | null
          contract_id?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          stage?: string | null
          total_amount?: number | null
          type?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      education_operations: {
        Row: {
          actual_count: number | null
          contract_id: string
          contracted_count: number | null
          created_at: string
          deleted_at: string | null
          end_date: string | null
          id: string
          location: string | null
          operation_name: string
          provides_lunch: boolean | null
          provides_snack: boolean | null
          recruited_count: number | null
          start_date: string | null
          target_org: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          actual_count?: number | null
          contract_id: string
          contracted_count?: number | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          operation_name: string
          provides_lunch?: boolean | null
          provides_snack?: boolean | null
          recruited_count?: number | null
          start_date?: string | null
          target_org?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          actual_count?: number | null
          contract_id?: string
          contracted_count?: number | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          operation_name?: string
          provides_lunch?: boolean | null
          provides_snack?: boolean | null
          recruited_count?: number | null
          start_date?: string | null
          target_org?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_operations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_operations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          organization: string | null
          phone: string | null
          position: string | null
          status: string | null
          team: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization?: string | null
          phone?: string | null
          position?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization?: string | null
          phone?: string | null
          position?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      operation_instructors: {
        Row: {
          assigned_date: string | null
          created_at: string
          id: string
          instructor_id: string
          operation_id: string
          role: string
        }
        Insert: {
          assigned_date?: string | null
          created_at?: string
          id?: string
          instructor_id: string
          operation_id: string
          role: string
        }
        Update: {
          assigned_date?: string | null
          created_at?: string
          id?: string
          instructor_id?: string
          operation_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_instructors_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "education_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          position: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["team_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["team_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["team_type"]
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contracts_with_details: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          aws_amount: number | null
          billing_level: string | null
          client_display_id: string | null
          client_id: string | null
          client_name: string | null
          contact_id: string | null
          contract_id: string | null
          created_at: string | null
          credit_share: number | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          deleted_at: string | null
          description: string | null
          expected_mrr: number | null
          has_management_fee: boolean | null
          id: string | null
          name: string | null
          payer: string | null
          sales_rep: string | null
          stage: string | null
          total_amount: number | null
          type: Database["public"]["Enums"]["contract_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_client: { Args: { p_client_id: string }; Returns: boolean }
      can_access_contract: { Args: { p_contract_id: string }; Returns: boolean }
      generate_client_id: {
        Args: { p_type: Database["public"]["Enums"]["client_type"] }
        Returns: string
      }
      generate_edu_contract_id: { Args: never; Returns: string }
      generate_msp_contract_id: { Args: never; Returns: string }
      is_admin_or_clevel: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      user_team_id: { Args: never; Returns: string }
    }
    Enums: {
      business_type: "msp" | "tt" | "dev"
      client_grade: "A" | "B" | "C" | "D" | "E"
      client_type: "univ" | "corp" | "govt" | "asso" | "etc"
      contract_type: "msp" | "tt" | "dev"
      currency_type: "KRW" | "USD"
      team_type: "msp" | "education" | "dev"
      user_role: "staff" | "team_lead" | "admin" | "c_level"
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
      business_type: ["msp", "tt", "dev"],
      client_grade: ["A", "B", "C", "D", "E"],
      client_type: ["univ", "corp", "govt", "asso", "etc"],
      contract_type: ["msp", "tt", "dev"],
      currency_type: ["KRW", "USD"],
      team_type: ["msp", "education", "dev"],
      user_role: ["staff", "team_lead", "admin", "c_level"],
    },
  },
} as const
