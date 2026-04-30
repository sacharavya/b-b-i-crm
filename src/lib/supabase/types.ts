export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  audit: {
    Tables: {
      change_log: {
        Row: {
          actor_staff_id: string | null
          actor_user_id: string | null
          changed_columns: string[] | null
          id: number
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          operation: string
          row_id: string | null
          schema_name: string
          table_name: string
        }
        Insert: {
          actor_staff_id?: string | null
          actor_user_id?: string | null
          changed_columns?: string[] | null
          id?: number
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          operation: string
          row_id?: string | null
          schema_name: string
          table_name: string
        }
        Update: {
          actor_staff_id?: string | null
          actor_user_id?: string | null
          changed_columns?: string[] | null
          id?: number
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          operation?: string
          row_id?: string | null
          schema_name?: string
          table_name?: string
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
  crm: {
    Tables: {
      case_events: {
        Row: {
          case_id: string
          corrects_event: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_data: Json
          event_type: Database["crm"]["Enums"]["event_type"]
          id: string
          visible_to_client: boolean
        }
        Insert: {
          case_id: string
          corrects_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_data?: Json
          event_type: Database["crm"]["Enums"]["event_type"]
          id?: string
          visible_to_client?: boolean
        }
        Update: {
          case_id?: string
          corrects_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_data?: Json
          event_type?: Database["crm"]["Enums"]["event_type"]
          id?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_corrects_event_fkey"
            columns: ["corrects_event"]
            isOneToOne: false
            referencedRelation: "case_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      case_participants: {
        Row: {
          added_at: string
          case_id: string
          client_id: string
          id: string
          role: Database["crm"]["Enums"]["participant_role"]
        }
        Insert: {
          added_at?: string
          case_id: string
          client_id: string
          id?: string
          role: Database["crm"]["Enums"]["participant_role"]
        }
        Update: {
          added_at?: string
          case_id?: string
          client_id?: string
          id?: string
          role?: Database["crm"]["Enums"]["participant_role"]
        }
        Relationships: [
          {
            foreignKeyName: "case_participants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_paralegal: string | null
          assigned_rcic: string
          case_number: string
          client_id: string
          closed_at: string | null
          conditional_flags: Json
          created_at: string
          created_by: string | null
          decided_at: string | null
          deleted_at: string | null
          government_fee_cad: number | null
          id: string
          internal_notes: string | null
          ircc_application_number: string | null
          ircc_portal_link: string | null
          ircc_uci: string | null
          opened_at: string
          outcome_notes: string | null
          priority: string | null
          quoted_fee_cad: number
          retained_at: string | null
          retainer_minimum_cad: number | null
          service_template_id: string
          service_type_id: string
          sharepoint_folder_id: string | null
          sharepoint_folder_url: string | null
          status: Database["crm"]["Enums"]["case_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_paralegal?: string | null
          assigned_rcic: string
          case_number: string
          client_id: string
          closed_at?: string | null
          conditional_flags?: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          government_fee_cad?: number | null
          id?: string
          internal_notes?: string | null
          ircc_application_number?: string | null
          ircc_portal_link?: string | null
          ircc_uci?: string | null
          opened_at?: string
          outcome_notes?: string | null
          priority?: string | null
          quoted_fee_cad: number
          retained_at?: string | null
          retainer_minimum_cad?: number | null
          service_template_id: string
          service_type_id: string
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          status?: Database["crm"]["Enums"]["case_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_paralegal?: string | null
          assigned_rcic?: string
          case_number?: string
          client_id?: string
          closed_at?: string | null
          conditional_flags?: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          government_fee_cad?: number | null
          id?: string
          internal_notes?: string | null
          ircc_application_number?: string | null
          ircc_portal_link?: string | null
          ircc_uci?: string | null
          opened_at?: string
          outcome_notes?: string | null
          priority?: string | null
          quoted_fee_cad?: number
          retained_at?: string | null
          retainer_minimum_cad?: number | null
          service_template_id?: string
          service_type_id?: string
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          status?: Database["crm"]["Enums"]["case_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_paralegal_fkey"
            columns: ["assigned_paralegal"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_assigned_rcic_fkey"
            columns: ["assigned_rcic"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client_address_history: {
        Row: {
          address_line: string
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          id: string
          notes: string | null
          province_state: string | null
        }
        Insert: {
          address_line: string
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          notes?: string | null
          province_state?: string | null
        }
        Update: {
          address_line?: string
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          notes?: string | null
          province_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_address_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_education_history: {
        Row: {
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          field_of_study: string | null
          id: string
          institution: string
          notes: string | null
          province_state: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          field_of_study?: string | null
          id?: string
          institution: string
          notes?: string | null
          province_state?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          field_of_study?: string | null
          id?: string
          institution?: string
          notes?: string | null
          province_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_education_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_employment_history: {
        Row: {
          activity_type: string | null
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          employer: string | null
          id: string
          is_ongoing: boolean
          notes: string | null
          occupation: string
          province_state: string | null
        }
        Insert: {
          activity_type?: string | null
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          employer?: string | null
          id?: string
          is_ongoing?: boolean
          notes?: string | null
          occupation: string
          province_state?: string | null
        }
        Update: {
          activity_type?: string | null
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          employer?: string | null
          id?: string
          is_ongoing?: boolean
          notes?: string | null
          occupation?: string
          province_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_employment_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_family_members: {
        Row: {
          accompanying_to_canada: boolean | null
          client_id: string
          country_of_birth: string | null
          created_at: string
          date_of_birth: string | null
          deceased_date: string | null
          deceased_location: string | null
          display_order: number
          full_name: string
          id: string
          is_deceased: boolean
          marital_status: Database["crm"]["Enums"]["marital_status"] | null
          notes: string | null
          present_address: string | null
          present_occupation: string | null
          relationship: Database["crm"]["Enums"]["relationship_type"]
          updated_at: string
        }
        Insert: {
          accompanying_to_canada?: boolean | null
          client_id: string
          country_of_birth?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased_date?: string | null
          deceased_location?: string | null
          display_order?: number
          full_name: string
          id?: string
          is_deceased?: boolean
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          notes?: string | null
          present_address?: string | null
          present_occupation?: string | null
          relationship: Database["crm"]["Enums"]["relationship_type"]
          updated_at?: string
        }
        Update: {
          accompanying_to_canada?: boolean | null
          client_id?: string
          country_of_birth?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased_date?: string | null
          deceased_location?: string | null
          display_order?: number
          full_name?: string
          id?: string
          is_deceased?: boolean
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          notes?: string | null
          present_address?: string | null
          present_occupation?: string | null
          relationship?: Database["crm"]["Enums"]["relationship_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_family_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_travel_history: {
        Row: {
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string
          date_to: string
          days: number | null
          display_order: number
          id: string
          notes: string | null
          purpose: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from: string
          date_to: string
          days?: number | null
          display_order?: number
          id?: string
          notes?: string | null
          purpose?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string
          date_to?: string
          days?: number | null
          display_order?: number
          id?: string
          notes?: string | null
          purpose?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_travel_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          assigned_rcic: string | null
          background_responses: Json
          city: string | null
          client_number: string
          country_code: string | null
          country_of_birth: string | null
          country_of_citizenship: string | null
          country_of_residence: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          family_name: string | null
          gender: Database["crm"]["Enums"]["gender"] | null
          given_names: string | null
          id: string
          legal_name_full: string
          marital_status: Database["crm"]["Enums"]["marital_status"] | null
          notes: string | null
          phone_primary: string | null
          phone_whatsapp: string | null
          postal_code: string | null
          preferred_contact: string | null
          preferred_language: string | null
          preferred_name: string | null
          primary_contact_staff: string | null
          province_state: string | null
          referred_by: string | null
          source: string | null
          status: Database["crm"]["Enums"]["client_status"]
          updated_at: string
          years_elementary: number | null
          years_post_secondary: number | null
          years_secondary: number | null
          years_trade_other: number | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          assigned_rcic?: string | null
          background_responses?: Json
          city?: string | null
          client_number: string
          country_code?: string | null
          country_of_birth?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          family_name?: string | null
          gender?: Database["crm"]["Enums"]["gender"] | null
          given_names?: string | null
          id?: string
          legal_name_full: string
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          notes?: string | null
          phone_primary?: string | null
          phone_whatsapp?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          preferred_language?: string | null
          preferred_name?: string | null
          primary_contact_staff?: string | null
          province_state?: string | null
          referred_by?: string | null
          source?: string | null
          status?: Database["crm"]["Enums"]["client_status"]
          updated_at?: string
          years_elementary?: number | null
          years_post_secondary?: number | null
          years_secondary?: number | null
          years_trade_other?: number | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          assigned_rcic?: string | null
          background_responses?: Json
          city?: string | null
          client_number?: string
          country_code?: string | null
          country_of_birth?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          family_name?: string | null
          gender?: Database["crm"]["Enums"]["gender"] | null
          given_names?: string | null
          id?: string
          legal_name_full?: string
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          notes?: string | null
          phone_primary?: string | null
          phone_whatsapp?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          preferred_language?: string | null
          preferred_name?: string | null
          primary_contact_staff?: string | null
          province_state?: string | null
          referred_by?: string | null
          source?: string | null
          status?: Database["crm"]["Enums"]["client_status"]
          updated_at?: string
          years_elementary?: number | null
          years_post_secondary?: number | null
          years_secondary?: number | null
          years_trade_other?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_rcic_fkey"
            columns: ["assigned_rcic"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_contact_staff_fkey"
            columns: ["primary_contact_staff"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachment_ids: string[] | null
          body: string | null
          case_id: string | null
          cc_addresses: string[] | null
          channel: Database["crm"]["Enums"]["communication_channel"]
          client_id: string | null
          deleted_at: string | null
          direction: Database["crm"]["Enums"]["communication_direction"]
          email_message_id: string | null
          from_address: string | null
          handled_by: string | null
          id: string
          logged_at: string
          logged_by: string | null
          occurred_at: string
          subject: string | null
          summary: string | null
          to_addresses: string[] | null
        }
        Insert: {
          attachment_ids?: string[] | null
          body?: string | null
          case_id?: string | null
          cc_addresses?: string[] | null
          channel: Database["crm"]["Enums"]["communication_channel"]
          client_id?: string | null
          deleted_at?: string | null
          direction: Database["crm"]["Enums"]["communication_direction"]
          email_message_id?: string | null
          from_address?: string | null
          handled_by?: string | null
          id?: string
          logged_at?: string
          logged_by?: string | null
          occurred_at?: string
          subject?: string | null
          summary?: string | null
          to_addresses?: string[] | null
        }
        Update: {
          attachment_ids?: string[] | null
          body?: string | null
          case_id?: string | null
          cc_addresses?: string[] | null
          channel?: Database["crm"]["Enums"]["communication_channel"]
          client_id?: string | null
          deleted_at?: string | null
          direction?: Database["crm"]["Enums"]["communication_direction"]
          email_message_id?: string | null
          from_address?: string | null
          handled_by?: string | null
          id?: string
          logged_at?: string
          logged_by?: string | null
          occurred_at?: string
          subject?: string | null
          summary?: string | null
          to_addresses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          description: string
          display_order: number
          id: string
          invoice_id: string
          line_total_cad: number
          quantity: number
          unit_price_cad: number
        }
        Insert: {
          description: string
          display_order?: number
          id?: string
          invoice_id: string
          line_total_cad: number
          quantity?: number
          unit_price_cad: number
        }
        Update: {
          description?: string
          display_order?: number
          id?: string
          invoice_id?: string
          line_total_cad?: number
          quantity?: number
          unit_price_cad?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          case_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          hst_cad: number
          id: string
          invoice_number: string
          issued_date: string
          notes: string | null
          paid_cad: number
          status: Database["crm"]["Enums"]["invoice_status"]
          subtotal_cad: number
          total_cad: number
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          hst_cad?: number
          id?: string
          invoice_number: string
          issued_date?: string
          notes?: string | null
          paid_cad?: number
          status?: Database["crm"]["Enums"]["invoice_status"]
          subtotal_cad: number
          total_cad: number
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          hst_cad?: number
          id?: string
          invoice_number?: string
          issued_date?: string
          notes?: string | null
          paid_cad?: number
          status?: Database["crm"]["Enums"]["invoice_status"]
          subtotal_cad?: number
          total_cad?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cad: number
          case_id: string | null
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          invoice_id: string | null
          is_refund: boolean
          method: Database["crm"]["Enums"]["payment_method"]
          notes: string | null
          received_date: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount_cad: number
          case_id?: string | null
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          method: Database["crm"]["Enums"]["payment_method"]
          notes?: string | null
          received_date?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount_cad?: number
          case_id?: string | null
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          method?: Database["crm"]["Enums"]["payment_method"]
          notes?: string | null
          received_date?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string
          can_be_assigned_cases: boolean
          cicc_license_no: string | null
          created_at: string
          created_by_staff: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deleted_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          last_name: string
          password_reset_required_at: string | null
          permission_overrides: Json
          phone: string | null
          role: Database["crm"]["Enums"]["staff_role"]
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          can_be_assigned_cases?: boolean
          cicc_license_no?: string | null
          created_at?: string
          created_by_staff?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name: string
          password_reset_required_at?: string | null
          permission_overrides?: Json
          phone?: string | null
          role: Database["crm"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          can_be_assigned_cases?: boolean
          cicc_license_no?: string | null
          created_at?: string
          created_by_staff?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string
          password_reset_required_at?: string | null
          permission_overrides?: Json
          phone?: string | null
          role?: Database["crm"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_created_by_staff_fkey"
            columns: ["created_by_staff"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          alert_days_before: number[] | null
          alerts_sent_at: string[] | null
          assigned_to: string | null
          case_id: string | null
          client_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: Database["crm"]["Enums"]["task_status"]
          task_type: Database["crm"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          alert_days_before?: number[] | null
          alerts_sent_at?: string[] | null
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: Database["crm"]["Enums"]["task_status"]
          task_type: Database["crm"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          alert_days_before?: number[] | null
          alerts_sent_at?: string[] | null
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: Database["crm"]["Enums"]["task_status"]
          task_type?: Database["crm"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_advance_phase: {
        Args: {
          p_case_id: string
          p_target_status: Database["crm"]["Enums"]["case_status"]
        }
        Returns: {
          allowed: boolean
          reason: string
        }[]
      }
      case_total_collected: { Args: { p_case_id: string }; Returns: number }
      current_staff_id: { Args: never; Returns: string }
      current_staff_role: {
        Args: never
        Returns: Database["crm"]["Enums"]["staff_role"]
      }
      generate_case_number: { Args: never; Returns: string }
      generate_client_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      phase_of: {
        Args: { status: Database["crm"]["Enums"]["case_status"] }
        Returns: string
      }
      staff_can: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      case_status:
        | "retainer_signed"
        | "documentation_in_progress"
        | "documentation_review"
        | "submitted_to_ircc"
        | "biometrics_pending"
        | "biometrics_completed"
        | "awaiting_decision"
        | "passport_requested"
        | "refused"
        | "additional_info_requested"
        | "closed"
      client_status: "lead" | "active" | "dormant" | "closed"
      communication_channel:
        | "email"
        | "phone_call"
        | "whatsapp"
        | "sms"
        | "in_person"
        | "instagram"
        | "facebook_messenger"
        | "portal_message"
        | "letter"
        | "other"
      communication_direction: "inbound" | "outbound"
      event_type:
        | "status_changed"
        | "note_added"
        | "document_received"
        | "document_requested"
        | "document_accepted"
        | "document_rejected"
        | "communication_sent"
        | "communication_received"
        | "fee_quoted"
        | "fee_collected"
        | "fee_refunded"
        | "deadline_set"
        | "deadline_met"
        | "deadline_missed"
        | "phase_advance_attempted"
        | "phase_advance_blocked"
        | "ircc_update"
        | "correction"
        | "other"
      gender: "male" | "female" | "other" | "prefer_not_to_say"
      invoice_status: "draft" | "sent" | "partial" | "paid" | "void" | "overdue"
      marital_status:
        | "single"
        | "married"
        | "common_law"
        | "divorced"
        | "widowed"
        | "separated"
        | "annulled"
      participant_role:
        | "principal"
        | "spouse"
        | "dependent_child"
        | "co_applicant"
        | "sponsor"
      payment_method:
        | "e_transfer"
        | "stripe"
        | "bank_transfer"
        | "cash"
        | "cheque"
        | "wire"
        | "other"
      relationship_type:
        | "father"
        | "mother"
        | "spouse"
        | "common_law_partner"
        | "son"
        | "daughter"
        | "step_son"
        | "step_daughter"
        | "adopted_son"
        | "adopted_daughter"
        | "brother"
        | "sister"
        | "half_brother"
        | "half_sister"
        | "step_brother"
        | "step_sister"
        | "guardian"
        | "other"
      service_category:
        | "temporary_resident"
        | "permanent_resident"
        | "citizenship"
        | "sponsorship"
        | "appeal_or_review"
        | "other"
      staff_role:
        | "admin"
        | "rcic"
        | "paralegal"
        | "staff"
        | "readonly"
        | "super_user"
        | "document_officer"
        | "reception"
      task_status: "open" | "in_progress" | "blocked" | "done" | "cancelled"
      task_type:
        | "document_collection"
        | "form_completion"
        | "review_required"
        | "submission"
        | "biometrics_appointment"
        | "medical_exam"
        | "ircc_response"
        | "follow_up_client"
        | "permit_expiry_alert"
        | "language_test_expiry"
        | "eca_expiry"
        | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  files: {
    Tables: {
      documents: {
        Row: {
          case_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          document_code: string | null
          document_date: string | null
          expiry_date: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sharepoint_drive_id: string | null
          sharepoint_item_id: string | null
          sharepoint_web_url: string | null
          status: Database["files"]["Enums"]["document_status"]
          supersedes: string | null
          uploaded_by_client: boolean
          uploaded_by_staff: string | null
          version_number: number
        }
        Insert: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          document_code?: string | null
          document_date?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sharepoint_drive_id?: string | null
          sharepoint_item_id?: string | null
          sharepoint_web_url?: string | null
          status?: Database["files"]["Enums"]["document_status"]
          supersedes?: string | null
          uploaded_by_client?: boolean
          uploaded_by_staff?: string | null
          version_number?: number
        }
        Update: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          document_code?: string | null
          document_date?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sharepoint_drive_id?: string | null
          sharepoint_item_id?: string | null
          sharepoint_web_url?: string | null
          status?: Database["files"]["Enums"]["document_status"]
          supersedes?: string | null
          uploaded_by_client?: boolean
          uploaded_by_staff?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_status:
        | "requested"
        | "uploaded"
        | "under_review"
        | "accepted"
        | "rejected"
        | "superseded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  portal: {
    Tables: {
      [_ in never]: never
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
  ref: {
    Tables: {
      countries: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          code: string
          display_order: number
          name: string
        }
        Insert: {
          code: string
          display_order?: number
          name: string
        }
        Update: {
          code?: string
          display_order?: number
          name?: string
        }
        Relationships: []
      }
      service_templates: {
        Row: {
          created_at: string
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          required_intake_sections: Json
          service_type_id: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          required_intake_sections?: Json
          service_type_id: string
          version: number
        }
        Update: {
          created_at?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          required_intake_sections?: Json
          service_type_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_templates_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          category: Database["crm"]["Enums"]["service_category"]
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          typical_duration_days: number | null
        }
        Insert: {
          category: Database["crm"]["Enums"]["service_category"]
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          typical_duration_days?: number | null
        }
        Update: {
          category?: Database["crm"]["Enums"]["service_category"]
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          typical_duration_days?: number | null
        }
        Relationships: []
      }
      template_documents: {
        Row: {
          category: string
          condition_label: string | null
          display_order: number
          document_code: string
          document_label: string
          id: string
          is_required: boolean
          notes: string | null
          service_template_id: string
        }
        Insert: {
          category: string
          condition_label?: string | null
          display_order?: number
          document_code: string
          document_label: string
          id?: string
          is_required?: boolean
          notes?: string | null
          service_template_id: string
        }
        Update: {
          category?: string
          condition_label?: string | null
          display_order?: number
          document_code?: string
          document_label?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          service_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_documents_service_template_id_fkey"
            columns: ["service_template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
        ]
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
  audit: {
    Enums: {},
  },
  crm: {
    Enums: {
      case_status: [
        "retainer_signed",
        "documentation_in_progress",
        "documentation_review",
        "submitted_to_ircc",
        "biometrics_pending",
        "biometrics_completed",
        "awaiting_decision",
        "passport_requested",
        "refused",
        "additional_info_requested",
        "closed",
      ],
      client_status: ["lead", "active", "dormant", "closed"],
      communication_channel: [
        "email",
        "phone_call",
        "whatsapp",
        "sms",
        "in_person",
        "instagram",
        "facebook_messenger",
        "portal_message",
        "letter",
        "other",
      ],
      communication_direction: ["inbound", "outbound"],
      event_type: [
        "status_changed",
        "note_added",
        "document_received",
        "document_requested",
        "document_accepted",
        "document_rejected",
        "communication_sent",
        "communication_received",
        "fee_quoted",
        "fee_collected",
        "fee_refunded",
        "deadline_set",
        "deadline_met",
        "deadline_missed",
        "phase_advance_attempted",
        "phase_advance_blocked",
        "ircc_update",
        "correction",
        "other",
      ],
      gender: ["male", "female", "other", "prefer_not_to_say"],
      invoice_status: ["draft", "sent", "partial", "paid", "void", "overdue"],
      marital_status: [
        "single",
        "married",
        "common_law",
        "divorced",
        "widowed",
        "separated",
        "annulled",
      ],
      participant_role: [
        "principal",
        "spouse",
        "dependent_child",
        "co_applicant",
        "sponsor",
      ],
      payment_method: [
        "e_transfer",
        "stripe",
        "bank_transfer",
        "cash",
        "cheque",
        "wire",
        "other",
      ],
      relationship_type: [
        "father",
        "mother",
        "spouse",
        "common_law_partner",
        "son",
        "daughter",
        "step_son",
        "step_daughter",
        "adopted_son",
        "adopted_daughter",
        "brother",
        "sister",
        "half_brother",
        "half_sister",
        "step_brother",
        "step_sister",
        "guardian",
        "other",
      ],
      service_category: [
        "temporary_resident",
        "permanent_resident",
        "citizenship",
        "sponsorship",
        "appeal_or_review",
        "other",
      ],
      staff_role: [
        "admin",
        "rcic",
        "paralegal",
        "staff",
        "readonly",
        "super_user",
        "document_officer",
        "reception",
      ],
      task_status: ["open", "in_progress", "blocked", "done", "cancelled"],
      task_type: [
        "document_collection",
        "form_completion",
        "review_required",
        "submission",
        "biometrics_appointment",
        "medical_exam",
        "ircc_response",
        "follow_up_client",
        "permit_expiry_alert",
        "language_test_expiry",
        "eca_expiry",
        "custom",
      ],
    },
  },
  files: {
    Enums: {
      document_status: [
        "requested",
        "uploaded",
        "under_review",
        "accepted",
        "rejected",
        "superseded",
      ],
    },
  },
  portal: {
    Enums: {},
  },
  ref: {
    Enums: {},
  },
} as const

