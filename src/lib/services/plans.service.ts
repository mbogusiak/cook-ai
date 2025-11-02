import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Enums } from '../../db/database.types'
import type { CreatePlanCommand, PlanDTO, PlansListResponse, PaginationMeta, PlanDetailsResponse } from '../../types'
import type { GetPlansQuery } from '../schemas/plan'
import { ConflictError, ServerError, NotFoundError, ForbiddenError } from '../errors'
import { randomUUID } from 'crypto'

/**
 * Calculate end date from start date and plan length in days
 */
function calculateEndDate(startDate: string, planLengthDays: number): string {
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + planLengthDays - 1)
  
  return end.toISOString().split('T')[0]
}

/**
 * Generate array of dates for the plan duration
 */
function generatePlanDates(startDate: string, planLengthDays: number): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  
  for (let i = 0; i < planLengthDays; i++) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

/**
 * Calculate calorie targets for each meal slot
 * Distribution: Breakfast 25%, Lunch 35%, Dinner 35%, Snacks 5%
 */
function calculateSlotTargets(
  dailyCalories: number
): Record<Enums<'meal_slot'>, number> {
  return {
    breakfast: Math.round(dailyCalories * 0.25),
    lunch: Math.round(dailyCalories * 0.35),
    dinner: Math.round(dailyCalories * 0.35),
    snack: Math.round(dailyCalories * 0.05)
  }
}

/**
 * Get recipes matching slot and calorie target (±margin, default ±20%)
 */
async function getRecipesForSlot(
  supabase: SupabaseClient<Database>,
  slot: Enums<'meal_slot'>,
  targetCalories: number,
  excludeRecipeIds: number[] = [],
  calorieMargin: number = 0.2,
  limit: number = 10
) {
  const minCalories = Math.round(targetCalories * (1 - calorieMargin))
  const maxCalories = Math.round(targetCalories * (1 + calorieMargin))

  console.log(`[getRecipesForSlot] Fetching ${slot} recipes (${minCalories}-${maxCalories} cal, excluding ${excludeRecipeIds.length} recipes)`)

  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, calories_kcal, portions')
    .eq('is_active', true)
    .gte('calories_kcal', minCalories)
    .lte('calories_kcal', maxCalories)
    .limit(limit)

  if (error) {
    console.error(`[getRecipesForSlot] Query error for ${slot}:`, error)
    throw new ServerError(`Failed to fetch recipes for ${slot} slot`, error)
  }

  console.log(`[getRecipesForSlot] Found ${data?.length || 0} recipes for ${slot} before exclusion filter`)

  // Filter by slot availability
  if (!data || data.length === 0) {
    return []
  }

  const recipeIds = data.map(r => r.id)

  // Check which recipes have this slot
  const { data: slotData, error: slotError } = await supabase
    .from('recipe_slots')
    .select('recipe_id')
    .eq('slot', slot)
    .in('recipe_id', recipeIds)

  if (slotError) {
    console.error(`[getRecipesForSlot] Slot query error for ${slot}:`, slotError)
    throw new ServerError(`Failed to fetch recipe slots for ${slot}`, slotError)
  }

  const validRecipeIds = new Set((slotData || []).map(s => s.recipe_id))
  const result = data.filter(recipe => validRecipeIds.has(recipe.id) && !excludeRecipeIds.includes(recipe.id))
  
  console.log(`[getRecipesForSlot] After filters: ${result.length} recipes for ${slot}`)
  
  return result
}

/**
 * Select a random recipe from available options
 */
function selectRandomRecipe(recipes: any[]) {
  if (recipes.length === 0) {
    return null
  }
  return recipes[Math.floor(Math.random() * recipes.length)]
}

/**
 * Select a recipe with fallback margin escalation and fallback logic
 * First tries ±20% margin, then ±30%, then ±30% allowing repetition
 * Excludes recipes already used in the plan (until final fallback)
 * 
 * @param supabase - Supabase client
 * @param slot - Meal slot
 * @param targetCalories - Target calorie count
 * @param excludeRecipeIds - Recipe IDs to exclude from selection
 * @returns Selected recipe or null if none available
 */
async function selectRecipeWithFallback(
  supabase: SupabaseClient<Database>,
  slot: Enums<'meal_slot'>,
  targetCalories: number,
  excludeRecipeIds: number[]
) {
  // Try with 20% margin first + exclude already used recipes
  let recipes = await getRecipesForSlot(
    supabase,
    slot,
    targetCalories,
    excludeRecipeIds,
    0.2
  )
  
  console.log(`[selectRecipeWithFallback] Level 1 (±20%, no repetition): ${recipes.length} recipes found`)

  // If no results, try with 30% margin + exclude already used recipes
  if (recipes.length === 0) {
    console.log(`[selectRecipeWithFallback] No recipes found with ±20% margin, trying ±30%`)
    recipes = await getRecipesForSlot(
      supabase,
      slot,
      targetCalories,
      excludeRecipeIds,
      0.3
    )
    
    console.log(`[selectRecipeWithFallback] Level 2 (±30%, no repetition): ${recipes.length} recipes found`)
  }

  // If still no results, allow repetition - try with 30% margin without exclusion filter
  if (recipes.length === 0) {
    console.log(`[selectRecipeWithFallback] No unique recipes available, allowing repetition with ±30%`)
    recipes = await getRecipesForSlot(
      supabase,
      slot,
      targetCalories,
      [],
      0.3
    )
    
    console.log(`[selectRecipeWithFallback] Level 3 (±30%, with repetition): ${recipes.length} recipes found`)
  }

  if (recipes.length === 0) {
    console.error(`[selectRecipeWithFallback] FAILED: No recipes available at all for ${slot} (target: ${targetCalories} cal)`)
    return null
  }

  const selected = selectRandomRecipe(recipes)
  console.log(`[selectRecipeWithFallback] Selected recipe ID: ${selected?.id}, portions: ${selected?.portions}`)
  return selected
}

/**
 * Check if user already has an active plan
 */
async function checkExistingActivePlan(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('plans')
    .select('id')
    .eq('user_id', userId)
    .eq('state', 'active')
    .limit(1)

  if (error) {
    throw new ServerError('Failed to check existing plans', error)
  }

  return (data && data.length > 0) || false
}

/**
 * Get paginated list of user's plans with optional filtering
 * 
 * Features:
 * - Pagination with limit and offset
 * - Optional filtering by plan state
 * - Ordered by created_at DESC (newest first)
 * - RLS automatically filters by user_id
 * 
 * @param supabase - Supabase client
 * @param userId - User ID (for logging/debugging, RLS handles authorization)
 * @param filters - Query filters (state, limit, offset)
 * @returns Paginated list of plans with metadata
 * @throws ServerError on database errors
 */
export async function getPlans(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: GetPlansQuery
): Promise<PlansListResponse & { has_active_plan: boolean }> {
  const { state, limit, offset } = filters

  try {
    // Build query with count
    let query = supabase
      .from('plans')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply state filter if provided
    if (state) {
      query = query.eq('state', state)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data, error, count } = await query

    if (error) {
      console.error('[getPlans] Query error:', error)
      throw new ServerError('Failed to fetch plans', error)
    }

    // Check if user has any active plan (query all plans to check, ignoring pagination)
    const { data: allPlans, error: allPlansError } = await supabase
      .from('plans')
      .select('state')
      .eq('state', 'active')

    if (allPlansError) {
      console.error('[getPlans] Error checking active plans:', allPlansError)
      throw new ServerError('Failed to check active plans', allPlansError)
    }

    const has_active_plan = (allPlans ?? []).length > 0

    // Build pagination metadata
    const total = count ?? 0
    const has_more = (offset + limit) < total

    const pagination: PaginationMeta = {
      total,
      limit,
      offset,
      has_more
    }

    return {
      data: data ?? [],
      pagination,
      has_active_plan
    }
  } catch (error) {
    // Re-throw application errors
    if (error instanceof ServerError) {
      throw error
    }

    // Wrap unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[getPlans] Unexpected error:', errorMessage)
    throw new ServerError('Failed to fetch plans', error instanceof Error ? error : undefined)
  }
}

/**
 * Generate a new meal plan for user
 * 
 * Steps:
 * 1. Verify user doesn't have active plan
 * 2. Calculate dates and calorie targets
 * 3. Begin database transaction
 * 4. Create plan record
 * 5. Create plan_days
 * 6. Create plan_day_slot_targets
 * 7. Select and assign recipes to meals
 * 8. Commit transaction
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID (from session)
 * @param command - Plan generation command
 * @returns Created plan DTO
 * @throws ConflictError if active plan exists
 * @throws ServerError if database operations fail
 */
export async function generatePlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  command: CreatePlanCommand
): Promise<PlanDTO> {
  // Check for existing active plan
  const hasActivePlan = await checkExistingActivePlan(supabase, userId)
  if (hasActivePlan) {
    throw new ConflictError(
      'User already has an active plan. Archive or complete the existing plan first.'
    )
  }

  // Calculate dates and targets
  const endDate = calculateEndDate(command.start_date, command.plan_length_days)
  const planDates = generatePlanDates(command.start_date, command.plan_length_days)
  const slotTargets = calculateSlotTargets(command.daily_calories)

  // Start transaction
  try {
    // 1. Create plan record
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        start_date: command.start_date,
        end_date: endDate,
        state: 'active',
        daily_calories: command.daily_calories
      })
      .select()
      .single()

    if (planError) {
      console.error('[generatePlan] Plan creation failed:', {
        code: (planError as any)?.code,
        message: (planError as any)?.message,
        details: (planError as any)?.details,
        hint: (planError as any)?.hint,
        fullError: planError
      })
      throw new ServerError('Failed to create plan', planError)
    }

    if (!planData) {
      throw new ServerError('Failed to retrieve created plan')
    }

    const planId = planData.id

    // 2. Create plan_days for each date
    const planDaysToInsert = planDates.map(date => ({
      plan_id: planId,
      date
    }))

    const { data: planDaysData, error: planDaysError } = await supabase
      .from('plan_days')
      .insert(planDaysToInsert)
      .select()

    if (planDaysError) {
      throw new ServerError('Failed to create plan days', planDaysError)
    }

    if (!planDaysData || planDaysData.length === 0) {
      throw new ServerError('Failed to retrieve created plan days')
    }

    // 3. Create plan_day_slot_targets
    const slotTargetsToInsert: any[] = []
    const slots: Enums<'meal_slot'>[] = ['breakfast', 'lunch', 'dinner', 'snack']

    for (const planDay of planDaysData) {
      for (const slot of slots) {
        slotTargetsToInsert.push({
          plan_day_id: planDay.id,
          slot,
          calories_target: slotTargets[slot]
        })
      }
    }

    const { error: slotTargetsError } = await supabase
      .from('plan_day_slot_targets')
      .insert(slotTargetsToInsert)

    if (slotTargetsError) {
      console.error('[generatePlan] Slot targets creation failed:', {
        code: (slotTargetsError as any)?.code,
        message: (slotTargetsError as any)?.message,
        details: (slotTargetsError as any)?.details,
        hint: (slotTargetsError as any)?.hint,
        fullError: slotTargetsError
      })
      throw new ServerError('Failed to create slot targets', slotTargetsError)
    }

    // 4. Create plan_meals by selecting recipes (v2 UPDATED with portion_multiplier & portions_to_cook)
    const mealsToInsert: any[] = []
    const usedRecipeIds = new Set<number>()
    
    // Track which day/slot combinations are already filled (by multi-portion leftovers)
    // Key format: "dayIndex_slot" (e.g., "0_lunch", "1_dinner")
    const filledSlots = new Set<string>()

    for (let dayIndex = 0; dayIndex < planDaysData.length; dayIndex++) {
      const planDay = planDaysData[dayIndex]
      
      for (const slot of slots) {
        const slotKey = `${dayIndex}_${slot}`
        
        // Skip if this slot is already filled by a multi-portion leftover
        if (filledSlots.has(slotKey)) {
          console.log(`[generatePlan] Skipping ${slotKey} - already filled by multi-portion leftover`)
          continue
        }
        
        // Select recipe matching slot and calorie target
        const selectedRecipe = await selectRecipeWithFallback(
          supabase,
          slot,
          slotTargets[slot],
          Array.from(usedRecipeIds)
        )

        if (!selectedRecipe) {
          throw new ServerError(
            `No recipes available for slot "${slot}" with ~${slotTargets[slot]} calories (excluding already used recipes)`
          )
        }

        // v2 SEMANTICS: Calculate portion_multiplier (number of portions to eat)
        // IMPORTANT: portion_multiplier must be an INTEGER (whole number of portions)
        // This aligns with PRD requirements ("2 porcje", not "2.4 porcje")
        // and enables "Ugotuj 1/3" fraction display logic
        // Formula: portion_multiplier = ROUND(target_calories / calories_per_portion)
        const caloriesPerPortion = selectedRecipe.calories_kcal
        const portion_multiplier = Math.round(slotTargets[slot] / caloriesPerPortion)

        // v2 VALIDATION: Ensure portion_multiplier doesn't exceed recipe portions
        // (Database trigger will also validate this, but we check here for early error reporting)
        if (portion_multiplier > selectedRecipe.portions) {
          console.warn(
            `[generatePlan] portion_multiplier (${portion_multiplier}) exceeds recipe portions (${selectedRecipe.portions}), adjusting...`,
            { recipeId: selectedRecipe.id, recipeName: selectedRecipe.name }
          )
          // This shouldn't normally happen with proper margin fallback, but log it
        }

        // v2 SEMANTICS: Calculate calories_planned based on portion_multiplier
        // Formula: calories_planned = calories_per_portion * portion_multiplier
        const calories_planned = Math.round(caloriesPerPortion * portion_multiplier)

        // Multi-portion candidate criteria (per PRD):
        // - Slot must be lunch or dinner (breakfast/snack are single-day only)
        // - Recipe must have at least 2 portions
        // - Next day must be available
        // - Next day's same slot must not be filled yet
        const isMultiPortionCandidate = 
          (slot === 'lunch' || slot === 'dinner') &&
          selectedRecipe.portions >= 2 &&
          dayIndex < planDaysData.length - 1 &&
          !filledSlots.has(`${dayIndex + 1}_${slot}`)

        if (isMultiPortionCandidate) {
          // === MULTI-PORTION PATH ===
          const multiPortionGroupId = randomUUID()
          const nextDay = planDaysData[dayIndex + 1]
          
          console.log(
            `[generatePlan] Multi-portion meal: ${selectedRecipe.name} (${slot}) ` +
            `portion_multiplier=${portion_multiplier}, calories=${calories_planned}, ` +
            `portions_to_cook=${selectedRecipe.portions}, days=${dayIndex}-${dayIndex + 1}`
          )

          // Day 1: Cooking day
          mealsToInsert.push({
            plan_id: planId,
            plan_day_id: planDay.id,
            recipe_id: selectedRecipe.id,
            slot,
            status: 'planned',
            calories_planned: calories_planned,
            portion_multiplier: portion_multiplier,
            portions_to_cook: selectedRecipe.portions,  // Cook the full recipe
            multi_portion_group_id: multiPortionGroupId,
            is_leftover: false,  // Day 1 = cooking
            user_id: userId
          })

          // Day 2: Leftovers day (SAME portion_multiplier!)
          mealsToInsert.push({
            plan_id: planId,
            plan_day_id: nextDay.id,
            recipe_id: selectedRecipe.id,
            slot,
            status: 'planned',
            calories_planned: calories_planned,  // IDENTICAL to day 1
            portion_multiplier: portion_multiplier,  // IDENTICAL to day 1
            portions_to_cook: null,  // Don't cook, use leftovers
            multi_portion_group_id: multiPortionGroupId,
            is_leftover: true,  // Day 2 = leftovers
            user_id: userId
          })

          // Mark next day's slot as filled
          filledSlots.add(`${dayIndex + 1}_${slot}`)
          
          // Add recipe to used set (count once for the multi-portion pair)
          usedRecipeIds.add(selectedRecipe.id)
          
        } else {
          // === SINGLE-PORTION PATH ===
          console.log(
            `[generatePlan] Single-portion meal: ${selectedRecipe.name} (${slot}) ` +
            `portion_multiplier=${portion_multiplier}, calories=${calories_planned}, ` +
            `portions_to_cook=${selectedRecipe.portions}`
          )

          mealsToInsert.push({
            plan_id: planId,
            plan_day_id: planDay.id,
            recipe_id: selectedRecipe.id,
            slot,
            status: 'planned',
            calories_planned: calories_planned,
            portion_multiplier: portion_multiplier,
            portions_to_cook: selectedRecipe.portions,  // Cook the full recipe
            multi_portion_group_id: null,
            is_leftover: false,
            user_id: userId
          })
          
          // Add recipe to used set
          usedRecipeIds.add(selectedRecipe.id)
        }
      }
    }

    const { error: mealsError } = await supabase
      .from('plan_meals')
      .insert(mealsToInsert)

    if (mealsError) {
      console.error('[generatePlan] Meals insert error:', {
        code: (mealsError as any)?.code,
        message: (mealsError as any)?.message,
        details: (mealsError as any)?.details,
        hint: (mealsError as any)?.hint,
        mealsToInsertCount: mealsToInsert.length,
        firstMeal: mealsToInsert[0],
        fullError: mealsError
      })
      throw new ServerError('Failed to create plan meals', mealsError)
    }

    // Return created plan as PlanDTO
    return {
      id: planData.id,
      user_id: planData.user_id,
      state: planData.state as Enums<'plan_state'>,
      start_date: planData.start_date,
      end_date: planData.end_date,
      daily_calories: planData.daily_calories,
      created_at: planData.created_at,
      updated_at: planData.updated_at
    }
  } catch (error) {
    // Re-throw application errors
    if (error instanceof ConflictError || error instanceof ServerError) {
      throw error
    }

    // Wrap unexpected errors with detailed logging
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[generatePlan] Unexpected error:', {
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage,
      errorStack
    })

    throw new ServerError('Plan generation failed', error instanceof Error ? error : undefined)
  }
}

/**
 * Fetch complete plan details with nested days, meals, and recipes
 * 
 * Retrieves:
 * - Plan metadata (id, user_id, state, dates)
 * - All plan days ordered by date
 * - Slot targets for each day
 * - Meals with recipe details for each day
 * 
 * @param supabase - Supabase client
 * @param planId - ID of the plan to fetch
 * @param userId - ID of the user (for authorization check)
 * @returns Plan details with nested structure or null if not found
 * @throws ServerError on database errors
 */
export async function getPlanDetailsWithMeals(
  supabase: SupabaseClient<Database>,
  planId: number,
  userId: string
) {
  try {
    // Step 1: Fetch main plan record with authorization check
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('id, user_id, state, start_date, end_date, daily_calories, created_at, updated_at')
      .eq('id', planId)
      .eq('user_id', userId)
      .single()

    if (planError) {
      // Check if it's a "not found" error (PGRST116) or actual database error
      if ((planError as any).code === 'PGRST116') {
        return null
      }
      console.error('[getPlanDetailsWithMeals] Plan fetch error:', planError)
      throw new ServerError('Failed to fetch plan', planError as any)
    }

    if (!planData) {
      return null
    }

    // Step 2: Fetch all plan days ordered by date
    const { data: planDaysData, error: planDaysError } = await supabase
      .from('plan_days')
      .select('id, plan_id, date, created_at, updated_at')
      .eq('plan_id', planId)
      .order('date', { ascending: true })

    if (planDaysError) {
      console.error('[getPlanDetailsWithMeals] Plan days fetch error:', planDaysError)
      throw new ServerError('Failed to fetch plan days', planDaysError as any)
    }

    // Step 3: Fetch slot targets for all days
    const dayIds = (planDaysData || []).map(d => d.id)
    let slotTargetsData: any[] = []

    if (dayIds.length > 0) {
      const { data: targets, error: targetsError } = await supabase
        .from('plan_day_slot_targets')
        .select('plan_day_id, slot, calories_target')
        .in('plan_day_id', dayIds)

      if (targetsError) {
        console.error('[getPlanDetailsWithMeals] Slot targets fetch error:', targetsError)
        throw new ServerError('Failed to fetch slot targets', targetsError as any)
      }

      slotTargetsData = targets || []
    }

    // Step 4: Fetch meals with recipe details for all days (v2 UPDATED: includes portions_to_cook)
    let mealsData: any[] = []

    if (dayIds.length > 0) {
      const { data: meals, error: mealsError } = await supabase
        .from('plan_meals')
        .select(`
          id,
          slot,
          status,
          calories_planned,
          portion_multiplier,
          portions_to_cook,
          multi_portion_group_id,
          is_leftover,
          plan_day_id,
          recipe_id,
          recipes (
            id,
            name,
            image_url,
            prep_minutes,
            cook_minutes,
            source_url
          )
        `)
        .in('plan_day_id', dayIds)
        .order('slot', { ascending: true })

      if (mealsError) {
        console.error('[getPlanDetailsWithMeals] Meals fetch error:', mealsError)
        throw new ServerError('Failed to fetch plan meals', mealsError as any)
      }

      mealsData = meals || []
    }

    // Step 4b: Fetch available_slots for recipes
    let recipeSlots: Map<number, string[]> = new Map()

    if (mealsData.length > 0) {
      const recipeIds = [...new Set(mealsData.map(m => m.recipe_id))]

      const { data: slotsData, error: slotsError } = await supabase
        .from('recipe_slots')
        .select('recipe_id, slot')
        .in('recipe_id', recipeIds)

      if (slotsError) {
        console.error('[getPlanDetailsWithMeals] Recipe slots fetch error:', slotsError)
        throw new ServerError('Failed to fetch recipe slots', slotsError as any)
      }

      // Build map of recipe_id -> slots[]
      (slotsData || []).forEach(slot => {
        const slots = recipeSlots.get(slot.recipe_id) || []
        slots.push(slot.slot)
        recipeSlots.set(slot.recipe_id, slots)
      })
    }

    // Step 5: Transform raw data to PlanDetailsResponse structure (v2 UPDATED: maps portions_to_cook)
    const days = (planDaysData || []).map(day => {
      // Filter and map meals for this day
      const dayMeals = mealsData
        .filter(meal => meal.plan_day_id === day.id)
        .map((meal) => ({
          id: meal.id,
          slot: meal.slot as Enums<'meal_slot'>,
          status: meal.status as Enums<'meal_status'>,
          calories_planned: meal.calories_planned,
          portion_multiplier: meal.portion_multiplier,
          portions_to_cook: meal.portions_to_cook,  // v2: Map from DB
          multi_portion_group_id: meal.multi_portion_group_id,
          is_leftover: meal.is_leftover,
          recipe: {
            id: meal.recipes.id,
            name: meal.recipes.name,
            image_url: meal.recipes.image_url,
            time_minutes: ((meal.recipes.prep_minutes || 0) + (meal.recipes.cook_minutes || 0)) || null,
            source_url: meal.recipes.source_url,
            available_slots: recipeSlots.get(meal.recipes.id) || []
          }
        }))

      // Filter and map slot targets for this day
      const daySlotTargets = slotTargetsData
        .filter(target => target.plan_day_id === day.id)
        .map(target => ({
          slot: target.slot as Enums<'meal_slot'>,
          calories_target: target.calories_target
        }))

      return {
        id: day.id,
        plan_id: day.plan_id,
        date: day.date,
        meals: dayMeals,
        slot_targets: daySlotTargets
      }
    })

    // Return fully structured PlanDetailsResponse
    return {
      id: planData.id,
      user_id: planData.user_id,
      state: planData.state as Enums<'plan_state'>,
      start_date: planData.start_date,
      end_date: planData.end_date,
      daily_calories: planData.daily_calories,
      created_at: planData.created_at,
      updated_at: planData.updated_at,
      days
    }
  } catch (error) {
    // Re-throw application errors
    if (error instanceof ServerError) {
      throw error
    }

    // Wrap unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[getPlanDetailsWithMeals] Unexpected error:', errorMessage)
    throw new ServerError('Failed to fetch plan details', error instanceof Error ? error : undefined)
  }
}

/**
 * Get plan by ID with nested days, meals, and recipes
 * 
 * Retrieves:
 * - Plan metadata (id, user_id, state, dates)
 * - All plan days ordered by date
 * - Slot targets for each day (breakfast, lunch, dinner, snack)
 * - Meals with full recipe details including available_slots
 * 
 * @param supabase - Supabase client
 * @param planId - ID of the plan to fetch
 * @param userId - User ID to filter plans by (temporary until RLS is enabled)
 * @returns PlanDetailsResponse with nested structure or null if not found
 * @throws ServerError on database errors
 */
export async function getPlanById(
  supabase: SupabaseClient<Database>,
  planId: number,
  userId: string
): Promise<PlanDetailsResponse | null> {
  try {
    // Step 1: Fetch plan record filtered by user_id
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single()

    if (planError) {
      // PGRST116 = not found
      if ((planError as any).code === 'PGRST116') {
        return null
      }
      console.error('[getPlanById] Plan fetch error:', planError)
      throw new ServerError('Failed to fetch plan', planError as any)
    }

    if (!planData) {
      return null
    }

    // Step 2: Fetch plan days ordered by date
    const { data: daysData, error: daysError } = await supabase
      .from('plan_days')
      .select('*')
      .eq('plan_id', planId)
      .order('date', { ascending: true })

    if (daysError) {
      console.error('[getPlanById] Days fetch error:', daysError)
      throw new ServerError('Failed to fetch plan days', daysError as any)
    }

    const dayIds = (daysData || []).map(d => d.id)

    // Step 3: Fetch slot targets for all days
    let targetsData: any[] = []
    if (dayIds.length > 0) {
      const { data, error } = await supabase
        .from('plan_day_slot_targets')
        .select('*')
        .in('plan_day_id', dayIds)

      if (error) {
        console.error('[getPlanById] Targets fetch error:', error)
        throw new ServerError('Failed to fetch slot targets', error as any)
      }

      targetsData = data || []
    }

    // Step 4: Fetch meals with recipe details
    let mealsData: any[] = []
    if (dayIds.length > 0) {
      const { data, error } = await supabase
        .from('plan_meals')
        .select(`
          id,
          slot,
          status,
          calories_planned,
          portion_multiplier,
          portions_to_cook,
          multi_portion_group_id,
          is_leftover,
          plan_day_id,
          recipe_id,
          recipes (
            id,
            name,
            image_url,
            prep_minutes,
            cook_minutes,
            source_url
          )
        `)
        .in('plan_day_id', dayIds)
        .order('slot')

      if (error) {
        console.error('[getPlanById] Meals fetch error:', error)
        throw new ServerError('Failed to fetch plan meals', error as any)
      }

      mealsData = data || []
    }

    // Step 5: Fetch available_slots for all recipes
    const recipeSlotsMap = new Map<number, Enums<'meal_slot'>[]>()
    if (mealsData.length > 0) {
      const recipeIds = [...new Set(mealsData.map(m => m.recipe_id))]

      const { data, error } = await supabase
        .from('recipe_slots')
        .select('recipe_id, slot')
        .in('recipe_id', recipeIds)

      if (error) {
        console.error('[getPlanById] Recipe slots fetch error:', error)
        throw new ServerError('Failed to fetch recipe slots', error as any)
      }

      // Build map: recipe_id -> slots[]
      (data || []).forEach(rs => {
        const slots = recipeSlotsMap.get(rs.recipe_id) || []
        slots.push(rs.slot as Enums<'meal_slot'>)
        recipeSlotsMap.set(rs.recipe_id, slots)
      })
    }

    // Step 6: Transform to PlanDetailsResponse structure
    const days = (daysData || []).map(day => {
      // Map meals for this day
      const dayMeals = mealsData
        .filter(m => m.plan_day_id === day.id)
        .map(m => {
          const recipe = m.recipes as any
          const timeMinutes = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)

          return {
            id: m.id,
            slot: m.slot as Enums<'meal_slot'>,
            status: m.status as Enums<'meal_status'>,
            calories_planned: m.calories_planned,
            portion_multiplier: m.portion_multiplier,
            portions_to_cook: m.portions_to_cook,
            multi_portion_group_id: m.multi_portion_group_id,
            is_leftover: m.is_leftover,
            recipe: {
              id: recipe.id,
              name: recipe.name,
              image_url: recipe.image_url,
              time_minutes: timeMinutes > 0 ? timeMinutes : null,
              source_url: recipe.source_url,
              available_slots: recipeSlotsMap.get(recipe.id) || []
            }
          }
        })

      // Map slot targets for this day
      const dayTargets = targetsData
        .filter(t => t.plan_day_id === day.id)
        .map(t => ({
          slot: t.slot as Enums<'meal_slot'>,
          calories_target: t.calories_target
        }))

      return {
        id: day.id,
        plan_id: day.plan_id,
        date: day.date,
        meals: dayMeals,
        slot_targets: dayTargets
      }
    })

    // Step 7: Return complete PlanDetailsResponse
    const response: PlanDetailsResponse = {
      id: planData.id,
      user_id: planData.user_id,
      state: planData.state as Enums<'plan_state'>,
      start_date: planData.start_date,
      end_date: planData.end_date,
      daily_calories: planData.daily_calories,
      created_at: planData.created_at,
      updated_at: planData.updated_at,
      days
    }

    return response
  } catch (error) {
    // Re-throw application errors
    if (error instanceof ServerError) {
      throw error
    }

    // Wrap unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[getPlanById] Unexpected error:', errorMessage)
    throw new ServerError('Failed to fetch plan', error instanceof Error ? error : undefined)
  }
}

/**
 * Update plan state
 * 
 * Steps:
 * 1. Verify plan exists and belongs to user
 * 2. Update plan state
 * 3. Return updated plan DTO
 * 
 * @param supabase - Supabase client
 * @param planId - ID of the plan to update
 * @param userId - ID of the user (for authorization check)
 * @param newState - New state value
 * @returns Updated plan DTO
 * @throws NotFoundError if plan doesn't exist
 * @throws ForbiddenError if user doesn't own the plan
 * @throws ServerError on database errors
 */
export async function updatePlanState(
  supabase: SupabaseClient<Database>,
  planId: number,
  userId: string,
  newState: Enums<'plan_state'>
): Promise<PlanDTO> {
  try {
    // Step 1: Check if plan exists and verify ownership
    const { data: existingPlan, error: fetchError } = await supabase
      .from('plans')
      .select('id, user_id')
      .eq('id', planId)
      .single()

    if (fetchError) {
      // Check if it's a "not found" error (PGRST116)
      if ((fetchError as any).code === 'PGRST116') {
        throw new NotFoundError('Plan not found')
      }
      console.error('[updatePlanState] Plan fetch error:', fetchError)
      throw new ServerError('Failed to fetch plan', fetchError as any)
    }

    if (!existingPlan) {
      throw new NotFoundError('Plan not found')
    }

    // Step 2: Verify user owns the plan
    if (existingPlan.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to update this plan')
    }

    // Step 3: Update plan state
    const { data: updatedPlan, error: updateError } = await supabase
      .from('plans')
      .update({
        state: newState,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select('id, user_id, state, start_date, end_date, daily_calories, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('[updatePlanState] Plan update error:', updateError)
      throw new ServerError('Failed to update plan state', updateError as any)
    }

    if (!updatedPlan) {
      throw new ServerError('Failed to retrieve updated plan')
    }

    // Step 4: Return updated plan as PlanDTO
    return {
      id: updatedPlan.id,
      user_id: updatedPlan.user_id,
      state: updatedPlan.state as Enums<'plan_state'>,
      start_date: updatedPlan.start_date,
      end_date: updatedPlan.end_date,
      daily_calories: updatedPlan.daily_calories,
      created_at: updatedPlan.created_at,
      updated_at: updatedPlan.updated_at
    }
  } catch (error) {
    // Re-throw application errors
    if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ServerError) {
      throw error
    }

    // Wrap unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[updatePlanState] Unexpected error:', errorMessage)
    throw new ServerError('Failed to update plan state', error instanceof Error ? error : undefined)
  }
}
