import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "../../db/database.types";
import { ServerError, NotFoundError } from "../errors";

// This will be defined in types.ts later
export interface PlanDayDTO {
  date: string;
  plan_id: number;
  plan_start_date: string;
  plan_end_date: string;
  meals: DayMealDTO[];
  slot_targets: SlotTargetDTO[];
}

export interface DayMealDTO {
  id: number;
  status: Enums<"meal_status">;
  slot: Enums<"meal_slot">;
  recipe_id: number;
  name: string;
  image_url: string | null;
  time_minutes: number;
  calories_planned: number;
  servings: number;
  cookido_url: string;
  ingredients: string[];
  preparation: string[];
  is_multi_portion_cook_day: boolean;
  is_multi_portion_leftover_day: boolean;
  multi_portion_text: "Ugotuj na 2 dni" | "Resztki z wczoraj" | null;
}

export interface SlotTargetDTO {
  slot: Enums<"meal_slot">;
  calories_target: number;
}

export async function getPlanDay(
  supabase: SupabaseClient<Database>,
  planId: number,
  date: string,
  userId: string
): Promise<PlanDayDTO | null> {
  // 1. Fetch plan to verify ownership and get date range
  const { data: planData, error: planError } = await supabase
    .from("plans")
    .select("id, user_id, start_date, end_date")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();

  if (planError) {
    if ((planError as any).code === "PGRST116") {
      throw new NotFoundError("Plan not found");
    }
    throw new ServerError("Failed to fetch plan", planError);
  }

  // 2. Fetch plan_day for the given date
  const { data: planDayData, error: planDayError } = await supabase
    .from("plan_days")
    .select("id, date")
    .eq("plan_id", planId)
    .eq("date", date)
    .single();

  if (planDayError) {
    if ((planDayError as any).code === "PGRST116") {
      return null; // Day not found in plan
    }
    throw new ServerError("Failed to fetch plan day", planDayError);
  }

  if (!planDayData) {
    return null;
  }

  const planDayId = planDayData.id;

  // 3. Fetch meals for that day
  const { data: mealsData, error: mealsError } = await supabase
    .from("plan_meals")
    .select(
      `
        id,
        status,
        slot,
        recipe_id,
        calories_planned,
        is_leftover,
        multi_portion_group_id,
        recipes (
            id,
            name,
            image_url,
            prep_minutes,
            cook_minutes,
            source_url,
            portions,
            ingredients,
            preparation
        )
    `
    )
    .eq("plan_day_id", planDayId);

  if (mealsError) {
    throw new ServerError("Failed to fetch meals for the day", mealsError);
  }

  // 4. Fetch slot targets for that day
  const { data: slotTargetsData, error: slotTargetsError } = await supabase
    .from("plan_day_slot_targets")
    .select("slot, calories_target")
    .eq("plan_day_id", planDayId);

  if (slotTargetsError) {
    throw new ServerError("Failed to fetch slot targets", slotTargetsError);
  }

  // 5. Transform data
  const meals =
    mealsData?.map((meal) => {
      const recipe = meal.recipes as any;
      const isMultiPortionCookDay = !!meal.multi_portion_group_id && !meal.is_leftover;
      const isMultiPortionLeftoverDay = !!meal.multi_portion_group_id && meal.is_leftover;

      return {
        id: meal.id,
        status: meal.status as Enums<"meal_status">,
        slot: meal.slot as Enums<"meal_slot">,
        recipe_id: meal.recipe_id,
        name: recipe.name,
        image_url: recipe.image_url,
        time_minutes: recipe.prep_minutes || 0,
        calories_planned: meal.calories_planned,
        servings: recipe.portions,
        cookido_url: recipe.source_url,
        ingredients: recipe.ingredients || [],
        preparation: recipe.preparation || [],
        is_multi_portion_cook_day: isMultiPortionCookDay,
        is_multi_portion_leftover_day: isMultiPortionLeftoverDay,
        multi_portion_text: isMultiPortionCookDay
          ? "Ugotuj na 2 dni"
          : isMultiPortionLeftoverDay
            ? "Resztki z wczoraj"
            : null,
      };
    }) || [];

  return {
    date: planDayData.date,
    plan_id: planData.id,
    plan_start_date: planData.start_date,
    plan_end_date: planData.end_date,
    meals: meals as DayMealDTO[],
    slot_targets: (slotTargetsData as SlotTargetDTO[]) || [],
  };
}
