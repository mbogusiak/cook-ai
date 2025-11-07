import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeDetailsDTO, RecipesListResponse, RecipeDTO } from "../../types";
import type { Database, Enums } from "../../db/database.types";
import type { SearchRecipesParams } from "../schemas/recipe";

/**
 * Fetches a single recipe by ID with all available meal slots
 *
 * @param supabase - Supabase client instance
 * @param id - Recipe ID to fetch
 * @returns Recipe details DTO or null if not found
 * @throws Error if database query fails
 */
export async function getRecipeById(supabase: SupabaseClient<Database>, id: number): Promise<RecipeDetailsDTO | null> {
  // Fetch recipe from recipes table
  const { data: recipeRow, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (recipeError) {
    // 404 error means recipe not found - return null instead of throwing
    if (recipeError.code === "PGRST116") {
      return null;
    }
    throw recipeError;
  }

  if (!recipeRow) {
    return null;
  }

  // Fetch available meal slots for this recipe
  const { data: slotsRows, error: slotsError } = await supabase.from("recipe_slots").select("slot").eq("recipe_id", id);

  if (slotsError) {
    throw slotsError;
  }

  // Extract slot values from rows
  const available_slots = (slotsRows || [])
    .map((row) => row.slot)
    .filter((slot): slot is string => slot !== null && slot !== undefined);

  // Map to DTO with field transformations
  return {
    id: recipeRow.id,
    slug: recipeRow.slug,
    name: recipeRow.name,
    available_slots: available_slots as Enums<"meal_slot">[],
    calories_per_serving: recipeRow.calories_kcal,
    servings: recipeRow.portions,
    time_minutes: recipeRow.prep_minutes || recipeRow.cook_minutes || null,
    image_url: recipeRow.image_url,
    source_url: recipeRow.source_url,
    ingredients: recipeRow.ingredients || [],
    created_at: recipeRow.created_at,
    updated_at: recipeRow.updated_at,
  };
}

/**
 * Searches recipes with filtering and pagination support
 * Joins with recipe_slots table to get available meal slots for each recipe
 *
 * @param supabase - Supabase client instance
 * @param params - Search and filter parameters (slot, calories, search, pagination)
 * @returns Paginated list of recipes with metadata
 * @throws Error if database query fails
 */
export async function searchRecipes(
  supabase: SupabaseClient<Database>,
  params: SearchRecipesParams
): Promise<RecipesListResponse> {
  // First, get recipe IDs that match slot filter (if provided)
  let recipeIds: number[] | null = null;
  if (params.slot) {
    const { data: slotData, error: slotError } = await supabase
      .from("recipe_slots")
      .select("recipe_id")
      .eq("slot", params.slot);

    if (slotError) throw slotError;
    recipeIds = (slotData || []).map((r) => r.recipe_id);

    // If no recipes match the slot, return empty result
    if (recipeIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          limit: params.limit,
          offset: params.offset,
          has_more: false,
        },
      };
    }
  }

  // Build main recipe query
  let query = supabase.from("recipes").select("*", { count: "exact" }).eq("is_active", true);

  // Apply recipe ID filter if slot was specified
  if (recipeIds) {
    query = query.in("id", recipeIds);
  }

  // Apply calorie filters
  if (params.min_calories !== undefined) {
    query = query.gte("calories_kcal", params.min_calories);
  }
  if (params.max_calories !== undefined) {
    query = query.lte("calories_kcal", params.max_calories);
  }

  // Apply search filter (case-insensitive partial match)
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  // Apply pagination
  query = query.range(params.offset, params.offset + params.limit - 1).order("id", { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  // Get slots for all recipes
  const recipes = await enrichRecipesWithSlots(supabase, data || []);

  // Calculate pagination metadata
  const total = count || 0;
  const has_more = params.offset + params.limit < total;

  return {
    data: recipes,
    pagination: {
      total,
      limit: params.limit,
      offset: params.offset,
      has_more,
    },
  };
}

/**
 * Enriches recipe rows with their available slots from recipe_slots table
 * Transforms field names to match DTO (calories_kcal -> calories_per_serving, etc.)
 */
async function enrichRecipesWithSlots(supabase: SupabaseClient<Database>, rows: any[]): Promise<RecipeDTO[]> {
  if (rows.length === 0) return [];

  // Get all slots for these recipes in one query
  const recipeIds = rows.map((r) => r.id);
  const { data: slotsData, error: slotsError } = await supabase
    .from("recipe_slots")
    .select("recipe_id, slot")
    .in("recipe_id", recipeIds);

  if (slotsError) {
    throw slotsError;
  }

  // Group slots by recipe_id
  const slotsByRecipe = new Map<number, string[]>();
  for (const slotRow of slotsData || []) {
    if (!slotsByRecipe.has(slotRow.recipe_id)) {
      slotsByRecipe.set(slotRow.recipe_id, []);
    }
    if (slotRow.slot) {
      slotsByRecipe.get(slotRow.recipe_id)!.push(slotRow.slot);
    }
  }

  // Map to DTOs with slots
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    available_slots: (slotsByRecipe.get(row.id) || []) as Enums<"meal_slot">[],
    calories_per_serving: row.calories_kcal,
    servings: row.portions,
    time_minutes: row.prep_minutes || row.cook_minutes || null,
    image_url: row.image_url,
    source_url: row.source_url,
  }));
}
