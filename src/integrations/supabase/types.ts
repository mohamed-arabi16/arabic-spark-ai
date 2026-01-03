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
      conversation_summaries: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_summarized_message_id: string | null
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_summarized_message_id?: string | null
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_summarized_message_id?: string | null
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_last_summarized_message_id_fkey"
            columns: ["last_summarized_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean | null
          mode: Database["public"]["Enums"]["chat_mode"] | null
          project_id: string | null
          title: string | null
          total_cost: number | null
          total_tokens: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean | null
          mode?: Database["public"]["Enums"]["chat_mode"] | null
          project_id?: string | null
          title?: string | null
          total_cost?: number | null
          total_tokens?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean | null
          mode?: Database["public"]["Enums"]["chat_mode"] | null
          project_id?: string | null
          title?: string | null
          total_cost?: number | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          conversation_id: string | null
          cost: number | null
          created_at: string
          id: string
          image_url: string
          model_used: string | null
          prompt: string
          revised_prompt: string | null
          size: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          image_url: string
          model_used?: string | null
          prompt: string
          revised_prompt?: string | null
          size?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string
          model_used?: string | null
          prompt?: string
          revised_prompt?: string | null
          size?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_objects: {
        Row: {
          category: string | null
          confidence: number | null
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          is_global: boolean | null
          key: string | null
          project_id: string | null
          source_conversation_id: string | null
          source_message_ids: string[] | null
          status: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          key?: string | null
          project_id?: string | null
          source_conversation_id?: string | null
          source_message_ids?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          confidence?: number | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          key?: string | null
          project_id?: string | null
          source_conversation_id?: string | null
          source_message_ids?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_objects_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          cost: number | null
          created_at: string
          id: string
          input_tokens: number | null
          metadata: Json | null
          model_used: string | null
          output_tokens: number | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          cost?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_used?: string | null
          output_tokens?: number | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          cost?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_used?: string | null
          output_tokens?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          global_memory_enabled: boolean | null
          id: string
          preferred_dialect:
            | Database["public"]["Enums"]["dialect_preset"]
            | null
          preferred_mode: Database["public"]["Enums"]["chat_mode"] | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          global_memory_enabled?: boolean | null
          id: string
          preferred_dialect?:
            | Database["public"]["Enums"]["dialect_preset"]
            | null
          preferred_mode?: Database["public"]["Enums"]["chat_mode"] | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          global_memory_enabled?: boolean | null
          id?: string
          preferred_dialect?:
            | Database["public"]["Enums"]["dialect_preset"]
            | null
          preferred_mode?: Database["public"]["Enums"]["chat_mode"] | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          default_mode: Database["public"]["Enums"]["chat_mode"] | null
          description: string | null
          dialect_preset: Database["public"]["Enums"]["dialect_preset"] | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          system_instructions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_mode?: Database["public"]["Enums"]["chat_mode"] | null
          description?: string | null
          dialect_preset?: Database["public"]["Enums"]["dialect_preset"] | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          system_instructions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_mode?: Database["public"]["Enums"]["chat_mode"] | null
          description?: string | null
          dialect_preset?: Database["public"]["Enums"]["dialect_preset"] | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          system_instructions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          dialect: Database["public"]["Enums"]["dialect_preset"] | null
          id: string
          is_builtin: boolean | null
          title: string
          updated_at: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          dialect?: Database["public"]["Enums"]["dialect_preset"] | null
          id?: string
          is_builtin?: boolean | null
          title: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          dialect?: Database["public"]["Enums"]["dialect_preset"] | null
          id?: string
          is_builtin?: boolean | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      usage_stats: {
        Row: {
          date: string
          id: string
          image_count: number | null
          message_count: number | null
          total_cost: number | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          date?: string
          id?: string
          image_count?: number | null
          message_count?: number | null
          total_cost?: number | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          image_count?: number | null
          message_count?: number | null
          total_cost?: number | null
          total_tokens?: number | null
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      chat_mode: "fast" | "standard" | "deep" | "research" | "image"
      dialect_preset: "msa" | "egyptian" | "gulf" | "levantine" | "maghrebi"
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
      app_role: ["admin", "user"],
      chat_mode: ["fast", "standard", "deep", "research", "image"],
      dialect_preset: ["msa", "egyptian", "gulf", "levantine", "maghrebi"],
    },
  },
} as const
