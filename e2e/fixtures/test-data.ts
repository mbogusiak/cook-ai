import { addDays, nextMonday, startOfDay } from "date-fns";

/**
 * E2E Test User Credentials
 * Loaded from .env.test file
 * Wrapped in a function to ensure env vars are loaded before access
 */
export function getTestUser() {
  return {
    id: process.env.E2E_USERNAME_ID!,
    email: process.env.E2E_USERNAME!,
    password: process.env.E2E_PASSWORD!,
  };
}

/**
 * Baseline test plan configuration
 * Used for seeding the default 7-day plan
 */
export const BASELINE_PLAN = {
  lengthDays: 7,
  dailyCalories: 2000,
  // Calorie distribution per meal slot (% of daily total)
  calorieDistribution: {
    breakfast: 0.2, // 20% = 400 kcal
    lunch: 0.3, // 30% = 600 kcal
    dinner: 0.3, // 30% = 600 kcal
    snack: 0.2, // 20% = 400 kcal
  },
  // Calorie tolerance for recipe matching (±20%)
  calorieTolerance: 0.2,
} as const;

/**
 * Meal slot types
 */
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/**
 * Meal status types
 */
export const MEAL_STATUSES = ["planned", "completed", "skipped"] as const;
export type MealStatus = (typeof MEAL_STATUSES)[number];

/**
 * Calculate the start date for the baseline plan
 * Default: Next Monday from today
 */
export function getBaselinePlanStartDate(): Date {
  return startOfDay(nextMonday(new Date()));
}

/**
 * Generate all dates for the baseline plan
 */
export function getBaselinePlanDates(): Date[] {
  const startDate = getBaselinePlanStartDate();
  return Array.from({ length: BASELINE_PLAN.lengthDays }, (_, i) => addDays(startDate, i));
}

/**
 * Calculate calorie target for a given meal slot
 */
export function getCalorieTarget(slot: MealSlot): number {
  return Math.round(BASELINE_PLAN.dailyCalories * BASELINE_PLAN.calorieDistribution[slot]);
}

/**
 * Calculate calorie range (min, max) for recipe matching
 * Applies ±20% tolerance to the target
 */
export function getCalorieRange(slot: MealSlot): { min: number; max: number } {
  const target = getCalorieTarget(slot);
  const tolerance = target * BASELINE_PLAN.calorieTolerance;
  return {
    min: Math.round(target - tolerance),
    max: Math.round(target + tolerance),
  };
}

/**
 * Default meal status distribution for baseline plan
 * ~71% planned, 18% completed, 11% skipped
 */
export const BASELINE_MEAL_STATUSES: MealStatus[] = [
  "planned", // Day 1 breakfast
  "planned", // Day 1 lunch
  "planned", // Day 1 dinner
  "planned", // Day 1 snack
  "completed", // Day 2 breakfast
  "planned", // Day 2 lunch (leftover)
  "completed", // Day 2 dinner
  "skipped", // Day 2 snack
  "planned", // Day 3 breakfast
  "planned", // Day 3 lunch
  "planned", // Day 3 dinner
  "planned", // Day 3 snack
  "completed", // Day 4 breakfast
  "planned", // Day 4 lunch
  "completed", // Day 4 dinner (leftover)
  "planned", // Day 4 snack
  "planned", // Day 5 breakfast
  "skipped", // Day 5 lunch
  "completed", // Day 5 dinner
  "skipped", // Day 5 snack
  "planned", // Day 6 breakfast
  "planned", // Day 6 lunch
  "planned", // Day 6 dinner
  "planned", // Day 6 snack
  "planned", // Day 7 breakfast
  "planned", // Day 7 lunch
  "planned", // Day 7 dinner
  "planned", // Day 7 snack
];

/**
 * Multi-portion meal configuration for baseline plan
 * Day 1 lunch and Day 3 dinner will be cooked for 2 portions
 * Day 2 lunch and Day 4 dinner will be leftovers
 */
export const MULTI_PORTION_MEALS = [
  {
    dayIndex: 0, // Day 1
    slot: "lunch" as MealSlot,
    portionsToCook: 2,
    isLeftover: false,
    groupId: "mp-group-1", // Will be replaced with UUID in seed
  },
  {
    dayIndex: 1, // Day 2
    slot: "lunch" as MealSlot,
    portionsToCook: null,
    isLeftover: true,
    groupId: "mp-group-1", // Same group as Day 1 lunch
  },
  {
    dayIndex: 2, // Day 3
    slot: "dinner" as MealSlot,
    portionsToCook: 2,
    isLeftover: false,
    groupId: "mp-group-2", // Will be replaced with UUID in seed
  },
  {
    dayIndex: 3, // Day 4
    slot: "dinner" as MealSlot,
    portionsToCook: null,
    isLeftover: true,
    groupId: "mp-group-2", // Same group as Day 3 dinner
  },
];
