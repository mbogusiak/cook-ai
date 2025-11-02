import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PlanDayViewModel, MealViewModel, MealSlotViewModel } from './types';
import type { PlanDayDTO, DayMealDTO } from '@/lib/services/planDays.service';
import type { Enums } from '@/db/database.types';
import type { RecipeDTO } from '@/types';

// Transformation function
const transformToPlanDayViewModel = (dto: PlanDayDTO): PlanDayViewModel => {
    const slots: Record<Enums<'meal_slot'>, MealSlotViewModel> = {
        breakfast: { slot: 'breakfast', targetCalories: 0, meal: null },
        lunch: { slot: 'lunch', targetCalories: 0, meal: null },
        dinner: { slot: 'dinner', targetCalories: 0, meal: null },
        snack: { slot: 'snack', targetCalories: 0, meal: null },
    };

    dto.meals.forEach((mealDto: DayMealDTO) => {
        const meal: MealViewModel = {
            id: mealDto.id,
            status: mealDto.status,
            slot: mealDto.slot,
            recipeId: mealDto.recipe_id,
            name: mealDto.name,
            imageUrl: mealDto.image_url,
            timeMinutes: mealDto.time_minutes,
            caloriesPlanned: mealDto.calories_planned,
            servings: mealDto.servings,
            cookidoUrl: mealDto.cookido_url,
            ingredients: mealDto.ingredients,
            preparation: mealDto.preparation,
            isMultiPortionCookDay: mealDto.is_multi_portion_cook_day,
            isMultiPortionLeftoverDay: mealDto.is_multi_portion_leftover_day,
            multiPortionText: mealDto.multi_portion_text,
        };
        if (slots[mealDto.slot]) {
            slots[mealDto.slot].meal = meal;
        }
    });

    dto.slot_targets.forEach(target => {
        if (slots[target.slot]) {
            slots[target.slot].targetCalories = target.calories_target;
        }
    });

    const date = new Date(dto.date);

    return {
        date: dto.date,
        formattedDate: date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }),
        dayOfWeek: date.toLocaleDateString('pl-PL', { weekday: 'long' }),
        planId: dto.plan_id,
        planStartDate: dto.plan_start_date,
        planEndDate: dto.plan_end_date,
        slots: slots,
    };
};

export const usePlanDayQuery = (planId: number, date: string) => {
    return useQuery({
        queryKey: ['planDay', planId, date],
        queryFn: async () => {
            const response = await fetch(`/api/plans/${planId}/days/${date}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch plan day');
            }
            const result = await response.json();
            const data = result.data as PlanDayDTO;
            if (!data) {
                throw new Error('Plan day not found');
            }
            return transformToPlanDayViewModel(data);
        },
        enabled: !!planId && !!date,
    });
};

export const useUpdateMealStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ mealId, status }: { mealId: number; status: Enums<'meal_status'> }) => {
            const response = await fetch(`/api/plan-meals/${mealId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update meal status');
            }

            const result = await response.json();
            return result.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['planDay'] });
        },
    });
};

export const useMealAlternativesQuery = (mealId: number | null) => {
    return useQuery({
        queryKey: ['mealAlternatives', mealId],
        queryFn: async (): Promise<RecipeDTO[]> => {
            if (!mealId) return [];
            const response = await fetch(`/api/plan-meals/${mealId}/alternatives`);
            if (!response.ok) {
                throw new Error('Failed to fetch meal alternatives');
            }
            const data = await response.json();
            return data.data || [];
        },
        enabled: !!mealId,
    });
};

export const useSwapMeal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ mealId, alternativeRecipeId }: { mealId: number; alternativeRecipeId: number }) => {
            const response = await fetch(`/api/plan-meals/${mealId}/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    new_recipe_id: alternativeRecipeId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to swap meal');
            }

            const data = await response.json();
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDay'] });
        },
    });
};