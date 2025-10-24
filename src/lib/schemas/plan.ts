import { z } from 'zod'

/**
 * Validation schema for CreatePlanCommand
 * Validates input parameters for POST /api/plans/generate endpoint
 * 
 * Rules:
 * - daily_calories: 800-6000 kcal per day
 * - plan_length_days: 1-365 days
 * - start_date: ISO 8601 format, must be in the future (not today or past)
 */
export const createPlanCommandSchema = z.object({
  daily_calories: z
    .number()
    .int('daily_calories must be a whole number')
    .min(800, 'daily_calories must be at least 800 kcal')
    .max(6000, 'daily_calories must not exceed 6000 kcal'),

  plan_length_days: z
    .number()
    .int('plan_length_days must be a whole number')
    .min(1, 'plan_length_days must be at least 1 day')
    .max(365, 'plan_length_days must not exceed 365 days'),

  start_date: z
    .string()
    .refine(
      (date) => {
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      'start_date must be a valid ISO 8601 date (YYYY-MM-DD)'
    )
    .refine(
      (date) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        return startDate > today
      },
      'start_date must be in the future (tomorrow or later)'
    )
}).strict()

export type CreatePlanCommand = z.infer<typeof createPlanCommandSchema>

/**
 * Validation schema for getting plan by ID
 * Validates URL parameter for GET /api/plans/{id} endpoint
 * 
 * Rules:
 * - id: Must be a valid positive integer
 * - Converts string to number for type safety
 */
export const getPlanIdSchema = z.object({
  id: z
    .string()
    .transform((val) => Number(val))
    .pipe(
      z
        .number()
        .int('Plan ID must be a whole number')
        .positive('Plan ID must be a positive number')
    )
})

export type GetPlanIdInput = z.infer<typeof getPlanIdSchema>

/**
 * Validation schema for UpdatePlanCommand
 * Validates input for PATCH /api/plans/{id} endpoint
 * 
 * Rules:
 * - state: Must be one of the valid plan_state enum values
 */
export const updatePlanCommandSchema = z.object({
  state: z.enum(['active', 'archived', 'cancelled', 'completed'], {
    errorMap: () => ({ message: 'state must be one of: active, archived, cancelled, completed' })
  })
}).strict()

export type UpdatePlanCommand = z.infer<typeof updatePlanCommandSchema>

/**
 * Validation schema for GET /api/plans query parameters
 * Validates pagination and filtering parameters
 * 
 * Rules:
 * - state: optional filter by plan state (null from URLSearchParams is treated as undefined)
 * - limit: 1-50, default 10 (controls results per page)
 * - offset: >=0, default 0 (controls pagination offset)
 */
export const getPlansQuerySchema = z.object({
  state: z.enum(['active', 'archived', 'cancelled']).nullish().transform(val => val ?? undefined),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0)
})

export type GetPlansQuery = z.infer<typeof getPlansQuerySchema>
