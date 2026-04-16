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
          deleted_at: string | null
          edu_grade: string | null
          id: string
          memo: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string | null
          edu_grade?: string | null
          id?: string
          memo?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string | null
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
            referencedRelation: "client_list_view"
            referencedColumns: ["id"]
          },
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
          client_id: string
          company_size: Database["public"]["Enums"]["company_size_type"] | null
          created_at: string
          deleted_at: string | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"] | null
          memo: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          company_size?: Database["public"]["Enums"]["company_size_type"] | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"] | null
          memo?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_size?: Database["public"]["Enums"]["company_size_type"] | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"] | null
          memo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_msp_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "client_list_view"
            referencedColumns: ["id"]
          },
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
          status: Database["public"]["Enums"]["client_status_type"]
          updated_at: string
        }
        Insert: {
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
          status?: Database["public"]["Enums"]["client_status_type"]
          updated_at?: string
        }
        Update: {
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
          status?: Database["public"]["Enums"]["client_status_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "client_list_view"
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
            referencedRelation: "client_list_view"
            referencedColumns: ["id"]
          },
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
          field_name: string | null
          from_stage: string | null
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          to_stage: string | null
        }
        Insert: {
          changed_by: string
          contract_id: string
          created_at?: string
          field_name?: string | null
          from_stage?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          to_stage?: string | null
        }
        Update: {
          changed_by?: string
          contract_id?: string
          created_at?: string
          field_name?: string | null
          from_stage?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          to_stage?: string | null
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
          aws_account_ids: string[] | null
          aws_am: string | null
          aws_amount: number | null
          billing_method:
            | Database["public"]["Enums"]["billing_method_type"]
            | null
          billing_on: boolean
          billing_on_alias: string | null
          contract_id: string
          created_at: string
          credit_share: Database["public"]["Enums"]["credit_share_type"] | null
          deleted_at: string | null
          expected_mrr: number | null
          has_management_fee: boolean | null
          id: string
          msp_grade: Database["public"]["Enums"]["msp_grade_type"] | null
          payer: Database["public"]["Enums"]["payer_type"] | null
          sales_rep_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          aws_account_ids?: string[] | null
          aws_am?: string | null
          aws_amount?: number | null
          billing_method?:
            | Database["public"]["Enums"]["billing_method_type"]
            | null
          billing_on?: boolean
          billing_on_alias?: string | null
          contract_id: string
          created_at?: string
          credit_share?: Database["public"]["Enums"]["credit_share_type"] | null
          deleted_at?: string | null
          expected_mrr?: number | null
          has_management_fee?: boolean | null
          id?: string
          msp_grade?: Database["public"]["Enums"]["msp_grade_type"] | null
          payer?: Database["public"]["Enums"]["payer_type"] | null
          sales_rep_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          aws_account_ids?: string[] | null
          aws_am?: string | null
          aws_amount?: number | null
          billing_method?:
            | Database["public"]["Enums"]["billing_method_type"]
            | null
          billing_on?: boolean
          billing_on_alias?: string | null
          contract_id?: string
          created_at?: string
          credit_share?: Database["public"]["Enums"]["credit_share_type"] | null
          deleted_at?: string | null
          expected_mrr?: number | null
          has_management_fee?: boolean | null
          id?: string
          msp_grade?: Database["public"]["Enums"]["msp_grade_type"] | null
          payer?: Database["public"]["Enums"]["payer_type"] | null
          sales_rep_id?: string | null
          tags?: string[] | null
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
          {
            foreignKeyName: "contract_msp_details_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      contract_tech_leads: {
        Row: {
          contract_id: string
          created_at: string
          employee_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          employee_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_tech_leads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_tech_leads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_tech_leads_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          memo: string | null
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
          memo?: string | null
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
          memo?: string | null
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
            referencedRelation: "client_list_view"
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
      education_operation_dates: {
        Row: {
          created_at: string
          education_date: string
          hours: number | null
          id: string
          operation_id: string
        }
        Insert: {
          created_at?: string
          education_date: string
          hours?: number | null
          id?: string
          operation_id: string
        }
        Update: {
          created_at?: string
          education_date?: string
          hours?: number | null
          id?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_operation_dates_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "education_operations"
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
          date_list: string[] | null
          deleted_at: string | null
          end_date: string | null
          id: string
          location: string | null
          notes: string | null
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
          date_list?: string[] | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
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
          date_list?: string[] | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
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
      employees: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          position: string | null
          profile_id: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          notes: string | null
          operation_id: string
          role: string
        }
        Insert: {
          assigned_date?: string | null
          created_at?: string
          id?: string
          instructor_id: string
          notes?: string | null
          operation_id: string
          role: string
        }
        Update: {
          assigned_date?: string | null
          created_at?: string
          id?: string
          instructor_id?: string
          notes?: string | null
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
      client_list_view: {
        Row: {
          business_types: Database["public"]["Enums"]["business_type"][] | null
          client_id: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          contract_count: number | null
          created_at: string | null
          deleted_at: string | null
          grade: Database["public"]["Enums"]["client_grade"] | null
          id: string | null
          memo: string | null
          name: string | null
          parent_id: string | null
          status: Database["public"]["Enums"]["client_status_type"] | null
          updated_at: string | null
        }
        Insert: {
          business_types?: Database["public"]["Enums"]["business_type"][] | null
          client_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          contract_count?: never
          created_at?: string | null
          deleted_at?: string | null
          grade?: Database["public"]["Enums"]["client_grade"] | null
          id?: string | null
          memo?: string | null
          name?: string | null
          parent_id?: string | null
          status?: Database["public"]["Enums"]["client_status_type"] | null
          updated_at?: string | null
        }
        Update: {
          business_types?: Database["public"]["Enums"]["business_type"][] | null
          client_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          contract_count?: never
          created_at?: string | null
          deleted_at?: string | null
          grade?: Database["public"]["Enums"]["client_grade"] | null
          id?: string | null
          memo?: string | null
          name?: string | null
          parent_id?: string | null
          status?: Database["public"]["Enums"]["client_status_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "client_list_view"
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
      contracts_with_details: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          aws_amount: number | null
          billing_method:
            | Database["public"]["Enums"]["billing_method_type"]
            | null
          client_display_id: string | null
          client_id: string | null
          client_name: string | null
          contact_id: string | null
          contract_id: string | null
          created_at: string | null
          credit_share: Database["public"]["Enums"]["credit_share_type"] | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          deleted_at: string | null
          memo: string | null
          expected_mrr: number | null
          has_management_fee: boolean | null
          id: string | null
          name: string | null
          payer: Database["public"]["Enums"]["payer_type"] | null
          sales_rep_id: string | null
          stage: string | null
          total_amount: number | null
          type: Database["public"]["Enums"]["contract_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_msp_details_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "client_list_view"
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
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      update_contract_teams: {
        Args: { p_contract_id: string; p_allocations: Record<string, unknown>[] }
        Returns: undefined
      }
      user_team_id: { Args: never; Returns: string }
    }
    Enums: {
      billing_method_type:
        | "대표님 직접 청구"
        | "매월 10일 세금계산서 발행"
        | "공공기관 별도 청구"
      business_type: "msp" | "tt" | "dev"
      client_grade: "A" | "B" | "C" | "D" | "E"
      client_status_type: "신규" | "진행중" | "활성" | "휴면" | "종료" | "상태없음"
      client_type: "univ" | "corp" | "govt" | "asso" | "etc"
      company_size_type:
        | "스타트업"
        | "중소기업"
        | "중견기업"
        | "대기업"
        | "공공기관"
      contract_type: "msp" | "tt" | "dev"
      credit_share_type: "가능" | "불가능" | "미정"
      currency_type: "KRW" | "USD"
      industry_type:
        | "IT"
        | "제조"
        | "금융"
        | "유통"
        | "공공"
        | "서울대 연구실"
        | "기타"
      msp_grade_type: "None" | "FREE" | "MSP10" | "MSP15" | "MSP20" | "ETC"
      payer_type: "ETV-AWS-13" | "ETV-AWS-14" | "Org-001" | "Billing Transfer"
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
      billing_method_type: [
        "대표님 직접 청구",
        "매월 10일 세금계산서 발행",
        "공공기관 별도 청구",
      ],
      business_type: ["msp", "tt", "dev"],
      client_grade: ["A", "B", "C", "D", "E"],
      client_status_type: ["신규", "진행중", "활성", "휴면", "종료", "상태없음"],
      client_type: ["univ", "corp", "govt", "asso", "etc"],
      company_size_type: [
        "스타트업",
        "중소기업",
        "중견기업",
        "대기업",
        "공공기관",
      ],
      contract_type: ["msp", "tt", "dev"],
      credit_share_type: ["가능", "불가능", "미정"],
      currency_type: ["KRW", "USD"],
      industry_type: [
        "IT",
        "제조",
        "금융",
        "유통",
        "공공",
        "서울대 연구실",
        "기타",
      ],
      msp_grade_type: ["None", "FREE", "MSP10", "MSP15", "MSP20", "ETC"],
      payer_type: ["ETV-AWS-13", "ETV-AWS-14", "Org-001", "Billing Transfer"],
      team_type: ["msp", "education", "dev"],
      user_role: ["staff", "team_lead", "admin", "c_level"],
    },
  },
} as const
