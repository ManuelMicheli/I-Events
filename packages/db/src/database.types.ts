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
      events: {
        Row: {
          agency_org_id: string;
          city: string | null;
          client_org_id: string;
          created_at: string;
          end_date: string | null;
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
          headline: string;
          is_listed: boolean;
          org_id: string;
          regions: string[];
          services: string[];
          updated_at: string;
          website: string | null;
        };
        Insert: {
          description?: string;
          headline?: string;
          is_listed?: boolean;
          org_id: string;
          regions?: string[];
          services?: string[];
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          description?: string;
          headline?: string;
          is_listed?: boolean;
          org_id?: string;
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
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          locale: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          locale?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
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
      request_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string | null;
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
          request_id?: string;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_connection: { Args: { p_org: string; p_token: string }; Returns: string };
      accept_member_invitation: { Args: { p_token: string }; Returns: string };
      accept_proposal: { Args: { p_proposal: string }; Returns: string[] };
      can_edit_request: { Args: { p_request: string }; Returns: boolean };
      can_read_request: { Args: { p_request: string }; Returns: boolean };
      create_organization: {
        Args: {
          p_city?: string;
          p_name: string;
          p_slug: string;
          p_type: Database["public"]["Enums"]["org_type"];
        };
        Returns: string;
      };
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
      is_connected: { Args: { a: string; b: string }; Returns: boolean };
      is_member: {
        Args: { roles?: Database["public"]["Enums"]["member_role"][]; target: string };
        Returns: boolean;
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
      my_org_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
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
      request_revision: { Args: { p_note: string; p_proposal: string }; Returns: undefined };
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
    };
    Enums: {
      connection_status: "pending" | "active" | "revoked";
      event_status: "planning" | "preparing" | "live" | "completed" | "cancelled";
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
      connection_status: ["pending", "active", "revoked"],
      event_status: ["planning", "preparing", "live", "completed", "cancelled"],
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
      request_kind: ["single", "campaign"],
      request_status: ["draft", "sent", "awarded", "cancelled"],
      subscription_status: ["trialing", "active", "past_due", "canceled"],
    },
  },
} as const;
