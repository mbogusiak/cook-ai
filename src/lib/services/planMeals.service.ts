import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Enums } from '../../db/database.types'
import type { UpdatedMealInSwap, RecipeDTO } from '../../types'
import { ServerError } from '../errors'

/**
 * Tolerance percentage for calorie validation (±20%)
 */
const CALORIE_TOLERANCE = 0.2

/**
 * Structure representing a plan meal with all necessary data for swap validation
 */
interface PlanMealData {
  id: number
  plan_id: number
  plan_day_id: number
  user_id: string
  slot: Enums<'meal_slot'>
  status: Enums<'meal_status'>
  recipe_id: number
  portion_multiplier: number
  calories_planned: number
  multi_portion_group_id: string | null
  is_leftover: boolean
  created_at: string
  updated_at: string
}

/**
 * Structure representing a recipe with validation data
 */
interface RecipeData {
  id: number
  name: string
  calories_kcal: number
  portions: number
  available_slots: Enums<'meal_slot'>[]
}

/**
 * Structure representing slot target calories for validation
 */
interface SlotTarget {
  slot: Enums<'meal_slot'>
  calories_target: number
}

/**
 * Fetch plan meal by ID
 * 
 * @param planMealId - ID of the plan meal to fetch
 * @param supabase - Supabase client instance
 * @returns Plan meal data or null if not found
 * @throws ServerError on database errors
 */
export async function getPlanMealById(
  planMealId: number,
  supabase: SupabaseClient<Database>
): Promise<PlanMealData | null> {
  const { data, error } = await supabase
    .from('plan_meals')
    .select('*')
    .eq('id', planMealId)
    .maybeSingle()

  if (error) {
    console.error('[getPlanMealById] Database error:', {
      planMealId,
      error: error.message,
      code: error.code
    })
    throw new ServerError('Failed to fetch plan meal', error as any)
  }

  return data as PlanMealData | null
}

/**
 * Fetch recipe by ID with available slots
 * 
 * @param recipeId - ID of the recipe to fetch
 * @param supabase - Supabase client instance
 * @returns Recipe data with available slots or null if not found
 * @throws ServerError on database errors
 */
export async function getRecipeById(
  recipeId: number,
  supabase: SupabaseClient<Database>
): Promise<RecipeData | null> {
  // Fetch recipe details
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .select('id, name, calories_kcal, portions, is_active')
    .eq('id', recipeId)
    .eq('is_active', true)
    .maybeSingle()

  if (recipeError) {
    console.error('[getRecipeById] Database error:', {
      recipeId,
      error: recipeError.message,
      code: recipeError.code
    })
    throw new ServerError('Failed to fetch recipe', recipeError as any)
  }

  if (!recipeData) {
    return null
  }

  // Fetch available slots for the recipe
  const { data: slotsData, error: slotsError } = await supabase
    .from('recipe_slots')
    .select('slot')
    .eq('recipe_id', recipeId)

  if (slotsError) {
    console.error('[getRecipeById] Error fetching recipe slots:', {
      recipeId,
      error: slotsError.message,
      code: slotsError.code
    })
    throw new ServerError('Failed to fetch recipe slots', slotsError as any)
  }

  return {
    id: recipeData.id,
    name: recipeData.name,
    calories_kcal: recipeData.calories_kcal,
    portions: recipeData.portions,
    available_slots: (slotsData || []).map(s => s.slot as Enums<'meal_slot'>)
  }
}

/**
 * Fetch slot target for a specific plan day and slot
 * 
 * @param planDayId - ID of the plan day
 * @param slot - Meal slot
 * @param supabase - Supabase client instance
 * @returns Slot target data or null if not found
 * @throws ServerError on database errors
 */
async function getSlotTarget(
  planDayId: number,
  slot: Enums<'meal_slot'>,
  supabase: SupabaseClient<Database>
): Promise<SlotTarget | null> {
  const { data, error } = await supabase
    .from('plan_day_slot_targets')
    .select('slot, calories_target')
    .eq('plan_day_id', planDayId)
    .eq('slot', slot)
    .maybeSingle()

  if (error) {
    console.error('[getSlotTarget] Database error:', {
      planDayId,
      slot,
      error: error.message,
      code: error.code
    })
    throw new ServerError('Failed to fetch slot target', error as any)
  }

  return data as SlotTarget | null
}

/**
 * Validation result structure
 */
interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate if a recipe can be swapped into a meal slot
 * 
 * Validation rules:
 * 1. Recipe must be available for the target meal slot
 * 2. Portion multiplier must not exceed recipe portions
 * 3. Planned calories must be within ±20% of slot target
 * 
 * @param planMeal - Current plan meal data
 * @param recipe - New recipe data to swap in
 * @param supabase - Supabase client for fetching slot target
 * @returns Validation result with error message if invalid
 */
export async function validateSwapCandidate(
  planMeal: PlanMealData,
  recipe: RecipeData,
  supabase: SupabaseClient<Database>
): Promise<ValidationResult> {
  // Rule 1: Check if recipe is available for the meal slot
  if (!recipe.available_slots.includes(planMeal.slot)) {
    return {
      isValid: false,
      error: `Recipe "${recipe.name}" is not available for ${planMeal.slot} slot. Available slots: ${recipe.available_slots.join(', ')}`
    }
  }

  // Calculate portion multiplier and planned calories for the new recipe
  const slotTarget = await getSlotTarget(planMeal.plan_day_id, planMeal.slot, supabase)
  
  if (!slotTarget) {
    console.error('[validateSwapCandidate] Slot target not found:', {
      planDayId: planMeal.plan_day_id,
      slot: planMeal.slot
    })
    return {
      isValid: false,
      error: 'Slot target not found for this meal'
    }
  }

  const targetCalories = slotTarget.calories_target
  const caloriesPerPortion = recipe.calories_kcal
  const portionMultiplier = Math.round((targetCalories / caloriesPerPortion) * 10) / 10

  // Rule 2: Check if portion multiplier exceeds recipe portions
  if (portionMultiplier > recipe.portions) {
    return {
      isValid: false,
      error: `Recipe requires ${portionMultiplier} portions but only ${recipe.portions} portions are available. Target calories: ${targetCalories} kcal, recipe calories per portion: ${caloriesPerPortion} kcal`
    }
  }

  // Rule 3: Check if planned calories are within tolerance of slot target
  const plannedCalories = Math.round(caloriesPerPortion * portionMultiplier)
  const minCalories = Math.round(targetCalories * (1 - CALORIE_TOLERANCE))
  const maxCalories = Math.round(targetCalories * (1 + CALORIE_TOLERANCE))

  if (plannedCalories < minCalories || plannedCalories > maxCalories) {
    return {
      isValid: false,
      error: `Recipe calories (${plannedCalories} kcal) are outside the acceptable range (${minCalories}-${maxCalories} kcal) for target of ${targetCalories} kcal`
    }
  }

  console.info('[validateSwapCandidate] Validation passed:', {
    recipeId: recipe.id,
    recipeName: recipe.name,
    slot: planMeal.slot,
    portionMultiplier,
    plannedCalories,
    targetCalories
  })

  return { isValid: true }
}

/**
 * Perform swap operation in a transaction
 * 
 * Updates the plan meal(s) with new recipe:
 * - If multi_portion_group_id is NULL: updates single meal
 * - If multi_portion_group_id is NOT NULL: updates all meals in the group
 * 
 * Recalculates:
 * - portion_multiplier = target_calories / calories_per_portion
 * - calories_planned = calories_per_portion * portion_multiplier
 * - portions_to_cook = recipe.portions (for non-leftover meals)
 * 
 * @param planMealId - ID of the meal to swap
 * @param newRecipe - New recipe data
 * @param planMeal - Current plan meal data
 * @param supabase - Supabase client instance
 * @returns Array of updated meals
 * @throws ServerError on database errors
 */
export async function performSwapTransaction(
  planMealId: number,
  newRecipe: RecipeData,
  planMeal: PlanMealData,
  supabase: SupabaseClient<Database>
): Promise<UpdatedMealInSwap[]> {
  try {
    // Fetch slot target for calorie calculations
    const slotTarget = await getSlotTarget(planMeal.plan_day_id, planMeal.slot, supabase)
    
    if (!slotTarget) {
      throw new ServerError('Slot target not found for meal')
    }

    const targetCalories = slotTarget.calories_target
    const caloriesPerPortion = newRecipe.calories_kcal
    const portionMultiplier = Math.round((targetCalories / caloriesPerPortion) * 10) / 10
    const plannedCalories = Math.round(caloriesPerPortion * portionMultiplier)

    // Determine which meals to update
    let mealsToUpdate: number[]
    
    if (planMeal.multi_portion_group_id) {
      // Update all meals in the multi-portion group
      const { data: groupMeals, error: groupError } = await supabase
        .from('plan_meals')
        .select('id')
        .eq('multi_portion_group_id', planMeal.multi_portion_group_id)

      if (groupError) {
        console.error('[performSwapTransaction] Error fetching group meals:', {
          groupId: planMeal.multi_portion_group_id,
          error: groupError.message
        })
        throw new ServerError('Failed to fetch multi-portion group meals', groupError as any)
      }

      mealsToUpdate = (groupMeals || []).map(m => m.id)
      
      console.info('[performSwapTransaction] Updating multi-portion group:', {
        groupId: planMeal.multi_portion_group_id,
        mealIds: mealsToUpdate
      })
    } else {
      // Update only the single meal
      mealsToUpdate = [planMealId]
      
      console.info('[performSwapTransaction] Updating single meal:', {
        mealId: planMealId
      })
    }

    // Perform update for all meals
    // Note: For multi-portion groups, portions_to_cook should only be set for non-leftover meals
    // The database trigger will handle this validation
    const { data: updatedMeals, error: updateError } = await supabase
      .from('plan_meals')
      .update({
        recipe_id: newRecipe.id,
        portion_multiplier: portionMultiplier,
        calories_planned: plannedCalories,
        updated_at: new Date().toISOString()
      })
      .in('id', mealsToUpdate)
      .select('id, slot, status, calories_planned, portion_multiplier, multi_portion_group_id, is_leftover, recipe_id, updated_at')

    if (updateError) {
      console.error('[performSwapTransaction] Update error:', {
        mealsToUpdate,
        error: updateError.message,
        code: updateError.code
      })
      throw new ServerError('Failed to update plan meals', updateError as any)
    }

    if (!updatedMeals || updatedMeals.length === 0) {
      throw new ServerError('No meals were updated')
    }

    // Fetch portions_to_cook for each updated meal (needed for response)
    const { data: mealsWithPortions, error: portionsError } = await supabase
      .from('plan_meals')
      .select('id, portions_to_cook')
      .in('id', updatedMeals.map(m => m.id))

    if (portionsError) {
      console.error('[performSwapTransaction] Error fetching portions_to_cook:', portionsError)
      // Non-critical error, continue with null values
    }

    const portionsMap = new Map(
      (mealsWithPortions || []).map(m => [m.id, m.portions_to_cook as number | null])
    )

    const result: UpdatedMealInSwap[] = updatedMeals.map(meal => ({
      id: meal.id,
      slot: meal.slot as Enums<'meal_slot'>,
      status: meal.status as Enums<'meal_status'>,
      calories_planned: meal.calories_planned,
      portion_multiplier: meal.portion_multiplier,
      portions_to_cook: portionsMap.get(meal.id) ?? null,
      multi_portion_group_id: meal.multi_portion_group_id,
      is_leftover: meal.is_leftover,
      recipe_id: meal.recipe_id
    }))

    console.info('[performSwapTransaction] Swap completed successfully:', {
      updatedMealIds: result.map(m => m.id),
      newRecipeId: newRecipe.id,
      portionMultiplier,
      plannedCalories
    })

    return result
  } catch (error) {
    if (error instanceof ServerError) {
      throw error
    }

    console.error('[performSwapTransaction] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    throw new ServerError(
      'Failed to perform swap transaction',
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Get alternative recipes for a plan meal
 * 
 * Returns up to `limit` alternative recipes that:
 * - Are available for the same meal slot
 * - Have calories within ±20% of the target (based on plan_meal.calories_planned)
 * - Exclude the current recipe
 * 
 * @param mealId - ID of the plan meal to find alternatives for
 * @param userId - User ID for authorization check
 * @param supabase - Supabase client instance
 * @param limit - Maximum number of alternatives to return (default 3)
 * @returns Array of alternative recipes (RecipeDTO)
 * @throws ServerError on database errors
 */
export async function getAlternativesForMeal(
  mealId: number,
  userId: string,
  supabase: SupabaseClient<Database>,
  limit: number = 3
): Promise<RecipeDTO[]> {
  try {
    // Step 1: Fetch plan_meal and verify ownership
    const planMeal = await getPlanMealById(mealId, supabase)

    if (!planMeal) {
      return []
    }

    // Verify user ownership
    if (planMeal.user_id !== userId) {
      throw new ServerError('Forbidden: Cannot access meal from another user\'s plan')
    }

    // Step 2: Calculate target calories per serving
    // Use plan_meal.calories_planned / portion_multiplier as the target
    if (planMeal.portion_multiplier <= 0) {
      console.error('[getAlternativesForMeal] Invalid portion_multiplier:', {
        mealId,
        portion_multiplier: planMeal.portion_multiplier
      })
      return []
    }

    const targetCaloriesPerServing = Math.round(
      planMeal.calories_planned / planMeal.portion_multiplier
    )

    // Calculate calorie range (±20%)
    const minCalories = Math.round(targetCaloriesPerServing * (1 - CALORIE_TOLERANCE))
    const maxCalories = Math.round(targetCaloriesPerServing * (1 + CALORIE_TOLERANCE))

    console.info('[getAlternativesForMeal] Searching alternatives:', {
      mealId,
      slot: planMeal.slot,
      currentRecipeId: planMeal.recipe_id,
      targetCaloriesPerServing,
      calorieRange: [minCalories, maxCalories],
      limit
    })

    // Step 3: Find recipe IDs that match the slot
    const { data: slotMatches, error: slotError } = await supabase
      .from('recipe_slots')
      .select('recipe_id')
      .eq('slot', planMeal.slot)

    if (slotError) {
      console.error('[getAlternativesForMeal] Error fetching recipe slots:', slotError)
      throw new ServerError('Failed to fetch recipe slots', slotError as any)
    }

    const eligibleRecipeIds = (slotMatches || []).map(m => m.recipe_id)

    if (eligibleRecipeIds.length === 0) {
      console.info('[getAlternativesForMeal] No recipes found for slot:', planMeal.slot)
      return []
    }

    // Step 4: Query recipes with calorie filter
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, slug, name, calories_kcal, portions, prep_minutes, cook_minutes, image_url, source_url')
      .in('id', eligibleRecipeIds)
      .neq('id', planMeal.recipe_id) // Exclude current recipe
      .gte('calories_kcal', minCalories)
      .lte('calories_kcal', maxCalories)
      .eq('is_active', true)
      .limit(limit)

    if (recipesError) {
      console.error('[getAlternativesForMeal] Error fetching recipes:', recipesError)
      throw new ServerError('Failed to fetch alternative recipes', recipesError as any)
    }

    if (!recipes || recipes.length === 0) {
      console.info('[getAlternativesForMeal] No matching alternatives found')
      return []
    }

    // Step 5: Enrich with slots for each recipe
    const recipeIds = recipes.map(r => r.id)
    const { data: slotsData, error: slotsError } = await supabase
      .from('recipe_slots')
      .select('recipe_id, slot')
      .in('recipe_id', recipeIds)

    if (slotsError) {
      console.error('[getAlternativesForMeal] Error fetching slots:', slotsError)
      throw new ServerError('Failed to fetch recipe slots', slotsError as any)
    }

    // Group slots by recipe_id
    const slotsByRecipe = new Map<number, string[]>()
    for (const slotRow of slotsData || []) {
      if (!slotsByRecipe.has(slotRow.recipe_id)) {
        slotsByRecipe.set(slotRow.recipe_id, [])
      }
      if (slotRow.slot) {
        slotsByRecipe.get(slotRow.recipe_id)!.push(slotRow.slot)
      }
    }

    // Step 6: Map to RecipeDTO
    const result: RecipeDTO[] = recipes.map(recipe => ({
      id: recipe.id,
      slug: recipe.slug,
      name: recipe.name,
      available_slots: (slotsByRecipe.get(recipe.id) || []) as Enums<'meal_slot'>[],
      calories_per_serving: recipe.calories_kcal,
      servings: recipe.portions,
      time_minutes: recipe.prep_minutes || recipe.cook_minutes || null,
      image_url: recipe.image_url,
      source_url: recipe.source_url
    }))

    console.info('[getAlternativesForMeal] Found alternatives:', {
      count: result.length,
      recipeIds: result.map(r => r.id)
    })

    return result
  } catch (error) {
    if (error instanceof ServerError) {
      throw error
    }

    console.error('[getAlternativesForMeal] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    throw new ServerError(
      'Failed to fetch meal alternatives',
      error instanceof Error ? error : undefined
    )
  }
}

