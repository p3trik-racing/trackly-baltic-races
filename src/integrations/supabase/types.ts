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
      bookings: {
        Row: {
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          created_at: string
          event_id: string
          id: string
          organiser_payout: number
          platform_fee: number
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          ticket_count: number
          total_price: number
          user_id: string
          waiver_accepted: boolean
        }
        Insert: {
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          created_at?: string
          event_id: string
          id?: string
          organiser_payout: number
          platform_fee: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          ticket_count?: number
          total_price: number
          user_id: string
          waiver_accepted?: boolean
        }
        Update: {
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          created_at?: string
          event_id?: string
          id?: string
          organiser_payout?: number
          platform_fee?: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          ticket_count?: number
          total_price?: number
          user_id?: string
          waiver_accepted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          category: Database["public"]["Enums"]["event_category"]
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          date: string
          deposit: number | null
          description: string | null
          duration: string | null
          featured: boolean
          format: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          organiser_id: string | null
          organiser_name: string | null
          price: number
          requirements: string[]
          status: Database["public"]["Enums"]["event_status"]
          time: string | null
          title: string
        }
        Insert: {
          capacity?: number
          category: Database["public"]["Enums"]["event_category"]
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          date: string
          deposit?: number | null
          description?: string | null
          duration?: string | null
          featured?: boolean
          format?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          organiser_id?: string | null
          organiser_name?: string | null
          price?: number
          requirements?: string[]
          status?: Database["public"]["Enums"]["event_status"]
          time?: string | null
          title: string
        }
        Update: {
          capacity?: number
          category?: Database["public"]["Enums"]["event_category"]
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          date?: string
          deposit?: number | null
          description?: string | null
          duration?: string | null
          featured?: boolean
          format?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          organiser_id?: string | null
          organiser_name?: string | null
          price?: number
          requirements?: string[]
          status?: Database["public"]["Enums"]["event_status"]
          time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organiser_id_fkey"
            columns: ["organiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_applications: {
        Row: {
          admin_note: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string
          event_types: string[]
          events_per_year: string | null
          experience: string | null
          full_name: string
          id: string
          message: string | null
          organiser_type: string
          phone: string
          registration_no: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          socials: string | null
          status: string
          user_id: string
          venues: string | null
          website: string | null
        }
        Insert: {
          admin_note?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          event_types?: string[]
          events_per_year?: string | null
          experience?: string | null
          full_name: string
          id?: string
          message?: string | null
          organiser_type?: string
          phone: string
          registration_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          socials?: string | null
          status?: string
          user_id: string
          venues?: string | null
          website?: string | null
        }
        Update: {
          admin_note?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          event_types?: string[]
          events_per_year?: string | null
          experience?: string | null
          full_name?: string
          id?: string
          message?: string | null
          organiser_type?: string
          phone?: string
          registration_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          socials?: string | null
          status?: string
          user_id?: string
          venues?: string | null
          website?: string | null
        }
        Relationships: []
      }
      organiser_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          note: string | null
          revoked: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          note?: string | null
          revoked?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          note?: string | null
          revoked?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked: boolean
          blocked_reason: string | null
          booking_confirmations: boolean
          created_at: string
          email: string | null
          event_reminders: boolean
          favourite_categories: string[]
          full_name: string | null
          id: string
          is_organiser: boolean
          phone: string | null
          saved_events: string[]
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          blocked?: boolean
          blocked_reason?: string | null
          booking_confirmations?: boolean
          created_at?: string
          email?: string | null
          event_reminders?: boolean
          favourite_categories?: string[]
          full_name?: string | null
          id: string
          is_organiser?: boolean
          phone?: string | null
          saved_events?: string[]
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          blocked?: boolean
          blocked_reason?: string | null
          booking_confirmations?: boolean
          created_at?: string
          email?: string | null
          event_reminders?: boolean
          favourite_categories?: string[]
          full_name?: string | null
          id?: string
          is_organiser?: boolean
          phone?: string | null
          saved_events?: string[]
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _user_id: string }; Returns: boolean }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      redeem_organiser_code: { Args: { _code: string }; Returns: boolean }
      review_organiser_application: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      set_organiser_role: {
        Args: { _on: boolean; _user_id: string }
        Returns: undefined
      }
      set_user_blocked: {
        Args: { _blocked: boolean; _reason?: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "organiser"
      booking_status: "pending" | "confirmed" | "cancelled"
      event_category:
        | "track_days"
        | "drift"
        | "races"
        | "car_meets"
        | "snow_drift"
        | "festivals"
        | "majorka_special"
        | "karting"
      event_status: "draft" | "live" | "cancelled" | "past"
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
  public: {
    Enums: {
      app_role: ["admin", "organiser"],
      booking_status: ["pending", "confirmed", "cancelled"],
      event_category: [
        "track_days",
        "drift",
        "races",
        "car_meets",
        "snow_drift",
        "festivals",
        "majorka_special",
        "karting",
      ],
      event_status: ["draft", "live", "cancelled", "past"],
    },
  },
} as const
