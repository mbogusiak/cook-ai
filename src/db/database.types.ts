export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      plan_day_slot_targets: {
        Row: {
          calories_target: number
          id: number
          plan_day_id: number
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Insert: {
          calories_target: number
          id?: number
          plan_day_id: number
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Update: {
          calories_target?: number
          id?: number
          plan_day_id?: number
          slot?: Database["public"]["Enums"]["meal_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_day_slot_targets_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_days: {
        Row: {
          created_at: string
          date: string
          id: number
          plan_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          plan_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          plan_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_meals: {
        Row: {
          calories_planned: number
          created_at: string
          id: number
          is_leftover: boolean
          multi_portion_group_id: string | null
          plan_day_id: number
          plan_id: number
          portion_multiplier: number
          recipe_id: number
          slot: Database["public"]["Enums"]["meal_slot"]
          status: Database["public"]["Enums"]["meal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_planned: number
          created_at?: string
          id?: number
          is_leftover?: boolean
          multi_portion_group_id?: string | null
          plan_day_id: number
          plan_id: number
          portion_multiplier?: number
          recipe_id: number
          slot: Database["public"]["Enums"]["meal_slot"]
          status?: Database["public"]["Enums"]["meal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_planned?: number
          created_at?: string
          id?: number
          is_leftover?: boolean
          multi_portion_group_id?: string | null
          plan_day_id?: number
          plan_id?: number
          portion_multiplier?: number
          recipe_id?: number
          slot?: Database["public"]["Enums"]["meal_slot"]
          status?: Database["public"]["Enums"]["meal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_meals_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          end_date: string
          id: number
          start_date: string
          state: Database["public"]["Enums"]["plan_state"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: number
          start_date: string
          state?: Database["public"]["Enums"]["plan_state"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: number
          start_date?: string
          state?: Database["public"]["Enums"]["plan_state"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_slots: {
        Row: {
          recipe_id: number
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Insert: {
          recipe_id: number
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Update: {
          recipe_id?: number
          slot?: Database["public"]["Enums"]["meal_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "recipe_slots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_kcal: number
          carbs_g: number | null
          cook_minutes: number | null
          created_at: string
          fat_g: number | null
          id: number
          image_url: string | null
          ingredients: string[]
          is_active: boolean
          name: string
          portions: number
          prep_minutes: number | null
          protein_g: number | null
          rating_avg: number | null
          reviews_count: number
          slug: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          calories_kcal: number
          carbs_g?: number | null
          cook_minutes?: number | null
          created_at?: string
          fat_g?: number | null
          id?: number
          image_url?: string | null
          ingredients?: string[]
          is_active?: boolean
          name: string
          portions?: number
          prep_minutes?: number | null
          protein_g?: number | null
          rating_avg?: number | null
          reviews_count?: number
          slug: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          calories_kcal?: number
          carbs_g?: number | null
          cook_minutes?: number | null
          created_at?: string
          fat_g?: number | null
          id?: number
          image_url?: string | null
          ingredients?: string[]
          is_active?: boolean
          name?: string
          portions?: number
          prep_minutes?: number | null
          protein_g?: number | null
          rating_avg?: number | null
          reviews_count?: number
          slug?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          default_daily_calories: number
          default_plan_length_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_daily_calories: number
          default_plan_length_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_daily_calories?: number
          default_plan_length_days?: number
          updated_at?: string
          user_id?: string
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
      meal_slot: "breakfast" | "lunch" | "dinner" | "snack"
      meal_status: "planned" | "completed" | "skipped"
      plan_state: "active" | "archived" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      meal_slot: ["breakfast", "lunch", "dinner", "snack"],
      meal_status: ["planned", "completed", "skipped"],
      plan_state: ["active", "archived", "cancelled"],
    },
  },
} as const

