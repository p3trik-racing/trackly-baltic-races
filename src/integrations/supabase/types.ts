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
          check_in_code: string
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          no_show: boolean
          organiser_payout: number
          platform_fee: number
          reminder_sent_at: string | null
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
          check_in_code?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          no_show?: boolean
          organiser_payout: number
          platform_fee: number
          reminder_sent_at?: string | null
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
          check_in_code?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          no_show?: boolean
          organiser_payout?: number
          platform_fee?: number
          reminder_sent_at?: string | null
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
      competition_entries: {
        Row: {
          car: string | null
          class: string | null
          competition_id: string
          created_at: string
          email: string
          full_name: string
          has_licence: boolean
          id: string
          message: string | null
          needs_help: string[]
          phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          car?: string | null
          class?: string | null
          competition_id: string
          created_at?: string
          email: string
          full_name: string
          has_licence?: boolean
          id?: string
          message?: string | null
          needs_help?: string[]
          phone?: string | null
          status?: string
          user_id: string
        }
        Update: {
          car?: string | null
          class?: string | null
          competition_id?: string
          created_at?: string
          email?: string
          full_name?: string
          has_licence?: boolean
          id?: string
          message?: string | null
          needs_help?: string[]
          phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          beginner_friendly: boolean
          car_requirements: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          discipline: string
          entry_fee: string | null
          how_to_enter: string | null
          i18n: Json
          id: string
          licence: string | null
          name: string
          organiser: string | null
          regulations_url: string | null
          rounds: Json
          season: string | null
          slug: string
          sort: number
          status: string
          website: string | null
        }
        Insert: {
          beginner_friendly?: boolean
          car_requirements?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          discipline: string
          entry_fee?: string | null
          how_to_enter?: string | null
          i18n?: Json
          id?: string
          licence?: string | null
          name: string
          organiser?: string | null
          regulations_url?: string | null
          rounds?: Json
          season?: string | null
          slug: string
          sort?: number
          status?: string
          website?: string | null
        }
        Update: {
          beginner_friendly?: boolean
          car_requirements?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          discipline?: string
          entry_fee?: string | null
          how_to_enter?: string | null
          i18n?: Json
          id?: string
          licence?: string | null
          name?: string
          organiser?: string | null
          regulations_url?: string | null
          rounds?: Json
          season?: string | null
          slug?: string
          sort?: number
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      event_ratings: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          stars: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          stars: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          announced_at: string | null
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
          photos_shared_at: string | null
          photos_url: string | null
          price: number
          rating_prompted_at: string | null
          requirements: string[]
          status: Database["public"]["Enums"]["event_status"]
          time: string | null
          title: string
        }
        Insert: {
          announced_at?: string | null
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
          photos_shared_at?: string | null
          photos_url?: string | null
          price?: number
          rating_prompted_at?: string | null
          requirements?: string[]
          status?: Database["public"]["Enums"]["event_status"]
          time?: string | null
          title: string
        }
        Update: {
          announced_at?: string | null
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
          photos_shared_at?: string | null
          photos_url?: string | null
          price?: number
          rating_prompted_at?: string | null
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
      follows: {
        Row: {
          created_at: string
          organiser_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organiser_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organiser_id?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          link: string | null
          message: string
          read: boolean
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
      organiser_messages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string
          recipients: number
          sender_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message: string
          recipients?: number
          sender_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string
          recipients?: number
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          invite_code: string | null
          is_organiser: boolean
          lang: string
          notify_favourites: boolean
          notify_followed: boolean
          notify_organiser_messages: boolean
          phone: string | null
          saved_events: string[]
          show_attendance: boolean
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
          invite_code?: string | null
          is_organiser?: boolean
          lang?: string
          notify_favourites?: boolean
          notify_followed?: boolean
          notify_organiser_messages?: boolean
          phone?: string | null
          saved_events?: string[]
          show_attendance?: boolean
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
          invite_code?: string | null
          is_organiser?: boolean
          lang?: string
          notify_favourites?: boolean
          notify_followed?: boolean
          notify_organiser_messages?: boolean
          phone?: string | null
          saved_events?: string[]
          show_attendance?: boolean
          username?: string | null
        }
        Relationships: []
      }
      race_ticket_types: {
        Row: {
          capacity: number | null
          competition_id: string
          created_at: string
          id: string
          kind: string
          name: string
          price: number
          round_date: string | null
          round_label: string
          sales_open: boolean
        }
        Insert: {
          capacity?: number | null
          competition_id: string
          created_at?: string
          id?: string
          kind: string
          name: string
          price?: number
          round_date?: string | null
          round_label: string
          sales_open?: boolean
        }
        Update: {
          capacity?: number | null
          competition_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          price?: number
          round_date?: string | null
          round_label?: string
          sales_open?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "race_ticket_types_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      race_tickets: {
        Row: {
          car: string | null
          check_in_code: string
          checked_in_at: string | null
          class: string | null
          created_at: string
          email: string
          holder_name: string
          id: string
          licence_no: string | null
          payment_status: string
          phone: string | null
          quantity: number
          status: string
          ticket_type_id: string
          user_id: string
        }
        Insert: {
          car?: string | null
          check_in_code?: string
          checked_in_at?: string | null
          class?: string | null
          created_at?: string
          email: string
          holder_name: string
          id?: string
          licence_no?: string | null
          payment_status?: string
          phone?: string | null
          quantity?: number
          status?: string
          ticket_type_id: string
          user_id: string
        }
        Update: {
          car?: string | null
          check_in_code?: string
          checked_in_at?: string | null
          class?: string | null
          created_at?: string
          email?: string
          holder_name?: string
          id?: string
          licence_no?: string | null
          payment_status?: string
          phone?: string | null
          quantity?: number
          status?: string
          ticket_type_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "race_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_bookings: {
        Row: {
          amount: number
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          check_in_code: string
          created_at: string
          id: string
          is_host: boolean
          kind: string
          payment_status: string
          slot_id: string
          spots: number
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          check_in_code?: string
          created_at?: string
          id?: string
          is_host?: boolean
          kind: string
          payment_status?: string
          slot_id: string
          spots?: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          check_in_code?: string
          created_at?: string
          id?: string
          is_host?: boolean
          kind?: string
          payment_status?: string
          slot_id?: string
          spots?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "venue_slots"
            referencedColumns: ["id"]
          },
        ]
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
      venue_price_rules: {
        Row: {
          days: number[]
          end_time: string
          id: string
          label: string | null
          price_per_hour: number
          start_time: string
          venue_id: string
        }
        Insert: {
          days: number[]
          end_time: string
          id?: string
          label?: string | null
          price_per_hour: number
          start_time: string
          venue_id: string
        }
        Update: {
          days?: number[]
          end_time?: string
          id?: string
          label?: string | null
          price_per_hour?: number
          start_time?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_slots: {
        Row: {
          created_at: string
          date: string
          end_time: string
          host_gap: number | null
          host_id: string | null
          id: string
          max_cars: number
          min_cars: number
          notes: string | null
          per_spot_price: number | null
          price_total: number
          split_deadline: string | null
          start_time: string
          status: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          host_gap?: number | null
          host_id?: string | null
          id?: string
          max_cars: number
          min_cars?: number
          notes?: string | null
          per_spot_price?: number | null
          price_total: number
          split_deadline?: string | null
          start_time: string
          status?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          host_gap?: number | null
          host_id?: string | null
          id?: string
          max_cars?: number
          min_cars?: number
          notes?: string | null
          per_spot_price?: number | null
          price_total?: number
          split_deadline?: string | null
          start_time?: string
          status?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          city: string | null
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          name: string
          owner_id: string | null
          phone: string | null
          requirements: string[]
          slug: string
          status: string
          track_info: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          requirements?: string[]
          slug: string
          status?: string
          track_info?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          requirements?: string[]
          slug?: string
          status?: string
          track_info?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _code: string }; Returns: string }
      admin_organiser_ratings: {
        Args: never
        Returns: {
          avg_stars: number
          events_rated: number
          last_event: string
          organiser_id: string
          organiser_name: string
          ratings: number
        }[]
      }
      announce_event: { Args: { _event_id: string }; Returns: Json }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      book_slot_whole: {
        Args: {
          _cars: number
          _email: string
          _name: string
          _phone: string
          _slot_id: string
        }
        Returns: string
      }
      buy_race_ticket: {
        Args: {
          _car: string
          _class: string
          _email: string
          _licence: string
          _name: string
          _phone: string
          _qty: number
          _type_id: string
        }
        Returns: string
      }
      can_manage_event: { Args: { _event_id: string }; Returns: boolean }
      can_manage_venue: { Args: { _venue_id: string }; Returns: boolean }
      cancel_race_ticket: { Args: { _ticket_id: string }; Returns: undefined }
      cancel_slot_booking: { Args: { _booking_id: string }; Returns: undefined }
      check_in_booking: {
        Args: { _booking_id?: string; _code?: string; _event_id?: string }
        Returns: Json
      }
      close_check_in: { Args: { _event_id: string }; Returns: number }
      event_rating_summary: {
        Args: { _event_id: string }
        Returns: {
          avg_stars: number
          ratings: number
        }[]
      }
      friends_going: {
        Args: { _event_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inviter_preview: {
        Args: { _code: string }
        Returns: {
          avatar_url: string
          full_name: string
          username: string
        }[]
      }
      is_blocked: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      join_split: {
        Args: {
          _email: string
          _name: string
          _phone: string
          _slot_id: string
          _spots: number
        }
        Returns: string
      }
      my_friends: {
        Args: never
        Returns: {
          avatar_url: string
          friendship_id: string
          full_name: string
          incoming: boolean
          status: string
          user_id: string
          username: string
        }[]
      }
      organiser_rating_summary: {
        Args: { _organiser_id: string }
        Returns: {
          avg_stars: number
          events_rated: number
          ratings: number
        }[]
      }
      process_split_deadlines: { Args: never; Returns: number }
      prompt_event_ratings: { Args: never; Returns: number }
      race_tickets_left: { Args: { _type_id: string }; Returns: number }
      rate_event: {
        Args: { _comment: string; _event_id: string; _stars: number }
        Returns: undefined
      }
      redeem_organiser_code: { Args: { _code: string }; Returns: boolean }
      remove_friend: { Args: { _other: string }; Returns: undefined }
      respond_friend_request: {
        Args: { _accept: boolean; _id: string }
        Returns: undefined
      }
      review_organiser_application: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      search_profiles: {
        Args: { _q: string }
        Returns: {
          avatar_url: string
          friendship: string
          full_name: string
          id: string
          username: string
        }[]
      }
      send_attendee_message: {
        Args: { _event_id: string; _message: string }
        Returns: Json
      }
      send_friend_request: { Args: { _target: string }; Returns: string }
      set_admin_role: {
        Args: { _on: boolean; _user_id: string }
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
      share_event_photos: {
        Args: { _event_id: string; _url: string }
        Returns: number
      }
      slot_spots_taken: { Args: { _slot_id: string }; Returns: number }
      start_split: {
        Args: {
          _deadline: string
          _email: string
          _name: string
          _phone: string
          _slot_id: string
          _spots: number
        }
        Returns: string
      }
      undo_check_in: { Args: { _booking_id: string }; Returns: undefined }
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
