/**
 * Transform functions for converting API responses to ViewModels
 */

import type { PlanDetailsResponse, PlanDayResponse, MealResponse } from "@/types";
import type { PlanOverviewViewModel, DayViewModel, MealMiniatureViewModel, CompletionStatus } from "./types";
import { getDayOfWeek, formatDate } from "./dateUtils";

/**
 * Transforms PlanDetailsResponse from API to PlanOverviewViewModel
 */
export function transformToPlanOverview(data: PlanDetailsResponse): PlanOverviewViewModel {
  const allMeals = data.days.flatMap((day) => day.meals);
  const completedMeals = allMeals.filter((m) => m.status === "completed");

  // Map database state 'archived' to UI state 'completed'
  const state = data.state === "archived" ? "completed" : data.state;

  return {
    id: data.id,
    state: state as "active" | "completed" | "cancelled",
    startDate: data.start_date,
    endDate: data.end_date,
    totalDays: data.days.length,
    completionPercentage: allMeals.length > 0 ? Math.round((completedMeals.length / allMeals.length) * 100) : 0,
    totalMeals: allMeals.length,
    completedMeals: completedMeals.length,
    days: data.days.map(transformToDay),
  };
}

/**
 * Transforms PlanDayResponse to DayViewModel
 */
export function transformToDay(day: PlanDayResponse): DayViewModel {
  const completedCount = day.meals.filter((m) => m.status === "completed").length;
  const totalCount = day.meals.length;

  let completionStatus: CompletionStatus;
  if (completedCount === 0) {
    completionStatus = "none";
  } else if (completedCount === totalCount) {
    completionStatus = "all-completed";
  } else {
    completionStatus = "partial";
  }

  // Calculate total calories for the day
  const totalCalories = day.meals.reduce((sum, meal) => sum + meal.calories_planned, 0);

  return {
    id: day.id,
    date: day.date,
    dayOfWeek: getDayOfWeek(day.date),
    formattedDate: formatDate(day.date),
    totalCalories: Math.round(totalCalories),
    meals: day.meals.map(transformToMealMiniature),
    completionStatus,
  };
}

/**
 * Transforms MealResponse to MealMiniatureViewModel
 */
export function transformToMealMiniature(meal: MealResponse): MealMiniatureViewModel {
  let portionsToShow: string | null = null;

  // Multi-portion meals ALWAYS span exactly 2 days (per PRD requirement)
  // Check if this is a multi-portion meal (first day - cooking day)
  if (meal.multi_portion_group_id !== null && !meal.is_leftover) {
    portionsToShow = "Ugotuj na 2 dni";
  }
  // If this is the leftover day (second day)
  else if (meal.is_leftover) {
    portionsToShow = "Resztki";
  }

  return {
    id: meal.id,
    slot: meal.slot,
    status: meal.status,
    recipeName: meal.recipe.name,
    recipeImage: meal.recipe.image_url,
    caloriesPlanned: Math.round(meal.calories_planned),
    isLeftover: meal.is_leftover,
    portionsToShow,
  };
}
