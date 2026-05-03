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
          description: string | null
          duration: string | null
          featured: boolean
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          organiser_id: string | null
          organiser_name: string | null
          price: number
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
          description?: string | null
          duration?: string | null
          featured?: boolean
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          organiser_id?: string | null
          organiser_name?: string | null
          price?: number
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
          description?: string | null
          duration?: string | null
          featured?: boolean
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          organiser_id?: string | null
          organiser_name?: string | null
          price?: number
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
      profiles: {
        Row: {
          avatar_url: string | null
          booking_confirmations: boolean
          created_at: string
          email: string | null
          event_reminders: boolean
          favourite_categories: string[]
          full_name: string | null
          id: string
          is_organiser: boolean
          phone: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          booking_confirmations?: boolean
          created_at?: string
          email?: string | null
          event_reminders?: boolean
          favourite_categories?: string[]
          full_name?: string | null
          id: string
          is_organiser?: boolean
          phone?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          booking_confirmations?: boolean
          created_at?: string
          email?: string | null
          event_reminders?: boolean
          favourite_categories?: string[]
          full_name?: string | null
          id?: string
          is_organiser?: boolean
          phone?: string | null
          username?: string | null
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
      booking_status: "pending" | "confirmed" | "cancelled"
      event_category:
        | "track_days"
        | "drift"
        | "races"
        | "car_meets"
        | "snow_drift"
        | "festivals"
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
      booking_status: ["pending", "confirmed", "cancelled"],
      event_category: [
        "track_days",
        "drift",
        "races",
        "car_meets",
        "snow_drift",
        "festivals",
      ],
      event_status: ["draft", "live", "cancelled", "past"],
    },
  },
} as const
