import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import type { Database } from "../../src/db/database.types";
import {
  BASELINE_MEAL_STATUSES,
  BASELINE_PLAN,
  getBaselinePlanDates,
  getBaselinePlanStartDate,
  getCalorieRange,
  getCalorieTarget,
  getTestUser,
  type MealSlot,
  MEAL_SLOTS,
  MULTI_PORTION_MEALS,
} from "../fixtures/test-data";

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Create an authenticated Supabase client using E2E test credentials
 */
export async function createAuthenticatedClient(): Promise<SupabaseClientType> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_PUBLIC_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_PUBLIC_KEY must be defined in .env.test",
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const testUser = getTestUser();

  // Sign in with test user credentials
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testUser.email,
    password: testUser.password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  console.log(`✓ Authenticated as ${testUser.email}`);

  return supabase;
}

/**
 * Clean up all test data for the E2E test user
 * Deletes in correct order to respect foreign key constraints
 */
export async function cleanupTestData(
  supabase: SupabaseClientType,
): Promise<void> {
  console.log("\n🧹 Cleaning up existing test data...");

  const testUser = getTestUser();

  // Check if there are any plans to delete (all states: active, archived, cancelled)
  const { data: plans, error: plansQueryError } = await supabase
    .from("plans")
    .select("id, state")
    .eq("user_id", testUser.id);

  if (plansQueryError) {
    console.error("Failed to query plans:", plansQueryError.message);
    throw plansQueryError;
  }

  if (!plans || plans.length === 0) {
    console.log("✓ No existing data to clean up");
    return;
  }

  console.log(`  Found ${plans.length} plan(s) to delete`);

  const planIds = plans.map((p) => p.id);

  // Get all plan_day IDs for these plans
  const { data: planDays } = await supabase
    .from("plan_days")
    .select("id")
    .in("plan_id", planIds);

  const planDayIds = planDays?.map((pd) => pd.id) ?? [];

  // Delete in correct order to respect foreign key constraints
  // 1. Delete plan_meals first (child table)
  console.log("  Deleting plan_meals...");
  const { error: deleteMealsError } = await supabase
    .from("plan_meals")
    .delete()
    .eq("user_id", testUser.id);

  if (deleteMealsError) {
    console.error("Failed to delete plan_meals:", deleteMealsError.message);
    throw deleteMealsError;
  }
  console.log("  ✓ Deleted plan_meals");

  // 2. Delete slot targets
  if (planDayIds.length > 0) {
    console.log("  Deleting slot targets...");
    const { error: deleteTargetsError } = await supabase
      .from("plan_day_slot_targets")
      .delete()
      .in("plan_day_id", planDayIds);

    if (deleteTargetsError) {
      console.error("Failed to delete slot targets:", deleteTargetsError.message);
      throw deleteTargetsError;
    }
    console.log("  ✓ Deleted slot targets");
  }

  // 3. Delete plan_days
  console.log("  Deleting plan_days...");
  const { error: deleteDaysError } = await supabase
    .from("plan_days")
    .delete()
    .in("plan_id", planIds);

  if (deleteDaysError) {
    console.error("Failed to delete plan_days:", deleteDaysError.message);
    throw deleteDaysError;
  }
  console.log("  ✓ Deleted plan_days");

  // 4. Delete plans
  console.log("  Deleting plans...");
  const { error: deletePlansError } = await supabase
    .from("plans")
    .delete()
    .in("id", planIds);

  if (deletePlansError) {
    console.error("Failed to delete plans:", deletePlansError.message);
    throw deletePlansError;
  }
  console.log("  ✓ Deleted plans");

  // Verify deletion
  const { data: remainingPlans } = await supabase
    .from("plans")
    .select("id")
    .eq("user_id", testUser.id);

  if (remainingPlans && remainingPlans.length > 0) {
    console.warn(
      `⚠️  ${remainingPlans.length} plan(s) still exist after deletion - you may need manual cleanup`,
    );
  } else {
    console.log("✓ Cleanup complete");
  }
}

/**
 * Seed user settings if they don't exist
 */
export async function seedUserSettings(
  supabase: SupabaseClientType,
): Promise<void> {
  console.log("\n👤 Seeding user settings...");

  const testUser = getTestUser();

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: testUser.id,
      default_daily_calories: BASELINE_PLAN.dailyCalories,
      default_plan_length_days: BASELINE_PLAN.lengthDays,
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    console.error("Failed to seed user_settings:", error.message);
    throw error;
  }

  console.log("✓ User settings seeded");
}

/**
 * Get suitable test recipes for a given slot and calorie range
 * Returns recipes that:
 * - Are active
 * - Match the slot type
 * - Fall within the calorie range (±20%)
 * - For multi-portion meals: have portions > 1
 */
async function getTestRecipes(
  supabase: SupabaseClientType,
  slot: MealSlot,
  requireMultiPortion = false,
): Promise<Database["public"]["Tables"]["recipes"]["Row"][]> {
  const { min, max } = getCalorieRange(slot);

  // First, get recipe IDs for this slot
  const { data: recipeSlots } = await supabase
    .from("recipe_slots")
    .select("recipe_id")
    .eq("slot", slot);

  const recipeIds = recipeSlots?.map((rs) => rs.recipe_id) ?? [];

  if (recipeIds.length === 0) {
    throw new Error(`No recipes found for slot: ${slot}`);
  }

  // Now get recipes matching the criteria
  let query = supabase
    .from("recipes")
    .select("*")
    .eq("is_active", true)
    .gte("calories_kcal", min)
    .lte("calories_kcal", max)
    .in("id", recipeIds)
    .limit(10);

  if (requireMultiPortion) {
    query = query.gt("portions", 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Failed to fetch recipes for ${slot}:`, error.message);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      `No recipes found for ${slot} with calories ${min}-${max}${requireMultiPortion ? " and portions > 1" : ""}`,
    );
  }

  return data;
}

/**
 * Seed a complete 7-day baseline plan with meals
 */
export async function seedBaselinePlan(
  supabase: SupabaseClientType,
): Promise<number> {
  console.log("\n📅 Seeding baseline plan...");

  const testUser = getTestUser();
  const startDate = getBaselinePlanStartDate();
  const planDates = getBaselinePlanDates();
  const endDate = planDates[planDates.length - 1];

  // Create the plan
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      user_id: testUser.id,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      daily_calories: BASELINE_PLAN.dailyCalories,
      state: "active",
    })
    .select()
    .single();

  if (planError || !plan) {
    console.error("Failed to create plan:", planError?.message);
    throw planError;
  }

  console.log(`✓ Created plan ${plan.id} (${plan.start_date} to ${plan.end_date})`);

  // Create plan days
  const planDaysToInsert = planDates.map((date) => ({
    plan_id: plan.id,
    date: format(date, "yyyy-MM-dd"),
  }));

  const { data: createdPlanDays, error: daysError } = await supabase
    .from("plan_days")
    .insert(planDaysToInsert)
    .select();

  if (daysError || !createdPlanDays) {
    console.error("Failed to create plan_days:", daysError?.message);
    throw daysError;
  }

  console.log(`✓ Created ${createdPlanDays.length} plan days`);

  // Create slot targets for each day
  const slotTargetsToInsert = createdPlanDays.flatMap((planDay) =>
    MEAL_SLOTS.map((slot) => ({
      plan_day_id: planDay.id,
      slot,
      calories_target: getCalorieTarget(slot),
    })),
  );

  const { error: targetsError } = await supabase
    .from("plan_day_slot_targets")
    .insert(slotTargetsToInsert);

  if (targetsError) {
    console.error(
      "Failed to create plan_day_slot_targets:",
      targetsError.message,
    );
    throw targetsError;
  }

  console.log(`✓ Created ${slotTargetsToInsert.length} slot targets`);

  // Fetch recipes for each slot
  console.log("\n🍳 Fetching recipes for meals...");
  const recipesBySlot: Record<
    MealSlot,
    Database["public"]["Tables"]["recipes"]["Row"][]
  > = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  for (const slot of MEAL_SLOTS) {
    const recipes = await getTestRecipes(supabase, slot, false);
    recipesBySlot[slot] = recipes;
    console.log(`  ✓ Found ${recipes.length} recipes for ${slot}`);
  }

  // Fetch multi-portion recipes for lunch and dinner
  const multiPortionLunchRecipes = await getTestRecipes(
    supabase,
    "lunch",
    true,
  );
  const multiPortionDinnerRecipes = await getTestRecipes(
    supabase,
    "dinner",
    true,
  );

  console.log(
    `  ✓ Found ${multiPortionLunchRecipes.length} multi-portion lunch recipes`,
  );
  console.log(
    `  ✓ Found ${multiPortionDinnerRecipes.length} multi-portion dinner recipes`,
  );

  // Generate UUID-like IDs for multi-portion groups
  const multiPortionGroupIds = {
    "mp-group-1": crypto.randomUUID(),
    "mp-group-2": crypto.randomUUID(),
  };

  // Create meals
  console.log("\n🍽️  Creating meals...");
  const mealsToInsert: Database["public"]["Tables"]["plan_meals"]["Insert"][] =
    [];

  let mealIndex = 0;

  for (let dayIndex = 0; dayIndex < createdPlanDays.length; dayIndex++) {
    const planDay = createdPlanDays[dayIndex];

    for (const slot of MEAL_SLOTS) {
      const status = BASELINE_MEAL_STATUSES[mealIndex];

      // Check if this meal should be multi-portion
      const multiPortionConfig = MULTI_PORTION_MEALS.find(
        (mp) => mp.dayIndex === dayIndex && mp.slot === slot,
      );

      let recipe;
      let isLeftover = false;
      let portionsToCook: number | null = null;
      let multiPortionGroupId: string | null = null;

      if (multiPortionConfig) {
        // This is a multi-portion meal or leftover
        isLeftover = multiPortionConfig.isLeftover;
        portionsToCook = multiPortionConfig.portionsToCook;
        multiPortionGroupId =
          multiPortionGroupIds[
            multiPortionConfig.groupId as keyof typeof multiPortionGroupIds
          ];

        // For leftovers, find the original meal's recipe
        if (isLeftover) {
          const originalMeal = mealsToInsert.find(
            (m) => m.multi_portion_group_id === multiPortionGroupId,
          );
          if (!originalMeal) {
            throw new Error(
              `Could not find original meal for leftover group ${multiPortionGroupId}`,
            );
          }
          recipe = recipesBySlot[slot].find(
            (r) => r.id === originalMeal.recipe_id,
          );
        } else {
          // For original multi-portion meals, pick a recipe with portions > 1
          if (slot === "lunch") {
            recipe = multiPortionLunchRecipes[0];
          } else if (slot === "dinner") {
            recipe = multiPortionDinnerRecipes[0];
          }
        }
      } else {
        // Regular meal - pick a random recipe from the slot
        const slotRecipes = recipesBySlot[slot];
        recipe = slotRecipes[mealIndex % slotRecipes.length];
      }

      if (!recipe) {
        throw new Error(`No recipe found for ${slot} on day ${dayIndex + 1}`);
      }

      mealsToInsert.push({
        plan_id: plan.id,
        plan_day_id: planDay.id,
        user_id: testUser.id,
        slot,
        recipe_id: recipe.id,
        status,
        calories_planned: recipe.calories_kcal,
        portion_multiplier: 1,
        is_leftover: isLeftover,
        portions_to_cook: portionsToCook,
        multi_portion_group_id: multiPortionGroupId,
      });

      mealIndex++;
    }
  }

  const { error: mealsError } = await supabase
    .from("plan_meals")
    .insert(mealsToInsert);

  if (mealsError) {
    console.error("Failed to create plan_meals:", mealsError.message);
    throw mealsError;
  }

  console.log(`✓ Created ${mealsToInsert.length} meals`);
  console.log(
    `  - ${mealsToInsert.filter((m) => m.status === "planned").length} planned`,
  );
  console.log(
    `  - ${mealsToInsert.filter((m) => m.status === "completed").length} completed`,
  );
  console.log(
    `  - ${mealsToInsert.filter((m) => m.status === "skipped").length} skipped`,
  );
  console.log(
    `  - ${mealsToInsert.filter((m) => m.is_leftover).length} leftovers`,
  );

  console.log("\n✅ Baseline plan seeded successfully");

  return plan.id;
}

/**
 * Main seeding function
 * Cleans up existing data and seeds fresh baseline data
 */
export async function seedE2EData(skipPlan = false): Promise<{
  planId: number;
  supabase: SupabaseClientType;
}> {
  console.log("🌱 Starting E2E data seeding...\n");

  const supabase = await createAuthenticatedClient();

  await cleanupTestData(supabase);
  await seedUserSettings(supabase);

  let planId = 0;
  if (!skipPlan) {
    planId = await seedBaselinePlan(supabase);
  } else {
    console.log("⏭️  Skipping baseline plan creation\n");
  }

  console.log("\n🎉 E2E data seeding complete!\n");

  return { planId, supabase };
}
