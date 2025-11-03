 import { describe, it, expect } from 'vitest'
 import type { SupabaseClient } from '@supabase/supabase-js'
 import type { Database, Enums } from '../../db/database.types'
import { generatePlan, getPlans, getPlanDetailsWithMeals } from './plans.service'

 type AnySupabase = SupabaseClient<Database> & Record<string, any>

 function createSupabaseStubForGeneratePlan(options?: {
   recipes?: Array<{ id: number; name: string; calories_kcal: number; portions: number; slots: Enums<'meal_slot'>[] }>
 }) {
   const recipes = options?.recipes ?? [
     { id: 101, name: 'Owsianka', calories_kcal: 500, portions: 1, slots: ['breakfast'] },
     { id: 201, name: 'Kurczak lunch', calories_kcal: 700, portions: 2, slots: ['lunch'] },
     { id: 301, name: 'Makaron dinner', calories_kcal: 700, portions: 2, slots: ['dinner'] },
     { id: 401, name: 'Jabłko', calories_kcal: 100, portions: 1, slots: ['snack'] }
   ]

   const inserted: Record<string, any[]> = {
     plans: [],
     plan_days: [],
     plan_day_slot_targets: [],
     plan_meals: []
   }

   const state: Record<string, any> = {
     currentTable: null as null | string,
     selectFields: null as any,
     query: {} as Record<string, any>,
   }

   function resetQuery() {
     state.selectFields = null
     state.query = {}
   }

  const builder: any = {
    // Make query builder awaitable: awaiting returns current select result
    then(resolve: any) {
      const res = (this as any)._execSelect()
      resetQuery()
      resolve({ data: res.data, error: res.error, count: res.count ?? null })
    },
     select(fields: any, opts?: any) {
       state.selectFields = fields
       state.query.count = opts?.count
       return this
     },
     eq(col: string, val: any) {
       state.query[col] = val
       return this
     },
     in(col: string, vals: any[]) {
       state.query[`in_${col}`] = vals
       return this
     },
     gte(col: string, val: any) {
       state.query[`gte_${col}`] = val
       return this
     },
     lte(col: string, val: any) {
       state.query[`lte_${col}`] = val
       return this
     },
     limit(val: number) {
       state.query.limit = val
       return this
     },
     order() { return this },
     range(offset: number, end: number) {
       state.query.range = [offset, end]
       return this
     },
     single() {
       const res = this._execSelect()
       resetQuery()
       return { data: res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null, error: res.error }
     },
     maybeSingle() {
       const res = this._execSelect()
       resetQuery()
       return { data: res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null, error: res.error }
     },
     _execSelect() {
       const table = state.currentTable
       let data: any = null
       let count: number | null = null
       if (table === 'plans') {
         if (state.selectFields === 'id') {
           // checkExistingActivePlan path
           data = []
         } else if (state.selectFields === '*' && state.query.count === 'exact') {
           // getPlans listing
           const total = 3
           const items = [
             { id: 1, state: 'active', created_at: '2025-01-01' },
             { id: 2, state: 'archived', created_at: '2024-12-01' },
             { id: 3, state: 'cancelled', created_at: '2024-11-01' },
           ]
           const filtered = state.query.state ? items.filter(i => i.state === state.query.state) : items
           const [from, to] = state.query.range ?? [0, filtered.length - 1]
           data = filtered.slice(from, to + 1)
           count = filtered.length
         } else if (state.selectFields === 'state') {
           // has_active_plan check
           data = [{ state: 'active' }]
         }
       }
       if (table === 'recipes') {
         const min = state.query['gte_calories_kcal'] ?? -Infinity
         const max = state.query['lte_calories_kcal'] ?? Infinity
         const pool = recipes.filter(r => r.calories_kcal >= min && r.calories_kcal <= max)
         data = pool.map(r => ({ id: r.id, name: r.name, calories_kcal: r.calories_kcal, portions: r.portions }))
       }
     if (table === 'recipe_slots') {
         if (state.query.slot && state.query['in_recipe_id']) {
           const rows: any[] = []
           for (const id of state.query['in_recipe_id'] as number[]) {
             const rec = recipes.find(r => r.id === id)
             if (rec && rec.slots.includes(state.query.slot)) {
               rows.push({ recipe_id: id })
             }
           }
           data = rows
         } else if (state.query.slot) {
           const rows: any[] = []
           for (const rec of recipes) {
             if (rec.slots.includes(state.query.slot)) rows.push({ recipe_id: rec.id })
           }
           data = rows
         }
       }
       return { data, error: null, count }
     },
     insert(rows: any) {
       const table = state.currentTable!
       if (table === 'plans') {
         const row = { id: 100, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...rows }
         inserted.plans.push(row)
         resetQuery()
         return {
           select: () => ({ single: () => ({ data: row, error: null }) })
         }
       }
       if (table === 'plan_days') {
         const withIds = rows.map((r: any, idx: number) => ({ id: 1000 + idx, ...r }))
         inserted.plan_days.push(...withIds)
         resetQuery()
         return { select: () => ({ data: withIds, error: null }) }
       }
       if (table === 'plan_day_slot_targets') {
         inserted.plan_day_slot_targets.push(...rows)
         resetQuery()
         return { error: null }
       }
       if (table === 'plan_meals') {
         inserted.plan_meals.push(...rows)
         resetQuery()
         return { error: null }
       }
       resetQuery()
       return { error: null }
     }
   }

   const supabase: AnySupabase = {
     from(table: string) {
       state.currentTable = table
       return builder
     }
   } as any

   return { supabase: supabase as SupabaseClient<Database>, inserted, recipes }
 }

 describe('plans.service - generatePlan core (indirect helper checks)', () => {
   it('sets correct end_date and creates slot targets with 25/35/35/5 distribution', async () => {
     const { supabase, inserted } = createSupabaseStubForGeneratePlan()
     const userId = 'user_1'
     const command = {
       daily_calories: 2000,
       plan_length_days: 3,
       start_date: '2025-01-10'
     }

     const plan = await generatePlan(supabase, userId, command as any)

     expect(plan.end_date).toBe('2025-01-12')

     // Check slot targets for first day
     const firstDayId = inserted.plan_days[0].id
     const day1Targets = inserted.plan_day_slot_targets.filter(r => r.plan_day_id === firstDayId)
     const map = new Map(day1Targets.map((r: any) => [r.slot, r.calories_target]))
     expect(map.get('breakfast')).toBe(500)
     expect(map.get('lunch')).toBe(700)
     expect(map.get('dinner')).toBe(700)
     expect(map.get('snack')).toBe(100)

     // Created days length equals plan_length_days
     expect(inserted.plan_days).toHaveLength(3)
   })

   it('creates multi-portion pair for lunch/dinner with consistent multiplier and calories', async () => {
     const { supabase, inserted } = createSupabaseStubForGeneratePlan()
     const userId = 'user_2'
     const command = {
       daily_calories: 2000,
       plan_length_days: 3,
       start_date: '2025-02-01'
     }

     await generatePlan(supabase, userId, command as any)

     const meals = inserted.plan_meals
     // find a multi-portion group
     const groupId = meals.find((m: any) => m.multi_portion_group_id)?.multi_portion_group_id
     expect(groupId).toBeTruthy()
     const groupMeals = meals.filter((m: any) => m.multi_portion_group_id === groupId)
     expect(groupMeals).toHaveLength(2)
     const day1 = groupMeals.find((m: any) => m.is_leftover === false)!
     const day2 = groupMeals.find((m: any) => m.is_leftover === true)!
     expect(day1.portion_multiplier).toBe(day2.portion_multiplier)
     expect(day1.calories_planned).toBe(day2.calories_planned)
     expect(day1.portions_to_cook).toBeTruthy()
     expect(day2.portions_to_cook).toBeNull()
   })
 })

 describe('plans.service - getPlans pagination meta', () => {
   it('returns total and has_more flags correctly', async () => {
     const { supabase } = createSupabaseStubForGeneratePlan()
     const userId = 'user_3'
     const res = await getPlans(supabase, userId, { state: undefined, limit: 2, offset: 0 })
     expect(res.pagination.total).toBe(3)
     expect(res.pagination.has_more).toBe(true)
     expect(res.data.length).toBe(2)
     // next page
     const res2 = await getPlans(supabase, userId, { state: undefined, limit: 2, offset: 2 })
     expect(res2.pagination.has_more).toBe(false)
   })
 })

describe('plans.service - selection fallback (±20% → ±30%)', () => {
  it('escalates calorie margin when no recipes in ±20%', async () => {
    const fallbackRecipes = [
      // breakfast target 500 → ±20% [400-600], ±30% [350-650]
      { id: 10, name: 'Śniadanie 650', calories_kcal: 650, portions: 1, slots: ['breakfast'] as Enums<'meal_slot'>[] },
      // lunch target 700 → ±20% [560-840], ±30% [490-910]
      { id: 20, name: 'Lunch 900', calories_kcal: 900, portions: 2, slots: ['lunch'] as Enums<'meal_slot'>[] },
      // dinner target 700 → allow 910 (upper bound of ±30)
      { id: 30, name: 'Obiad 910', calories_kcal: 910, portions: 2, slots: ['dinner'] as Enums<'meal_slot'>[] },
      // snack target 100 → ±20% [80-120], ±30% [70-130]
      { id: 40, name: 'Przekąska 130', calories_kcal: 130, portions: 1, slots: ['snack'] as Enums<'meal_slot'>[] },
    ]
    const { supabase } = createSupabaseStubForGeneratePlan({ recipes: fallbackRecipes as any })
    const userId = 'user_fallback'
    const command = {
      daily_calories: 2000,
      plan_length_days: 1,
      start_date: '2025-03-01'
    }

    await expect(generatePlan(supabase, userId, command as any)).resolves.toBeTruthy()
  })
})

describe('plans.service - getPlanDetailsWithMeals mapping', () => {
  it('maps nested days, meals, recipes and available_slots', async () => {
    // ad-hoc stub tailored for this test
    const planId = 555
    const userId = 'user_map'
    const dayIds = [9001, 9002]
    const recipeId = 777
    const supabase: any = {
      from(table: string) {
        const api: any = {
          select(fields: any) {
            api._fields = fields
            return api
          },
          eq(col: string, val: any) {
            api._eq = api._eq || {}
            api._eq[col] = val
            return api
          },
          order() { return api },
          in(col: string, vals: any[]) {
            api._in = { col, vals }
            return api
          },
          single() {
            if (table === 'plans') {
              if (api._eq?.id === planId && api._eq?.user_id === userId) {
                return { data: { id: planId, user_id: userId, state: 'active', start_date: '2025-01-10', end_date: '2025-01-12', daily_calories: 2000, created_at: '', updated_at: '' }, error: null }
              }
              return { data: null, error: { code: 'PGRST116' } }
            }
            return { data: null, error: null }
          },
          _makeDays() {
            return dayIds.map((id, i) => ({ id, plan_id: planId, date: `2025-01-1${0 + i}` }))
          },
          _makeTargets() {
            return dayIds.flatMap(id => ([
              { plan_day_id: id, slot: 'breakfast', calories_target: 500 },
              { plan_day_id: id, slot: 'lunch', calories_target: 700 },
              { plan_day_id: id, slot: 'dinner', calories_target: 700 },
              { plan_day_id: id, slot: 'snack', calories_target: 100 },
            ]))
          },
          _makeMeals() {
            return [
              { id: 1, slot: 'lunch', status: 'planned', calories_planned: 700, portion_multiplier: 2, portions_to_cook: 4, multi_portion_group_id: 'grp', is_leftover: false, plan_day_id: dayIds[0], recipe_id: recipeId,
                recipes: { id: recipeId, name: 'Kurczak', image_url: null, prep_minutes: 10, cook_minutes: 20, source_url: 'https://example.com' } },
              { id: 2, slot: 'lunch', status: 'planned', calories_planned: 700, portion_multiplier: 2, portions_to_cook: null, multi_portion_group_id: 'grp', is_leftover: true, plan_day_id: dayIds[1], recipe_id: recipeId,
                recipes: { id: recipeId, name: 'Kurczak', image_url: null, prep_minutes: 10, cook_minutes: 20, source_url: 'https://example.com' } },
            ]
          },
          _makeRecipeSlots() {
            return [{ recipe_id: recipeId, slot: 'lunch' }, { recipe_id: recipeId, slot: 'dinner' }]
          },
          async maybeSingle() { return { data: null, error: null } },
          async _resolve() {
            if (table === 'plan_days') return { data: api._makeDays(), error: null }
            if (table === 'plan_day_slot_targets') return { data: api._makeTargets(), error: null }
            if (table === 'plan_meals') return { data: api._makeMeals(), error: null }
            if (table === 'recipe_slots') return { data: api._makeRecipeSlots(), error: null }
            return { data: null, error: null }
          },
          // Make the builder awaitable for select chains
          then(resolve: any) {
            api._resolve().then(resolve)
          },
          async orderAndReturn() { return api._resolve() },
          async order() { return api },
        }
        return api
      }
    }

    // Monkeypatch minimal methods used by service
    ;(supabase.from('plan_days') as any).order = () => (supabase.from('plan_days') as any)
    ;(supabase.from('plan_meals') as any).order = () => (supabase.from('plan_meals') as any)

    const result = await getPlanDetailsWithMeals(supabase, planId, userId)
    expect(result).toBeTruthy()
    expect(result!.days).toHaveLength(2)
    const d0 = result!.days[0]
    expect(d0.meals).toHaveLength(1)
    const meal0 = d0.meals[0]
    expect(meal0.portion_multiplier).toBe(2)
    expect(meal0.portions_to_cook).toBe(4)
    expect(meal0.recipe.available_slots).toContain('lunch')
  })
})


