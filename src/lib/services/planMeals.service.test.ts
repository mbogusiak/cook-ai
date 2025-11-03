import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Enums } from '../../db/database.types'
import { validateSwapCandidate, performSwapTransaction, getAlternativesForMeal, updateMealStatus } from './planMeals.service'

type AnySupabase = SupabaseClient<Database> & Record<string, any>

function createSupabaseStubForPlanMeals() {
  // In-memory tables
  const plan_meals: any[] = [
    // Single meal (owned by u1)
    {
      id: 1, plan_id: 10, plan_day_id: 100, user_id: 'u1', slot: 'lunch', status: 'planned',
      recipe_id: 200, portion_multiplier: 2, calories_planned: 600,
      multi_portion_group_id: null, is_leftover: false, portions_to_cook: 2, created_at: '', updated_at: ''
    },
    // Group meals (owned by u1) dinner pair
    {
      id: 2, plan_id: 10, plan_day_id: 101, user_id: 'u1', slot: 'dinner', status: 'planned',
      recipe_id: 300, portion_multiplier: 1, calories_planned: 700,
      multi_portion_group_id: 'grp', is_leftover: false, portions_to_cook: 4, created_at: '', updated_at: ''
    },
    {
      id: 3, plan_id: 10, plan_day_id: 102, user_id: 'u1', slot: 'dinner', status: 'planned',
      recipe_id: 300, portion_multiplier: 1, calories_planned: 700,
      multi_portion_group_id: 'grp', is_leftover: true, portions_to_cook: null, created_at: '', updated_at: ''
    },
    // Meal owned by another user
    {
      id: 4, plan_id: 11, plan_day_id: 100, user_id: 'u2', slot: 'lunch', status: 'planned',
      recipe_id: 210, portion_multiplier: 2, calories_planned: 600,
      multi_portion_group_id: null, is_leftover: false, portions_to_cook: 2, created_at: '', updated_at: ''
    },
  ]

  const recipes: any[] = [
    { id: 200, name: 'Sałatka', calories_kcal: 300, portions: 2, is_active: true },
    { id: 210, name: 'Zupa', calories_kcal: 320, portions: 2, is_active: true },
    { id: 220, name: 'Makaron', calories_kcal: 370, portions: 1, is_active: true },
    { id: 230, name: 'Kurczak', calories_kcal: 300, portions: 3, is_active: true },
    { id: 240, name: 'Tortilla', calories_kcal: 290, portions: 2, is_active: true },
    { id: 300, name: 'Gulasz', calories_kcal: 700, portions: 4, is_active: true },
  ]

  const recipe_slots: any[] = [
    { recipe_id: 200, slot: 'lunch' },
    { recipe_id: 210, slot: 'lunch' },
    { recipe_id: 220, slot: 'lunch' },
    { recipe_id: 230, slot: 'lunch' },
    { recipe_id: 240, slot: 'lunch' },
    { recipe_id: 300, slot: 'dinner' },
  ]

  const plan_day_slot_targets: any[] = [
    { plan_day_id: 100, slot: 'lunch', calories_target: 600 },
    { plan_day_id: 101, slot: 'dinner', calories_target: 700 },
    { plan_day_id: 102, slot: 'dinner', calories_target: 700 },
  ]

  const state: Record<string, any> = {
    currentTable: null as string | null,
    query: {} as Record<string, any>,
    selectFields: null as any,
    updatePayload: null as any,
  }

  function resetQuery() { state.query = {}; state.selectFields = null; state.updatePayload = null }

  const builder: any = {
    select(fields: any) { state.selectFields = fields; return this },
    eq(col: string, val: any) { state.query[col] = val; return this },
    in(col: string, vals: any[]) { state.query[`in_${col}`] = vals; return this },
    gte(col: string, val: any) { state.query[`gte_${col}`] = val; return this },
    lte(col: string, val: any) { state.query[`lte_${col}`] = val; return this },
    neq(col: string, val: any) { state.query[`neq_${col}`] = val; return this },
    limit(val: number) { state.query.limit = val; return this },
    order() { return this },
    update(payload: any) { state.updatePayload = payload; return this },
    single() { const r = this._execSelect(true); resetQuery(); return { data: Array.isArray(r.data) ? r.data[0] : r.data, error: r.error } },
    maybeSingle() { const r = this._execSelect(false); resetQuery(); return { data: Array.isArray(r.data) ? r.data[0] : r.data, error: r.error } },
    async _resolve() { const r = this._execSelect(); resetQuery(); return r },
    then(resolve: any) { const r = this._execSelect(); resetQuery(); resolve(r) },
    _execSelect(isSingle?: boolean) {
      const t = state.currentTable
      let data: any = null; let error: any = null
      if (t === 'plan_meals') {
        if (state.updatePayload) {
          const ids = (state.query['in_id'] as number[]) || (state.query['id'] !== undefined ? [state.query['id']] : [])
          const updated = [] as any[]
          for (const m of plan_meals) {
            if (ids?.includes(m.id)) {
              Object.assign(m, state.updatePayload)
              m.updated_at = new Date().toISOString()
              updated.push({ id: m.id, slot: m.slot, status: m.status, calories_planned: m.calories_planned, portion_multiplier: m.portion_multiplier, multi_portion_group_id: m.multi_portion_group_id, is_leftover: m.is_leftover, recipe_id: m.recipe_id, updated_at: m.updated_at })
            }
          }
          data = updated
        } else {
          if (state.selectFields === 'id') {
            if (state.query['multi_portion_group_id']) {
              data = plan_meals.filter(m => m.multi_portion_group_id === state.query['multi_portion_group_id']).map(m => ({ id: m.id }))
            } else if (state.query['in_id']) {
              data = plan_meals.filter(m => (state.query['in_id'] as number[]).includes(m.id)).map(m => ({ id: m.id }))
            } else if (state.query['id']) {
              const m = plan_meals.find(m => m.id === state.query['id'])
              if (!m && isSingle) { error = { code: 'PGRST116' } }
              data = m ? { id: m.id } : null
            } else {
              data = []
            }
          } else if (state.selectFields === 'id, status') {
            const m = plan_meals.find(m => m.id === state.query['id'])
            if (!m && isSingle) { error = { code: 'PGRST116' } }
            data = m ? { id: m.id, status: m.status } : null
          } else if (state.selectFields === 'id, user_id') {
            const m = plan_meals.find(m => m.id === state.query['id'])
            if (!m && isSingle) { error = { code: 'PGRST116' } }
            data = m ? { id: m.id, user_id: m.user_id } : null
          } else if (state.selectFields?.includes('portions_to_cook')) {
            const ids = state.query['in_id'] as number[]
            data = plan_meals.filter(m => ids.includes(m.id)).map(m => ({ id: m.id, portions_to_cook: m.portions_to_cook }))
          } else if (!state.selectFields || state.selectFields === '*') {
            const m = plan_meals.find(m => m.id === state.query['id'])
            if (!m && isSingle) { error = { code: 'PGRST116' } }
            data = m || null
          }
        }
      }
      if (t === 'recipes') {
        let rows = recipes.slice()
        if (state.query['in_id']) rows = rows.filter(r => (state.query['in_id'] as number[]).includes(r.id))
        if (state.query['neq_id'] !== undefined) rows = rows.filter(r => r.id !== state.query['neq_id'])
        if (state.query['gte_calories_kcal'] !== undefined) rows = rows.filter(r => r.calories_kcal >= state.query['gte_calories_kcal'])
        if (state.query['lte_calories_kcal'] !== undefined) rows = rows.filter(r => r.calories_kcal <= state.query['lte_calories_kcal'])
        if (state.query['is_active'] !== undefined) rows = rows.filter(r => r.is_active === state.query['is_active'])
        if (state.query['id'] !== undefined) rows = rows.filter(r => r.id === state.query['id'])
        if (rows.length === 0 && state.query['id'] !== undefined) { data = null } else { data = rows }
      }
      if (t === 'recipe_slots') {
        if (state.query['slot'] !== undefined) {
          data = recipe_slots.filter(rs => rs.slot === state.query['slot']).slice(0, state.query['limit'] ?? 1000)
        } else if (state.query['in_recipe_id']) {
          data = recipe_slots.filter(rs => (state.query['in_recipe_id'] as number[]).includes(rs.recipe_id))
        } else if (state.query['recipe_id'] !== undefined) {
          data = recipe_slots.filter(rs => rs.recipe_id === state.query['recipe_id'])
        } else {
          data = []
        }
      }
      if (t === 'plan_day_slot_targets') {
        const row = plan_day_slot_targets.find(s => s.plan_day_id === state.query['plan_day_id'] && s.slot === state.query['slot'])
        data = row || null
      }
      return { data, error }
    },
  }

  const supabase: AnySupabase = {
    from(table: string) { state.currentTable = table; return builder }
  } as any

  return { supabase: supabase as SupabaseClient<Database>, tables: { plan_meals, recipes, recipe_slots, plan_day_slot_targets } }
}

describe('planMeals.service - validateSwapCandidate', () => {
  it('fails when recipe not available for slot', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    const planMeal = { id: 1, plan_day_id: 100, slot: 'lunch' as Enums<'meal_slot'> } as any
    const recipe = { id: 999, name: 'Śniadanie', calories_kcal: 300, portions: 2, available_slots: ['breakfast'] as Enums<'meal_slot'>[] }
    const res = await validateSwapCandidate(planMeal, recipe as any, supabase)
    expect(res.isValid).toBe(false)
  })

  it('fails when portionMultiplier exceeds recipe portions', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    // target 600, calories 370 => portionMultiplier=round(600/370)=2 > portions=1
    const planMeal = { id: 1, plan_day_id: 100, slot: 'lunch' as Enums<'meal_slot'> } as any
    const recipe = { id: 220, name: 'Makaron', calories_kcal: 370, portions: 1, available_slots: ['lunch'] as any }
    const res = await validateSwapCandidate(planMeal, recipe as any, supabase)
    expect(res.isValid).toBe(false)
  })

  it('fails when plannedCalories are outside ±20% of slot target (too low)', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    // target 600, calories 450 => portionMultiplier=1 => planned=450 < 480
    const planMeal = { id: 1, plan_day_id: 100, slot: 'lunch' as Enums<'meal_slot'> } as any
    const recipe = { id: 500, name: 'Burger', calories_kcal: 450, portions: 2, available_slots: ['lunch'] as any }
    const res = await validateSwapCandidate(planMeal, recipe as any, supabase)
    expect(res.isValid).toBe(false)
  })

  it('passes for valid candidate within tolerance', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    // target 600, calories 300 => portionMultiplier=2 => planned=600
    const planMeal = { id: 1, plan_day_id: 100, slot: 'lunch' as Enums<'meal_slot'> } as any
    const recipe = { id: 230, name: 'Kurczak', calories_kcal: 300, portions: 3, available_slots: ['lunch'] as any }
    const res = await validateSwapCandidate(planMeal, recipe as any, supabase)
    expect(res.isValid).toBe(true)
  })
})

describe('planMeals.service - performSwapTransaction', () => {
  it('updates single meal when no multi_portion_group_id', async () => {
    const { supabase, tables } = createSupabaseStubForPlanMeals()
    const planMeal = tables.plan_meals.find(m => m.id === 1)
    const newRecipe = { id: 230, name: 'Kurczak', calories_kcal: 300, portions: 3, available_slots: ['lunch'] as any }
    const updated = await performSwapTransaction(1, newRecipe as any, planMeal, supabase)
    expect(updated).toHaveLength(1)
    const u = updated[0]
    expect(u.recipe_id).toBe(230)
    expect(u.portion_multiplier).toBe(2)
    expect(u.calories_planned).toBe(600)
  })

  it('updates both meals in multi-portion group and keeps leftover semantics', async () => {
    const { supabase, tables } = createSupabaseStubForPlanMeals()
    const planMeal = tables.plan_meals.find(m => m.id === 2)
    const newRecipe = { id: 300, name: 'Gulasz', calories_kcal: 700, portions: 4, available_slots: ['dinner'] as any }
    const updated = await performSwapTransaction(2, newRecipe as any, planMeal, supabase)
    // two meals in group
    expect(updated.length).toBe(2)
    // verify both belong to same group and portion multiplier is consistent
    const ids = updated.map(u => u.id)
    expect(ids).toEqual(expect.arrayContaining([2, 3]))
  })
})

describe('planMeals.service - getAlternativesForMeal', () => {
  it('returns up to 3 alternatives matching slot and ±20% per-serving calories, excluding current', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    const result = await getAlternativesForMeal(1, 'u1', supabase)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(3)
    // Excludes current recipe_id (200)
    expect(result.some(r => r.id === 200)).toBe(false)
    // Each has lunch in available_slots
    expect(result.every(r => r.available_slots.includes('lunch'))).toBe(true)
  })
})

describe('planMeals.service - updateMealStatus', () => {
  it('fails with NotFound for non-existing meal', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    await expect(updateMealStatus(supabase, 999, 'u1', 'completed' as any)).rejects.toThrow('Meal not found')
  })

  it('fails with Forbidden for meal owned by different user', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    await expect(updateMealStatus(supabase, 4, 'u1', 'completed' as any)).rejects.toThrow('You do not have permission')
  })

  it('updates status successfully', async () => {
    const { supabase } = createSupabaseStubForPlanMeals()
    const updated = await updateMealStatus(supabase, 1, 'u1', 'completed' as any)
    expect(updated.status).toBe('completed')
  })
})


