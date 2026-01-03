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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointment_reviews: {
        Row: {
          appointment_id: string
          comment: string | null
          created_at: string
          id: string
          patient_email: string
          professional_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          created_at?: string
          id?: string
          patient_email: string
          professional_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          patient_email?: string
          professional_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          amount_cents: number
          appointment_date: string
          appointment_time: string
          confirmation_token: string | null
          created_at: string
          id: string
          notes: string | null
          patient_confirmed_at: string | null
          patient_email: string
          patient_name: string
          patient_phone: string
          payment_status: string
          professional_id: string
          professional_uuid: string | null
          service_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          appointment_date: string
          appointment_time: string
          confirmation_token?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_confirmed_at?: string | null
          patient_email: string
          patient_name: string
          patient_phone: string
          payment_status?: string
          professional_id: string
          professional_uuid?: string | null
          service_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          appointment_date?: string
          appointment_time?: string
          confirmation_token?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_confirmed_at?: string | null
          patient_email?: string
          patient_name?: string
          patient_phone?: string
          payment_status?: string
          professional_id?: string
          professional_uuid?: string | null
          service_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_professional_uuid_fkey"
            columns: ["professional_uuid"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_rooms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rental_value_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rental_value_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rental_value_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          message: string
          professional_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          message: string
          professional_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          message?: string
          professional_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_blocked_times: {
        Row: {
          block_date: string
          created_at: string
          end_time: string | null
          id: string
          professional_id: string
          reason: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          block_date: string
          created_at?: string
          end_time?: string | null
          id?: string
          professional_id: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          block_date?: string
          created_at?: string
          end_time?: string | null
          id?: string
          professional_id?: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_blocked_times_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_goals: {
        Row: {
          created_at: string
          goal_amount_cents: number
          id: string
          month: number
          professional_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          goal_amount_cents?: number
          id?: string
          month: number
          professional_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          goal_amount_cents?: number
          id?: string
          month?: number
          professional_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_goals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_payment_history: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_amount_cents: number | null
          new_status: string | null
          notes: string | null
          payment_id: string
          previous_amount_cents: number | null
          previous_status: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_amount_cents?: number | null
          new_status?: string | null
          notes?: string | null
          payment_id: string
          previous_amount_cents?: number | null
          previous_status?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_amount_cents?: number | null
          new_status?: string | null
          notes?: string | null
          payment_id?: string
          previous_amount_cents?: number | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_payment_history_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "professional_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_payments: {
        Row: {
          amount_due_cents: number
          amount_paid_cents: number
          created_at: string
          due_date: string | null
          id: string
          month: number
          notes: string | null
          paid_at: string | null
          payment_type: string
          professional_id: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          amount_due_cents?: number
          amount_paid_cents?: number
          created_at?: string
          due_date?: string | null
          id?: string
          month: number
          notes?: string | null
          paid_at?: string | null
          payment_type?: string
          professional_id: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          amount_due_cents?: number
          amount_paid_cents?: number
          created_at?: string
          due_date?: string | null
          id?: string
          month?: number
          notes?: string | null
          paid_at?: string | null
          payment_type?: string
          professional_id?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_payments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_preferences: {
        Row: {
          created_at: string
          id: string
          notify_appointment_cancelled: boolean
          notify_appointment_confirmed: boolean
          notify_new_appointment: boolean
          notify_payment_received: boolean
          notify_reminder_24h: boolean
          notify_sound_enabled: boolean
          professional_id: string
          theme_preference: string
          updated_at: string
          whatsapp_auto_message: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          notify_appointment_cancelled?: boolean
          notify_appointment_confirmed?: boolean
          notify_new_appointment?: boolean
          notify_payment_received?: boolean
          notify_reminder_24h?: boolean
          notify_sound_enabled?: boolean
          professional_id: string
          theme_preference?: string
          updated_at?: string
          whatsapp_auto_message?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          notify_appointment_cancelled?: boolean
          notify_appointment_confirmed?: boolean
          notify_new_appointment?: boolean
          notify_payment_received?: boolean
          notify_reminder_24h?: boolean
          notify_sound_enabled?: boolean
          professional_id?: string
          theme_preference?: string
          updated_at?: string
          whatsapp_auto_message?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "professional_preferences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          professional_id: string
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          professional_id: string
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          professional_id?: string
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_schedules_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          crm: string | null
          email: string
          fixed_room_value_cents: number | null
          id: string
          is_active: boolean
          name: string
          payment_percentage: number | null
          payment_type: string
          phone: string | null
          profession: string
          rating: number | null
          review_count: number | null
          room_id: string | null
          specialty_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          crm?: string | null
          email: string
          fixed_room_value_cents?: number | null
          id?: string
          is_active?: boolean
          name: string
          payment_percentage?: number | null
          payment_type?: string
          phone?: string | null
          profession?: string
          rating?: number | null
          review_count?: number | null
          room_id?: string | null
          specialty_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          crm?: string | null
          email?: string
          fixed_room_value_cents?: number | null
          id?: string
          is_active?: boolean
          name?: string
          payment_percentage?: number | null
          payment_type?: string
          phone?: string | null
          profession?: string
          rating?: number | null
          review_count?: number | null
          room_id?: string | null
          specialty_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "clinic_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_cents: number
          professional_id: string | null
          specialty_id: string
          stripe_price_id: string
          stripe_product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          professional_id?: string | null
          specialty_id: string
          stripe_price_id: string
          stripe_product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          professional_id?: string | null
          specialty_id?: string
          stripe_price_id?: string
          stripe_product_id?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "funcionario" | "cliente"
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
      app_role: ["admin", "funcionario", "cliente"],
    },
  },
} as const
