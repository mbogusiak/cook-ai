import { describe, it, expect } from 'vitest'
import { transformToPlanOverview, transformToDay, transformToMealMiniature } from './transforms'

describe('planOverview transforms', () => {
  it('transformToPlanOverview maps state, counts completion and percentages', () => {
    const data: any = {
      id: 1,
      user_id: 'u1',
      state: 'archived', // should map to completed in UI
      start_date: '2025-01-13',
      end_date: '2025-01-19',
      daily_calories: 2000,
      created_at: '',
      updated_at: '',
      days: [
        {
          id: 10,
          plan_id: 1,
          date: '2025-01-13',
          meals: [
            { id: 100, slot: 'breakfast', status: 'completed', calories_planned: 500, portion_multiplier: 1, portions_to_cook: 1, multi_portion_group_id: null, is_leftover: false, recipe: { id: 1, name: 'A', image_url: null, time_minutes: 10, source_url: '', available_slots: ['breakfast'] } },
            { id: 101, slot: 'lunch', status: 'completed', calories_planned: 700, portion_multiplier: 1, portions_to_cook: 2, multi_portion_group_id: 'grp', is_leftover: false, recipe: { id: 2, name: 'B', image_url: null, time_minutes: 20, source_url: '', available_slots: ['lunch'] } },
          ],
          slot_targets: []
        },
        {
          id: 11,
          plan_id: 1,
          date: '2025-01-14',
          meals: [
            { id: 102, slot: 'dinner', status: 'completed', calories_planned: 700, portion_multiplier: 1, portions_to_cook: null, multi_portion_group_id: 'grp', is_leftover: true, recipe: { id: 2, name: 'B', image_url: null, time_minutes: 20, source_url: '', available_slots: ['dinner'] } },
            { id: 103, slot: 'snack', status: 'planned', calories_planned: 100, portion_multiplier: 1, portions_to_cook: 1, multi_portion_group_id: null, is_leftover: false, recipe: { id: 3, name: 'C', image_url: null, time_minutes: 5, source_url: '', available_slots: ['snack'] } },
          ],
          slot_targets: []
        },
      ]
    }

    const vm = transformToPlanOverview(data)
    expect(vm.state).toBe('completed') // archived -> completed
    expect(vm.totalMeals).toBe(4)
    expect(vm.completedMeals).toBe(3)
    expect(vm.completionPercentage).toBe(75)
  })

  it('transformToDay computes completionStatus and rounds total calories', () => {
    const day: any = {
      id: 10,
      plan_id: 1,
      date: '2025-01-13',
      meals: [
        { id: 1, slot: 'breakfast', status: 'completed', calories_planned: 499.6, portion_multiplier: 1, portions_to_cook: 1, multi_portion_group_id: null, is_leftover: false, recipe: { id: 1, name: 'A', image_url: null, time_minutes: 0, source_url: '', available_slots: ['breakfast'] } },
        { id: 2, slot: 'lunch', status: 'planned', calories_planned: 700.4, portion_multiplier: 1, portions_to_cook: 2, multi_portion_group_id: null, is_leftover: false, recipe: { id: 2, name: 'B', image_url: null, time_minutes: 0, source_url: '', available_slots: ['lunch'] } },
      ]
    }

    const vm = transformToDay(day)
    expect(vm.totalCalories).toBe(1200) // 499.6 + 700.4 -> 1200 rounded
    expect(vm.completionStatus).toBe('partial')
  })

  it('transformToMealMiniature sets correct multi-portion badge text', () => {
    const cookDay: any = {
      id: 1, slot: 'lunch', status: 'planned', calories_planned: 700, portion_multiplier: 1, portions_to_cook: 2, multi_portion_group_id: 'grp', is_leftover: false,
      recipe: { id: 1, name: 'X', image_url: null, time_minutes: 0, source_url: '', available_slots: ['lunch'] }
    }
    const leftoverDay: any = {
      id: 2, slot: 'lunch', status: 'planned', calories_planned: 700, portion_multiplier: 1, portions_to_cook: null, multi_portion_group_id: 'grp', is_leftover: true,
      recipe: { id: 1, name: 'X', image_url: null, time_minutes: 0, source_url: '', available_slots: ['lunch'] }
    }
    const single: any = {
      id: 3, slot: 'snack', status: 'planned', calories_planned: 100, portion_multiplier: 1, portions_to_cook: 1, multi_portion_group_id: null, is_leftover: false,
      recipe: { id: 3, name: 'Y', image_url: null, time_minutes: 0, source_url: '', available_slots: ['snack'] }
    }

    const vmCook = transformToMealMiniature(cookDay)
    expect(vmCook.portionsToShow).toBe('Ugotuj na 2 dni')

    const vmLeftover = transformToMealMiniature(leftoverDay)
    expect(vmLeftover.portionsToShow).toBe('Resztki')

    const vmSingle = transformToMealMiniature(single)
    expect(vmSingle.portionsToShow).toBeNull()
  })
})



