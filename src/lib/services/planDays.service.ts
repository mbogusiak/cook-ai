import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../db/database.types'
import type { PlanDayResponse } from '../../types'
import { ServerError } from '../errors'

/**
 * Fetch a single plan day with nested meals and slot targets.
 * - Verifies plan ownership by userId.
 * - Returns structured `PlanDayResponse` or null if not found/unauthorized.
 */
export async function getPlanDay(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: number,
  date: string
): Promise<PlanDayResponse | null> {
  try {
    // 1) Verify plan exists and belongs to user
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, user_id')
      .eq('id', planId)
      .single()

    if (planError) {
      if ((planError as any).code === 'PGRST116') return null
      console.error('[getPlanDay] Plan fetch error:', planError)
      throw new ServerError('Failed to fetch plan', planError as any)
    }

    if (!plan || plan.user_id !== userId) {
      // Either not found or forbidden
      return null
    }

    // 2) Fetch plan_day by unique (plan_id, date)
    const { data: day, error: dayError } = await supabase
      .from('plan_days')
      .select('id, plan_id, date')
      .eq('plan_id', planId)
      .eq('date', date)
      .single()

    if (dayError) {
      if ((dayError as any).code === 'PGRST116') return null
      console.error('[getPlanDay] Plan day fetch error:', dayError)
      throw new ServerError('Failed to fetch plan day', dayError as any)
    }

    if (!day) return null

    // 3) Fetch slot targets for the day
    const { data: targets, error: targetsError } = await supabase
      .from('plan_day_slot_targets')
      .select('slot, calories_target')
      .eq('plan_day_id', day.id)

    if (targetsError) {
      console.error('[getPlanDay] Slot targets fetch error:', targetsError)
      throw new ServerError('Failed to fetch slot targets', targetsError as any)
    }

    // 4) Fetch meals with recipe details for the day
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
      .eq('plan_day_id', day.id)
      .order('slot', { ascending: true })

    if (mealsError) {
      console.error('[getPlanDay] Meals fetch error:', mealsError)
      throw new ServerError('Failed to fetch plan meals', mealsError as any)
    }

    const recipeIds = [...new Set((meals || []).map(m => m.recipe_id))]

    // 4b) Fetch available_slots per recipe
    let recipeSlotsMap: Map<number, string[]> = new Map()
    if (recipeIds.length > 0) {
      const { data: slotsData, error: slotsError } = await supabase
        .from('recipe_slots')
        .select('recipe_id, slot')
        .in('recipe_id', recipeIds)

      if (slotsError) {
        console.error('[getPlanDay] Recipe slots fetch error:', slotsError)
        throw new ServerError('Failed to fetch recipe slots', slotsError as any)
      }

      (slotsData || []).forEach(s => {
        const arr = recipeSlotsMap.get(s.recipe_id) || []
        arr.push(s.slot)
        recipeSlotsMap.set(s.recipe_id, arr)
      })
    }

    // 5) Map to PlanDayResponse
    const mappedMeals = (meals || []).map((meal) => ({
      id: meal.id,
      slot: meal.slot as any, // Enums<'meal_slot'>
      status: meal.status as any, // Enums<'meal_status'>
      calories_planned: meal.calories_planned,
      portion_multiplier: meal.portion_multiplier,
      portions_to_cook: meal.portions_to_cook,
      multi_portion_group_id: meal.multi_portion_group_id,
      is_leftover: meal.is_leftover,
      recipe: {
        id: meal.recipes.id,
        name: meal.recipes.name,
        image_url: meal.recipes.image_url,
        time_minutes: ((meal.recipes.prep_minutes || 0) + (meal.recipes.cook_minutes || 0)) || null,
        source_url: meal.recipes.source_url,
        available_slots: recipeSlotsMap.get(meal.recipes.id) || []
      }
    }))

    const mappedTargets = (targets || []).map(t => ({
      slot: t.slot as any,
      calories_target: t.calories_target
    }))

    const response: PlanDayResponse = {
      id: day.id,
      plan_id: day.plan_id,
      date: day.date,
      meals: mappedMeals,
      slot_targets: mappedTargets
    }

    return response
  } catch (error) {
    if (error instanceof ServerError) throw error
    const message = error instanceof Error ? error.message : String(error)
    console.error('[getPlanDay] Unexpected error:', message)
    throw new ServerError('Failed to fetch plan day', error as any)
  }
}



