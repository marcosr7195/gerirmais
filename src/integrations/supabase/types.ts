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
      categories: {
        Row: {
          classification: string
          created_at: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          classification?: string
          created_at?: string | null
          id?: string
          name: string
          type?: string
          user_id: string
        }
        Update: {
          classification?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          service_order_id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          service_order_id: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          service_order_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          interaction_date: string
          interaction_type: string
          is_automatic: boolean
          next_step: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          reminder_date: string | null
          subject: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          is_automatic?: boolean
          next_step?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_date?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          is_automatic?: boolean
          next_step?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_date?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string | null
          document: string | null
          email: string | null
          first_contact_date: string | null
          id: string
          instagram: string | null
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          origin: string | null
          person_type: string | null
          phone: string | null
          state: string | null
          street: string | null
          trade_name: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          first_contact_date?: string | null
          id?: string
          instagram?: string | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          origin?: string | null
          person_type?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          first_contact_date?: string | null
          id?: string
          instagram?: string | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          origin?: string | null
          person_type?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      deal_items: {
        Row: {
          created_at: string | null
          deal_id: string
          description: string
          id: string
          quantity: number | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          description: string
          id?: string
          quantity?: number | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          description?: string
          id?: string
          quantity?: number | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          client_id: string | null
          created_at: string | null
          fixed_value: boolean
          id: string
          notes: string | null
          os_created: boolean
          stage: string
          title: string
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          fixed_value?: boolean
          id?: string
          notes?: string | null
          os_created?: boolean
          stage?: string
          title: string
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          fixed_value?: boolean
          id?: string
          notes?: string | null
          os_created?: boolean
          stage?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string | null
          agency: string | null
          bank_name: string | null
          business_name: string | null
          city: string | null
          commercial_email: string | null
          company_name: string | null
          complement: string | null
          created_at: string | null
          document: string | null
          fiscal_document: string | null
          fiscal_type: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          neighborhood: string | null
          number: string | null
          onboarding_completed: boolean | null
          owner_name: string | null
          owner_role: string | null
          pix_key: string | null
          service_type: string | null
          slogan: string | null
          state: string | null
          street: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          bank_name?: string | null
          business_name?: string | null
          city?: string | null
          commercial_email?: string | null
          company_name?: string | null
          complement?: string | null
          created_at?: string | null
          document?: string | null
          fiscal_document?: string | null
          fiscal_type?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          neighborhood?: string | null
          number?: string | null
          onboarding_completed?: boolean | null
          owner_name?: string | null
          owner_role?: string | null
          pix_key?: string | null
          service_type?: string | null
          slogan?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          bank_name?: string | null
          business_name?: string | null
          city?: string | null
          commercial_email?: string | null
          company_name?: string | null
          complement?: string | null
          created_at?: string | null
          document?: string | null
          fiscal_document?: string | null
          fiscal_type?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          neighborhood?: string | null
          number?: string | null
          onboarding_completed?: boolean | null
          owner_name?: string | null
          owner_role?: string | null
          pix_key?: string | null
          service_type?: string | null
          slogan?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          acceptance_text: string | null
          bank_info: Json | null
          business_info: Json | null
          client_id: string | null
          client_info: Json | null
          created_at: string
          deal_id: string | null
          delivery_deadline: string | null
          fixed_value: boolean | null
          id: string
          installments: number | null
          issue_date: string
          items: Json | null
          observations: string | null
          payment_condition: string | null
          payment_method: string | null
          proposal_number: string
          total_value: number | null
          user_id: string
          validity_date: string
        }
        Insert: {
          acceptance_text?: string | null
          bank_info?: Json | null
          business_info?: Json | null
          client_id?: string | null
          client_info?: Json | null
          created_at?: string
          deal_id?: string | null
          delivery_deadline?: string | null
          fixed_value?: boolean | null
          id?: string
          installments?: number | null
          issue_date?: string
          items?: Json | null
          observations?: string | null
          payment_condition?: string | null
          payment_method?: string | null
          proposal_number: string
          total_value?: number | null
          user_id: string
          validity_date: string
        }
        Update: {
          acceptance_text?: string | null
          bank_info?: Json | null
          business_info?: Json | null
          client_id?: string | null
          client_info?: Json | null
          created_at?: string
          deal_id?: string | null
          delivery_deadline?: string | null
          fixed_value?: boolean | null
          id?: string
          installments?: number | null
          issue_date?: string
          items?: Json | null
          observations?: string | null
          payment_condition?: string | null
          payment_method?: string | null
          proposal_number?: string
          total_value?: number | null
          user_id?: string
          validity_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          deal_id: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deal_id?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deal_id?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string
          due_date: string | null
          id: string
          paid_at: string | null
          service_order_id: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string
          description: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          service_order_id?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          service_order_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
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
  public: {
    Enums: {},
  },
} as const
