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
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
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
      bots: {
        Row: {
          allowed_origins: string[];
          created_at: string;
          id: string;
          name: string;
          public_key: string;
          system_prompt: string | null;
          tone: string;
          updated_at: string;
          user_id: string;
          widget_config: Json;
        };
        Insert: {
          allowed_origins?: string[];
          created_at?: string;
          id?: string;
          name: string;
          public_key?: string;
          system_prompt?: string | null;
          tone?: string;
          updated_at?: string;
          user_id: string;
          widget_config?: Json;
        };
        Update: {
          allowed_origins?: string[];
          created_at?: string;
          id?: string;
          name?: string;
          public_key?: string;
          system_prompt?: string | null;
          tone?: string;
          updated_at?: string;
          user_id?: string;
          widget_config?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'bots_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chunks: {
        Row: {
          bot_id: string;
          content: string;
          created_at: string;
          document_id: string;
          embedding: string | null;
          fts: unknown;
          heading_path: string | null;
          id: string;
          token_count: number;
        };
        Insert: {
          bot_id: string;
          content: string;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          fts?: unknown;
          heading_path?: string | null;
          id?: string;
          token_count?: number;
        };
        Update: {
          bot_id?: string;
          content?: string;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          fts?: unknown;
          heading_path?: string | null;
          id?: string;
          token_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'chunks_bot_id_fkey';
            columns: ['bot_id'];
            isOneToOne: false;
            referencedRelation: 'bots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chunks_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          bot_id: string;
          channel: Database['public']['Enums']['chat_channel'];
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          visitor_id: string | null;
        };
        Insert: {
          bot_id: string;
          channel: Database['public']['Enums']['chat_channel'];
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          visitor_id?: string | null;
        };
        Update: {
          bot_id?: string;
          channel?: Database['public']['Enums']['chat_channel'];
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          visitor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_bot_id_fkey';
            columns: ['bot_id'];
            isOneToOne: false;
            referencedRelation: 'bots';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          bot_id: string;
          content_hash: string;
          created_at: string;
          id: string;
          source_id: string;
          title: string | null;
          url: string | null;
        };
        Insert: {
          bot_id: string;
          content_hash: string;
          created_at?: string;
          id?: string;
          source_id: string;
          title?: string | null;
          url?: string | null;
        };
        Update: {
          bot_id?: string;
          content_hash?: string;
          created_at?: string;
          id?: string;
          source_id?: string;
          title?: string | null;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_bot_id_fkey';
            columns: ['bot_id'];
            isOneToOne: false;
            referencedRelation: 'bots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'sources';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          citations: Json;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          latency_ms: number | null;
          role: Database['public']['Enums']['message_role'];
          tokens: number | null;
          was_answered: boolean | null;
        };
        Insert: {
          citations?: Json;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          latency_ms?: number | null;
          role: Database['public']['Enums']['message_role'];
          tokens?: number | null;
          was_answered?: boolean | null;
        };
        Update: {
          citations?: Json;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          latency_ms?: number | null;
          role?: Database['public']['Enums']['message_role'];
          tokens?: number | null;
          was_answered?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      processed_events: {
        Row: {
          processed_at: string;
          stripe_event_id: string;
        };
        Insert: {
          processed_at?: string;
          stripe_event_id: string;
        };
        Update: {
          processed_at?: string;
          stripe_event_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          hits: number;
          key: string;
          window_start: string;
        };
        Insert: {
          hits?: number;
          key: string;
          window_start?: string;
        };
        Update: {
          hits?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          auto_sync: boolean;
          bot_id: string;
          created_at: string;
          discovered_urls: Json;
          error_message: string | null;
          filename: string | null;
          id: string;
          last_synced_at: string | null;
          max_pages: number;
          pages_count: number;
          status: Database['public']['Enums']['source_status'];
          storage_path: string | null;
          total_pages: number;
          type: Database['public']['Enums']['source_type'];
          updated_at: string;
          url: string | null;
        };
        Insert: {
          auto_sync?: boolean;
          bot_id: string;
          created_at?: string;
          discovered_urls?: Json;
          error_message?: string | null;
          filename?: string | null;
          id?: string;
          last_synced_at?: string | null;
          max_pages?: number;
          pages_count?: number;
          status?: Database['public']['Enums']['source_status'];
          storage_path?: string | null;
          total_pages?: number;
          type: Database['public']['Enums']['source_type'];
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          auto_sync?: boolean;
          bot_id?: string;
          created_at?: string;
          discovered_urls?: Json;
          error_message?: string | null;
          filename?: string | null;
          id?: string;
          last_synced_at?: string | null;
          max_pages?: number;
          pages_count?: number;
          status?: Database['public']['Enums']['source_status'];
          storage_path?: string | null;
          total_pages?: number;
          type?: Database['public']['Enums']['source_type'];
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sources_bot_id_fkey';
            columns: ['bot_id'];
            isOneToOne: false;
            referencedRelation: 'bots';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          plan: Database['public']['Enums']['plan_id'];
          status: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          plan?: Database['public']['Enums']['plan_id'];
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          plan?: Database['public']['Enums']['plan_id'];
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      usage_counters: {
        Row: {
          messages_used: number;
          pages_used: number;
          period_start: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          messages_used?: number;
          pages_used?: number;
          period_start: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          messages_used?: number;
          pages_used?: number;
          period_start?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_counters_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bot_by_public_key: {
        Args: { p_public_key: string };
        Returns: {
          allowed_origins: string[];
          bot_id: string;
          owner_id: string;
          plan: Database['public']['Enums']['plan_id'];
          subscription_status: string;
          tone: string;
          widget_config: Json;
        }[];
      };
      consume_message_quota: {
        Args: { p_limit: number; p_user_id: string };
        Returns: boolean;
      };
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window: string };
        Returns: boolean;
      };
      match_chunks: {
        Args: {
          p_bot_id: string;
          p_candidates?: number;
          p_match_count?: number;
          p_query_embedding: string;
          p_query_text: string;
        };
        Returns: {
          chunk_id: string;
          content: string;
          document_id: string;
          document_title: string;
          document_url: string;
          heading_path: string;
          score: number;
        }[];
      };
      owns_bot: { Args: { target_bot_id: string }; Returns: boolean };
    };
    Enums: {
      chat_channel: 'app' | 'widget';
      message_role: 'user' | 'assistant';
      plan_id: 'free' | 'pro' | 'business';
      source_status: 'queued' | 'processing' | 'ready' | 'error';
      source_type: 'file' | 'url' | 'sitemap' | 'text';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      chat_channel: ['app', 'widget'],
      message_role: ['user', 'assistant'],
      plan_id: ['free', 'pro', 'business'],
      source_status: ['queued', 'processing', 'ready', 'error'],
      source_type: ['file', 'url', 'sitemap', 'text'],
    },
  },
} as const;
