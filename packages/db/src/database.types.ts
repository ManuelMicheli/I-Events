export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          data: NonNullable<Json>;
          entity: string;
          entity_id: string | null;
          id: number;
          org_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          entity: string;
          entity_id?: string | null;
          id?: never;
          org_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          org_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_stages: {
        Row: {
          city: string | null;
          date: string | null;
          id: string;
          position: number;
          request_id: string;
          venue_hint: string | null;
        };
        Insert: {
          city?: string | null;
          date?: string | null;
          id?: string;
          position: number;
          request_id: string;
          venue_hint?: string | null;
        };
        Update: {
          city?: string | null;
          date?: string | null;
          id?: string;
          position?: number;
          request_id?: string;
          venue_hint?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_stages_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      connections: {
        Row: {
          accepted_at: string | null;
          agency_org_id: string | null;
          client_org_id: string | null;
          created_at: string;
          id: string;
          initiated_by_org: string;
          invite_email: string | null;
          message: string | null;
          status: Database["public"]["Enums"]["connection_status"];
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          agency_org_id?: string | null;
          client_org_id?: string | null;
          created_at?: string;
          id?: string;
          initiated_by_org: string;
          invite_email?: string | null;
          message?: string | null;
          status?: Database["public"]["Enums"]["connection_status"];
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          agency_org_id?: string | null;
          client_org_id?: string | null;
          created_at?: string;
          id?: string;
          initiated_by_org?: string;
          invite_email?: string | null;
          message?: string | null;
          status?: Database["public"]["Enums"]["connection_status"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connections_agency_org_id_fkey";
            columns: ["agency_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connections_client_org_id_fkey";
            columns: ["client_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connections_initiated_by_org_fkey";
            columns: ["initiated_by_org"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          city: string | null;
          company: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          org_id: string;
          phone: string | null;
          rating: number | null;
          regions: string[];
          role_title: string | null;
          services: string[];
          source: string;
          supplier_org_id: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          city?: string | null;
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          org_id: string;
          phone?: string | null;
          rating?: number | null;
          regions?: string[];
          role_title?: string | null;
          services?: string[];
          source?: string;
          supplier_org_id?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          city?: string | null;
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          org_id?: string;
          phone?: string | null;
          rating?: number | null;
          regions?: string[];
          role_title?: string | null;
          services?: string[];
          source?: string;
          supplier_org_id?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_supplier_org_id_fkey";
            columns: ["supplier_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      event_bookings: {
        Row: {
          actual_cost: number | null;
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          event_id: string;
          id: string;
          notes: string | null;
          org_id: string;
          planned_cost: number | null;
          requested_at: string | null;
          responded_at: string | null;
          service_key: string;
          status: Database["public"]["Enums"]["booking_status"];
          supplier_note: string | null;
          supplier_price: number | null;
          supplier_response: string | null;
          updated_at: string;
          booking_supplier_org: string | null;
        };
        Insert: {
          actual_cost?: number | null;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_id: string;
          id?: string;
          notes?: string | null;
          org_id: string;
          planned_cost?: number | null;
          requested_at?: string | null;
          responded_at?: string | null;
          service_key: string;
          status?: Database["public"]["Enums"]["booking_status"];
          supplier_note?: string | null;
          supplier_price?: number | null;
          supplier_response?: string | null;
          updated_at?: string;
        };
        Update: {
          actual_cost?: number | null;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_id?: string;
          id?: string;
          notes?: string | null;
          org_id?: string;
          planned_cost?: number | null;
          requested_at?: string | null;
          responded_at?: string | null;
          service_key?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          supplier_note?: string | null;
          supplier_price?: number | null;
          supplier_response?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_bookings_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_bookings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_bookings_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_bookings_service_key_fkey";
            columns: ["service_key"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["key"];
          },
        ];
      };
      event_crew: {
        Row: {
          booking_id: string | null;
          call_time: string | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
          created_by: string | null;
          day: string;
          event_id: string;
          id: string;
          name: string | null;
          org_id: string;
          pass_token: string;
          phone: string | null;
          role: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          booking_id?: string | null;
          call_time?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          day: string;
          event_id: string;
          id?: string;
          name?: string | null;
          org_id: string;
          pass_token?: string;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          booking_id?: string | null;
          call_time?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          day?: string;
          event_id?: string;
          id?: string;
          name?: string | null;
          org_id?: string;
          pass_token?: string;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_crew_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "event_bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_crew_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_crew_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_crew_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      event_quotes: {
        Row: {
          client_org_id: string;
          created_at: string;
          created_by: string | null;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          event_id: string;
          id: string;
          lines: NonNullable<Json>;
          note: string | null;
          org_id: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          total_amount: number;
          updated_at: string;
          version: number | null;
        };
        Insert: {
          client_org_id: string;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          event_id: string;
          id?: string;
          lines?: NonNullable<Json>;
          note?: string | null;
          org_id: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          total_amount?: number;
          updated_at?: string;
          version?: number | null;
        };
        Update: {
          client_org_id?: string;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          event_id?: string;
          id?: string;
          lines?: NonNullable<Json>;
          note?: string | null;
          org_id?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          total_amount?: number;
          updated_at?: string;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_quotes_client_org_id_fkey";
            columns: ["client_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_quotes_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_quotes_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      event_schedule_items: {
        Row: {
          assignee_id: string | null;
          booking_id: string | null;
          created_at: string;
          created_by: string | null;
          day: string;
          ends_at: string | null;
          event_id: string;
          id: string;
          location: string | null;
          notes: string | null;
          org_id: string;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee_id?: string | null;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          day: string;
          ends_at?: string | null;
          event_id: string;
          id?: string;
          location?: string | null;
          notes?: string | null;
          org_id: string;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          day?: string;
          ends_at?: string | null;
          event_id?: string;
          id?: string;
          location?: string | null;
          notes?: string | null;
          org_id?: string;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_schedule_items_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_schedule_items_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "event_bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_schedule_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_schedule_items_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      event_tasks: {
        Row: {
          assignee_id: string | null;
          booking_id: string | null;
          created_at: string;
          created_by: string | null;
          done_at: string | null;
          done_by: string | null;
          due_date: string | null;
          event_id: string;
          id: string;
          notes: string | null;
          org_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee_id?: string | null;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          due_date?: string | null;
          event_id: string;
          id?: string;
          notes?: string | null;
          org_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          due_date?: string | null;
          event_id?: string;
          id?: string;
          notes?: string | null;
          org_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_tasks_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "event_bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_tasks_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_tasks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          agency_org_id: string;
          city: string | null;
          client_org_id: string;
          created_at: string;
          end_date: string | null;
          event_type: Database["public"]["Enums"]["event_type"] | null;
          id: string;
          is_public: boolean;
          proposal_id: string;
          request_id: string;
          stage_id: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["event_status"];
          title: string;
          venue: string | null;
        };
        Insert: {
          agency_org_id: string;
          city?: string | null;
          client_org_id: string;
          created_at?: string;
          end_date?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"] | null;
          id?: string;
          is_public?: boolean;
          proposal_id: string;
          request_id: string;
          stage_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          title: string;
          venue?: string | null;
        };
        Update: {
          agency_org_id?: string;
          city?: string | null;
          client_org_id?: string;
          created_at?: string;
          end_date?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"] | null;
          id?: string;
          is_public?: boolean;
          proposal_id?: string;
          request_id?: string;
          stage_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          title?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_agency_org_id_fkey";
            columns: ["agency_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_client_org_id_fkey";
            columns: ["client_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: false;
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "campaign_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_profiles: {
        Row: {
          description: string;
          email: string | null;
          headline: string;
          is_listed: boolean;
          org_id: string;
          phone: string | null;
          regions: string[];
          services: string[];
          updated_at: string;
          website: string | null;
        };
        Insert: {
          description?: string;
          email?: string | null;
          headline?: string;
          is_listed?: boolean;
          org_id: string;
          phone?: string | null;
          regions?: string[];
          services?: string[];
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          description?: string;
          email?: string | null;
          headline?: string;
          is_listed?: boolean;
          org_id?: string;
          phone?: string | null;
          regions?: string[];
          services?: string[];
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      member_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          org_id: string;
          role: Database["public"]["Enums"]["member_role"];
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id: string;
          role: Database["public"]["Enums"]["member_role"];
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_invitations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          org_id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          org_id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          author_id: string | null;
          author_org_id: string;
          body: string;
          created_at: string;
          id: string;
          internal: boolean;
          item_id: string | null;
          proposal_id: string;
        };
        Insert: {
          author_id?: string | null;
          author_org_id: string;
          body: string;
          created_at?: string;
          id?: string;
          internal?: boolean;
          item_id?: string | null;
          proposal_id: string;
        };
        Update: {
          author_id?: string | null;
          author_org_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          internal?: boolean;
          item_id?: string | null;
          proposal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_author_org_id_fkey";
            columns: ["author_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "request_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: false;
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          email_status: string;
          emailed_at: string | null;
          id: string;
          kind: string;
          link: string | null;
          org_id: string;
          push_status: string;
          pushed_at: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          email_status?: string;
          emailed_at?: string | null;
          id?: string;
          kind: string;
          link?: string | null;
          org_id: string;
          push_status?: string;
          pushed_at?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          email_status?: string;
          emailed_at?: string | null;
          id?: string;
          kind?: string;
          link?: string | null;
          org_id?: string;
          push_status?: string;
          pushed_at?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          city: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          type: Database["public"]["Enums"]["org_type"];
          vat_number: string | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
          type: Database["public"]["Enums"]["org_type"];
          vat_number?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          type?: Database["public"]["Enums"]["org_type"];
          vat_number?: string | null;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          created_at: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      portfolio_items: {
        Row: {
          city: string | null;
          client_name: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          happened_on: string | null;
          id: string;
          org_id: string;
          title: string;
        };
        Insert: {
          city?: string | null;
          client_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          happened_on?: string | null;
          id?: string;
          org_id: string;
          title: string;
        };
        Update: {
          city?: string | null;
          client_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          happened_on?: string | null;
          id?: string;
          org_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_items_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_photos: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          org_id: string;
          position: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id: string;
          org_id: string;
          position?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id?: string;
          org_id?: string;
          position?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "portfolio_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_photos_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email_notifications: boolean;
          full_name: string;
          id: string;
          locale: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email_notifications?: boolean;
          full_name?: string;
          id: string;
          locale?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email_notifications?: boolean;
          full_name?: string;
          id?: string;
          locale?: string;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          agency_org_id: string;
          created_at: string;
          currency: string;
          decided_at: string | null;
          id: string;
          lines: NonNullable<Json>;
          request_id: string;
          status: Database["public"]["Enums"]["proposal_status"];
          submitted_at: string | null;
          summary: string | null;
          total_amount: number | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          agency_org_id: string;
          created_at?: string;
          currency?: string;
          decided_at?: string | null;
          id?: string;
          lines?: NonNullable<Json>;
          request_id: string;
          status?: Database["public"]["Enums"]["proposal_status"];
          submitted_at?: string | null;
          summary?: string | null;
          total_amount?: number | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          agency_org_id?: string;
          created_at?: string;
          currency?: string;
          decided_at?: string | null;
          id?: string;
          lines?: NonNullable<Json>;
          request_id?: string;
          status?: Database["public"]["Enums"]["proposal_status"];
          submitted_at?: string | null;
          summary?: string | null;
          total_amount?: number | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "proposals_agency_org_id_fkey";
            columns: ["agency_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          last_seen_at: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          last_seen_at?: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          last_seen_at?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      request_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          proposal_id: string | null;
          request_id: string;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          proposal_id?: string | null;
          request_id: string;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          proposal_id?: string | null;
          request_id?: string;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "request_attachments_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: false;
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      request_items: {
        Row: {
          answers: NonNullable<Json>;
          category_key: string;
          created_at: string;
          id: string;
          request_id: string;
          stage_id: string | null;
        };
        Insert: {
          answers?: NonNullable<Json>;
          category_key: string;
          created_at?: string;
          id?: string;
          request_id: string;
          stage_id?: string | null;
        };
        Update: {
          answers?: NonNullable<Json>;
          category_key?: string;
          created_at?: string;
          id?: string;
          request_id?: string;
          stage_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "request_items_category_key_fkey";
            columns: ["category_key"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "request_items_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_items_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "campaign_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      requests: {
        Row: {
          audience: string | null;
          budget_max: number | null;
          budget_min: number | null;
          campaign: Json | null;
          city: string | null;
          client_org_id: string;
          completeness: number;
          created_at: string;
          created_by: string | null;
          end_date: string | null;
          event_type: Database["public"]["Enums"]["event_type"] | null;
          free_text: string | null;
          guests: number | null;
          id: string;
          is_public: boolean;
          kind: Database["public"]["Enums"]["request_kind"];
          objective: string;
          start_date: string | null;
          status: Database["public"]["Enums"]["request_status"];
          submitted_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          campaign?: Json | null;
          city?: string | null;
          client_org_id: string;
          completeness?: number;
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"] | null;
          free_text?: string | null;
          guests?: number | null;
          id?: string;
          is_public?: boolean;
          kind: Database["public"]["Enums"]["request_kind"];
          objective: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          submitted_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          campaign?: Json | null;
          city?: string | null;
          client_org_id?: string;
          completeness?: number;
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"] | null;
          free_text?: string | null;
          guests?: number | null;
          id?: string;
          is_public?: boolean;
          kind?: Database["public"]["Enums"]["request_kind"];
          objective?: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requests_client_org_id_fkey";
            columns: ["client_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          author_id: string | null;
          author_org_id: string;
          booking_id: string | null;
          comment: string;
          created_at: string;
          event_id: string;
          id: string;
          rating: number;
          replied_at: string | null;
          reply: string | null;
          subject_org_id: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          author_org_id: string;
          booking_id?: string | null;
          comment?: string;
          created_at?: string;
          event_id: string;
          id?: string;
          rating: number;
          replied_at?: string | null;
          reply?: string | null;
          subject_org_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          author_org_id?: string;
          booking_id?: string | null;
          comment?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          rating?: number;
          replied_at?: string | null;
          reply?: string | null;
          subject_org_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_author_org_id_fkey";
            columns: ["author_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "event_bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_subject_org_id_fkey";
            columns: ["subject_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          active: boolean;
          icon: string;
          key: string;
          name: NonNullable<Json>;
          questions: NonNullable<Json>;
          sort: number;
        };
        Insert: {
          active?: boolean;
          icon: string;
          key: string;
          name: NonNullable<Json>;
          questions?: NonNullable<Json>;
          sort?: number;
        };
        Update: {
          active?: boolean;
          icon?: string;
          key?: string;
          name?: NonNullable<Json>;
          questions?: NonNullable<Json>;
          sort?: number;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          current_period_end: string;
          org_id: string;
          plan: Database["public"]["Enums"]["plan_id"];
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
        };
        Insert: {
          current_period_end?: string;
          org_id: string;
          plan?: Database["public"]["Enums"]["plan_id"];
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
        };
        Update: {
          current_period_end?: string;
          org_id?: string;
          plan?: Database["public"]["Enums"]["plan_id"];
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_invitations: {
        Row: {
          accepted_at: string | null;
          contact_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          org_id: string;
          supplier_org_id: string | null;
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          contact_id: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id: string;
          supplier_org_id?: string | null;
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          contact_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id?: string;
          supplier_org_id?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_invitations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_invitations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_invitations_supplier_org_id_fkey";
            columns: ["supplier_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_unavailability: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          note: string | null;
          org_id: string;
          starts_on: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          note?: string | null;
          org_id: string;
          starts_on: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          note?: string | null;
          org_id?: string;
          starts_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_unavailability_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_connection: { Args: { p_org: string; p_token: string }; Returns: string };
      accept_member_invitation: { Args: { p_token: string }; Returns: string };
      accept_proposal: { Args: { p_proposal: string }; Returns: string[] };
      accept_supplier_invitation: { Args: { p_org: string; p_token: string }; Returns: string };
      add_marketplace_supplier: { Args: { p_agency: string; p_supplier: string }; Returns: string };
      booking_supplier_org: {
        Args: { b: Database["public"]["Tables"]["event_bookings"]["Row"] };
        Returns: string;
      };
      can_edit_portfolio: { Args: { p_org: string }; Returns: boolean };
      can_edit_request: { Args: { p_request: string }; Returns: boolean };
      can_read_attachment: { Args: { p_proposal: string; p_request: string }; Returns: boolean };
      can_read_request: { Args: { p_request: string }; Returns: boolean };
      can_write_attachment: { Args: { p_proposal: string; p_request: string }; Returns: boolean };
      cancel_request: { Args: { p_request: string }; Returns: undefined };
      claim_notification_emails: {
        Args: { p_limit?: number };
        Returns: {
          body: string;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          link: string;
          locale: string;
          title: string;
          user_id: string;
        }[];
      };
      claim_notification_pushes: {
        Args: { p_limit?: number };
        Returns: {
          body: string;
          id: string;
          kind: string;
          link: string;
          org_id: string;
          title: string;
          tokens: string[];
          unread: number;
          user_id: string;
        }[];
      };
      create_organization: {
        Args: {
          p_city?: string;
          p_name: string;
          p_slug: string;
          p_type: Database["public"]["Enums"]["org_type"];
        };
        Returns: string;
      };
      crew_pass: {
        Args: { p_token: string };
        Returns: {
          agency_name: string;
          call_time: string;
          checked_in_at: string;
          city: string;
          day: string;
          event_status: Database["public"]["Enums"]["event_status"];
          event_title: string;
          person: string;
          role: string;
          service_key: string;
          venue: string;
        }[];
      };
      decide_event_quote: {
        Args: { p_approve: boolean; p_note?: string; p_quote: string };
        Returns: undefined;
      };
      event_busy_contacts: {
        Args: { p_event: string };
        Returns: {
          contact_id: string;
          days: string[];
        }[];
      };
      finish_notification_emails: {
        Args: { p_ids: string[]; p_status: string };
        Returns: undefined;
      };
      finish_notification_pushes: {
        Args: { p_ids: string[]; p_status: string };
        Returns: undefined;
      };
      import_contacts: { Args: { p_org: string; p_rows: Json; p_source?: string }; Returns: Json };
      invite_connection: {
        Args: { p_email?: string; p_from_org: string; p_message?: string; p_target_org?: string };
        Returns: string;
      };
      invite_member: {
        Args: {
          p_email: string;
          p_org: string;
          p_role: Database["public"]["Enums"]["member_role"];
        };
        Returns: string;
      };
      invite_supplier: { Args: { p_contact: string }; Returns: string };
      is_booking_supplier: { Args: { p_booking: string }; Returns: boolean };
      is_connected: { Args: { a: string; b: string }; Returns: boolean };
      is_listed: { Args: { p_org: string }; Returns: boolean };
      is_member: {
        Args: { roles?: Database["public"]["Enums"]["member_role"][]; target: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      leave_review: {
        Args: {
          p_author: string;
          p_comment?: string;
          p_event: string;
          p_rating: number;
          p_subject: string;
        };
        Returns: string;
      };
      log_activity: {
        Args: {
          p_action: string;
          p_data?: Json;
          p_entity: string;
          p_entity_id: string;
          p_org: string;
        };
        Returns: undefined;
      };
      marketplace_profile: {
        Args: { p_slug: string };
        Returns: {
          city: string;
          description: string;
          email: string;
          events_done: number;
          headline: string;
          member_since: string;
          name: string;
          org_id: string;
          phone: string;
          rating_avg: number;
          rating_count: number;
          regions: string[];
          services: string[];
          type: Database["public"]["Enums"]["org_type"];
          website: string;
        }[];
      };
      my_org_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_organizations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          role: Database["public"]["Enums"]["member_role"];
          slug: string;
          type: Database["public"]["Enums"]["org_type"];
        }[];
      };
      notify_org: {
        Args: { p_body: string; p_kind: string; p_link: string; p_org: string; p_title: string };
        Returns: undefined;
      };
      org_rating: {
        Args: { p_org: string };
        Returns: {
          rating_avg: number;
          rating_count: number;
        }[];
      };
      org_reviews: {
        Args: { p_limit?: number; p_org: string };
        Returns: {
          author_name: string;
          author_type: Database["public"]["Enums"]["org_type"];
          comment: string;
          created_at: string;
          id: string;
          rating: number;
          replied_at: string;
          reply: string;
        }[];
      };
      preview_invitation: {
        Args: { p_token: string };
        Returns: {
          kind: string;
          org_name: string;
          org_type: Database["public"]["Enums"]["org_type"];
          role: Database["public"]["Enums"]["member_role"];
          valid: boolean;
        }[];
      };
      register_push_token: { Args: { p_platform: string; p_token: string }; Returns: undefined };
      remove_push_tokens: { Args: { p_tokens: string[] }; Returns: undefined };
      reply_to_review: { Args: { p_reply: string; p_review: string }; Returns: undefined };
      request_revision: { Args: { p_note: string; p_proposal: string }; Returns: undefined };
      respond_to_booking: {
        Args: { p_available: boolean; p_booking: string; p_note?: string; p_price?: number };
        Returns: undefined;
      };
      reviewable_for: {
        Args: { p_author: string; p_event: string };
        Returns: {
          booking_id: string;
          subject_org_id: string;
        }[];
      };
      save_request_draft: {
        Args: { p_client_org: string; p_payload: Json; p_request?: string };
        Returns: string;
      };
      search_marketplace: {
        Args: {
          p_area?: string;
          p_date?: string;
          p_from_org?: string;
          p_limit?: number;
          p_query?: string;
          p_service?: string;
          p_type: Database["public"]["Enums"]["org_type"];
        };
        Returns: {
          city: string;
          connected: boolean;
          contact_id: string;
          headline: string;
          name: string;
          org_id: string;
          rating_avg: number;
          rating_count: number;
          regions: string[];
          services: string[];
          slug: string;
        }[];
      };
      send_event_quote: { Args: { p_quote: string }; Returns: number };
      set_proposal_status: {
        Args: { p_proposal: string; p_status: Database["public"]["Enums"]["proposal_status"] };
        Returns: undefined;
      };
      shares_request_with: { Args: { p_org: string }; Returns: boolean };
      submit_proposal: {
        Args: { p_lines?: Json; p_proposal: string; p_summary: string; p_total: number };
        Returns: number;
      };
      submit_request: { Args: { p_agencies: string[]; p_request: string }; Returns: number };
      supplier_agencies: {
        Args: { p_org: string };
        Returns: {
          agency_name: string;
          open_requests: number;
        }[];
      };
      supplier_booking_schedule: {
        Args: { p_booking: string };
        Returns: {
          day: string;
          ends_at: string;
          kind: string;
          location: string;
          starts_at: string;
          title: string;
        }[];
      };
      supplier_bookings: {
        Args: { p_org: string };
        Returns: {
          agency_name: string;
          city: string;
          description: string;
          end_date: string;
          event_status: Database["public"]["Enums"]["event_status"];
          event_title: string;
          id: string;
          requested_at: string;
          responded_at: string;
          service_key: string;
          start_date: string;
          status: Database["public"]["Enums"]["booking_status"];
          supplier_note: string;
          supplier_price: number;
          supplier_response: string;
          venue: string;
        }[];
      };
      supplier_busy: {
        Args: { p_except_event?: string; p_from: string; p_supplier: string; p_to: string };
        Returns: {
          booked: boolean;
          day: string;
        }[];
      };
      supplier_busy_days: {
        Args: { p_from: string; p_supplier: string; p_to: string };
        Returns: {
          booked: boolean;
          day: string;
        }[];
      };
      unregister_push_token: { Args: { p_token: string }; Returns: undefined };
      valid_services: { Args: { p_services: string[] }; Returns: string[] };
    };
    Enums: {
      booking_status: "to_book" | "requested" | "confirmed" | "cancelled";
      connection_status: "pending" | "active" | "revoked";
      event_status: "planning" | "preparing" | "live" | "completed" | "cancelled";
      event_type: "music" | "brand" | "business" | "gala" | "culture" | "sport";
      member_role: "owner" | "admin" | "manager" | "member" | "approver";
      org_type: "agency" | "client" | "supplier";
      plan_id: "trial" | "starter" | "pro" | "enterprise";
      proposal_status:
        | "invited"
        | "reviewing"
        | "clarification"
        | "submitted"
        | "revision_requested"
        | "accepted"
        | "rejected"
        | "declined"
        | "withdrawn";
      quote_status: "draft" | "sent" | "approved" | "changes_requested" | "superseded";
      request_kind: "single" | "campaign";
      request_status: "draft" | "sent" | "awarded" | "cancelled";
      subscription_status: "trialing" | "active" | "past_due" | "canceled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: ["to_book", "requested", "confirmed", "cancelled"],
      connection_status: ["pending", "active", "revoked"],
      event_status: ["planning", "preparing", "live", "completed", "cancelled"],
      event_type: ["music", "brand", "business", "gala", "culture", "sport"],
      member_role: ["owner", "admin", "manager", "member", "approver"],
      org_type: ["agency", "client", "supplier"],
      plan_id: ["trial", "starter", "pro", "enterprise"],
      proposal_status: [
        "invited",
        "reviewing",
        "clarification",
        "submitted",
        "revision_requested",
        "accepted",
        "rejected",
        "declined",
        "withdrawn",
      ],
      quote_status: ["draft", "sent", "approved", "changes_requested", "superseded"],
      request_kind: ["single", "campaign"],
      request_status: ["draft", "sent", "awarded", "cancelled"],
      subscription_status: ["trialing", "active", "past_due", "canceled"],
    },
  },
} as const;
