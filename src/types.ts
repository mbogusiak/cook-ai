import type { Tables, Enums } from './db/database.types'

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Generic pagination metadata */
export type PaginationMeta = {
  total: number
  limit: number
  offset: number
  has_more: boolean
}

/** Generic paginated list response wrapper */
export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationMeta
}

// ============================================================================
// RECIPE DTOs
// ============================================================================

/**
 * Recipe response DTO
 * Represents recipe data returned by recipe endpoints
 * Note: available_slots is derived from recipe slot in API (database has single slot)
 */
export type RecipeDTO = {
  id: number
  slug: string
  name: string
  available_slots: Enums<'meal_slot'>[]
  calories_per_serving: number
  servings: number
  time_minutes: number | null
  image_url: string | null
  source_url: string | null
}

/**
 * Recipe details DTO with timestamps and ingredients
 * Extends RecipeDTO with creation/update timestamps and full ingredients list
 */
export type RecipeDetailsDTO = RecipeDTO & {
  ingredients: string[]
  created_at: string
  updated_at: string
}

/**
 * Paginated recipes list response
 * Response wrapper for GET /api/recipes endpoint
 */
export type RecipesListResponse = PaginatedResponse<RecipeDTO>

// ============================================================================
// USER SETTINGS DTOs & COMMANDS
// ============================================================================

/**
 * User settings response DTO
 * Derived from user_settings table
 */
export type UserSettingsDTO = Pick<
  Tables<'user_settings'>,
  'user_id' | 'default_daily_calories' | 'default_plan_length_days' | 'created_at' | 'updated_at'
>

/**
 * Create user settings command
 * Request body for POST /api/user-settings
 */
export type CreateUserSettingsCommand = {
  user_id: string
  default_daily_calories: number
  default_plan_length_days?: number
}

/**
 * Update user settings command
 * Request body for PATCH /api/user-settings (all fields optional for partial updates)
 */
export type UpdateUserSettingsCommand = {
  default_daily_calories?: number
  default_plan_length_days?: number
}

// ============================================================================
// PLAN DTOs & COMMANDS
// ============================================================================

/**
 * Plan response DTO (basic)
 * Represents plan data from GET /api/plans list endpoint
 */
export type PlanDTO = Pick<
  Tables<'plans'>,
  'id' | 'user_id' | 'state' | 'start_date' | 'end_date' | 'daily_calories' | 'created_at' | 'updated_at'
>

/**
 * Paginated plans list response
 * Response wrapper for GET /api/plans endpoint
 */
export type PlansListResponse = PaginatedResponse<PlanDTO>

/**
 * Create plan command
 * Request body for POST /api/plans/generate
 */
export type CreatePlanCommand = {
  daily_calories: number
  plan_length_days: number
  start_date: string
}

/**
 * Update plan command
 * Request body for PATCH /api/plans/{id}
 */
export type UpdatePlanCommand = {
  state: Enums<'plan_state'>
}

// ============================================================================
// PLAN DAY & MEAL NESTED DTOs
// ============================================================================

/**
 * Slot target response DTO
 * Represents calorie targets for specific meal slots
 * Derived from plan_day_slot_targets table
 */
export type SlotTargetResponse = Pick<
  Tables<'plan_day_slot_targets'>,
  'slot' | 'calories_target'
>

/**
 * Recipe data nested within meal response
 * Subset of recipe fields included when meals are returned
 */
export type RecipeInMealResponse = Pick<
  RecipeDTO,
  'id' | 'name' | 'image_url' | 'time_minutes' | 'source_url' | 'available_slots'
>

/**
 * Meal response DTO (nested in plan day)
 * Represents individual meals in a plan day
 * Combines plan_meals table data with nested recipe information
 *
 * v2 Schema Updates:
 * - portion_multiplier: WHOLE NUMBER of portions to eat (e.g., 2, 3, 1) - MUST be integer!
 *   This aligns with PRD requirement ("2 porcje", not "2.4 porcje") and enables fraction display logic ("Ugotuj 1/3")
 * - portions_to_cook: How many portions to prepare. Set for day 1 (cooking), NULL for day 2 (leftovers)
 * - is_leftover: Distinguishes day 1 (cooking, FALSE) from day 2 (leftovers, TRUE)
 * - multi_portion_group_id: Groups consecutive days for multi-portion meals
 */
export type MealResponse = {
  id: number
  slot: Enums<'meal_slot'>
  status: Enums<'meal_status'>
  calories_planned: number
  portion_multiplier: number
  portions_to_cook: number | null
  multi_portion_group_id: string | null
  is_leftover: boolean
  recipe: RecipeInMealResponse
}

/**
 * Plan day response DTO
 * Represents a single day within a plan
 * Combines plan_days table with nested meals and slot targets
 */
export type PlanDayResponse = {
  id: number
  plan_id: number
  date: string
  meals: MealResponse[]
  slot_targets: SlotTargetResponse[]
}

/**
 * Plan details response DTO
 * Extends PlanDTO with nested days and meals
 * Response for GET /api/plans/{id} endpoint
 */
export type PlanDetailsResponse = PlanDTO & {
  days: PlanDayResponse[]
}

// ============================================================================
// MEAL OPERATION DTOs & COMMANDS
// ============================================================================

/**
 * Update meal command
 * Request body for PATCH /api/plan-meals/{id}
 */
export type UpdateMealCommand = {
  status: Enums<'meal_status'>
}

/**
 * Updated meal response DTO
 * Response for PATCH /api/plan-meals/{id}
 * Subset of meal fields returned after status update
 */
export type UpdateMealResponse = {
  id: number
  slot: Enums<'meal_slot'>
  status: Enums<'meal_status'>
  calories_planned: number
  portion_multiplier: number
  portions_to_cook: number | null
  multi_portion_group_id: string | null
  is_leftover: boolean
  recipe_id: number
  updated_at: string
}

/**
 * Alternatives response DTO
 * Response for GET /api/plan-meals/{id}/alternatives
 * Wrapper for list of alternative recipe suggestions
 */
export type AlternativesResponse = {
  data: RecipeDTO[]
}

/**
 * Swap meal command
 * Request body for POST /api/plan-meals/{id}/swap
 */
export type SwapMealCommand = {
  new_recipe_id: number
}

/**
 * Updated meal in swap response
 * Represents a single meal after swap operation
 */
export type UpdatedMealInSwap = {
  id: number
  slot: Enums<'meal_slot'>
  status: Enums<'meal_status'>
  calories_planned: number
  portion_multiplier: number
  portions_to_cook: number | null
  multi_portion_group_id: string | null
  is_leftover: boolean
  recipe_id: number
}

/**
 * Swap meal response DTO
 * Response for POST /api/plan-meals/{id}/swap
 * Contains updated meals after swap operation
 */
export type SwapMealResponse = {
  updated_meals: UpdatedMealInSwap[]
}
