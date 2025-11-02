import type { APIRoute } from 'astro'
import { z } from 'zod'
import { planMealIdSchema } from '@/lib/schemas/planMeal'
import { updateMealStatus } from '@/lib/services/planMeals.service'
import { NotFoundError, ForbiddenError, ServerError, ValidationError } from '@/lib/errors'
import type { UpdateMealResponse } from '@/types'

export const prerender = false

// Validation schema for PATCH request body
const updateMealCommandSchema = z.object({
  status: z.enum(['planned', 'completed', 'skipped']).describe('New meal status')
})

/**
 * PATCH /api/plan-meals/{id}
 * 
 * Updates the status of a specific meal in a plan.
 * 
 * Note: user_id is automatically taken from the authenticated session
 * 
 * Path Parameters:
 * - id: Plan meal ID (positive integer)
 * 
 * Request Body:
 * {
 *   "status": "planned" | "completed" | "skipped"
 * }
 * 
 * Success Response: 200 OK
 * {
 *   "data": {
 *     "id": 123,
 *     "slot": "lunch",
 *     "status": "completed",
 *     "calories_planned": 650,
 *     "portion_multiplier": 1.2,
 *     "portions_to_cook": 4,
 *     "multi_portion_group_id": "uuid-here" | null,
 *     "is_leftover": false,
 *     "recipe_id": 456,
 *     "updated_at": "2024-01-15T12:00:00Z"
 *   }
 * }
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid input data or validation failure
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: User doesn't own the meal
 * - 404 Not Found: Meal not found
 * - 500 Internal Server Error: Unexpected server error
 */
export const PATCH: APIRoute = async (context) => {
  try {
    // Step 1: Validate plan meal ID parameter
    const validationResult = planMealIdSchema.safeParse({
      id: context.params.id
    })

    if (!validationResult.success) {
      console.error('[PATCH /api/plan-meals/:id] Validation error:', {
        input: context.params.id,
        errors: validationResult.error.errors
      })

      return new Response(
        JSON.stringify({ error: 'Invalid plan meal ID format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const mealId = validationResult.data.id

    // Step 2: Check authentication
    const user = context.locals.user
    if (!user || !user.id) {
      console.warn('[PATCH /api/plan-meals/:id] User not authenticated', {
        mealId
      })

      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 3: Parse and validate request body
    let requestBody: unknown
    try {
      const bodyText = await context.request.text()
      if (!bodyText) {
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      requestBody = JSON.parse(bodyText)
    } catch (error) {
      console.warn('[PATCH /api/plan-meals/:id] Invalid JSON in request body', {
        mealId,
        error: error instanceof Error ? error.message : String(error)
      })

      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate command schema
    const commandResult = updateMealCommandSchema.safeParse(requestBody)
    if (!commandResult.success) {
      console.warn('[PATCH /api/plan-meals/:id] Validation failed', {
        mealId,
        errors: commandResult.error.errors
      })

      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const command = commandResult.data

    // Step 4: Update meal status
    try {
      const updatedMeal = await updateMealStatus(
        context.locals.supabase,
        mealId,
        user.id,
        command.status
      )

      console.info('[PATCH /api/plan-meals/:id] Meal updated successfully', {
        mealId,
        newStatus: command.status
      })

      // Fetch full meal data for response
      const { data: fullMeal, error: fetchError } = await context.locals.supabase
        .from('plan_meals')
        .select('id, slot, status, calories_planned, portion_multiplier, portions_to_cook, multi_portion_group_id, is_leftover, recipe_id, updated_at')
        .eq('id', mealId)
        .single()

      if (fetchError || !fullMeal) {
        // Return minimal response if full fetch fails
        return new Response(
          JSON.stringify({
            data: {
              id: updatedMeal.id,
              status: updatedMeal.status
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      const response: UpdateMealResponse = {
        id: fullMeal.id,
        slot: fullMeal.slot,
        status: fullMeal.status,
        calories_planned: fullMeal.calories_planned,
        portion_multiplier: fullMeal.portion_multiplier,
        portions_to_cook: fullMeal.portions_to_cook,
        multi_portion_group_id: fullMeal.multi_portion_group_id,
        is_leftover: fullMeal.is_leftover,
        recipe_id: fullMeal.recipe_id,
        updated_at: fullMeal.updated_at
      }

      return new Response(
        JSON.stringify({ data: response }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      // Handle specific application errors
      if (error instanceof NotFoundError) {
        console.warn('[PATCH /api/plan-meals/:id] Meal not found', {
          mealId
        })

        return new Response(
          JSON.stringify({ error: 'Meal not found' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      if (error instanceof ForbiddenError) {
        console.warn('[PATCH /api/plan-meals/:id] Forbidden access', {
          mealId
        })

        return new Response(
          JSON.stringify({ error: 'You do not have permission to update this meal' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      throw error
    }
  } catch (error) {
    // Log full error for debugging
    console.error('[PATCH /api/plan-meals/:id] Internal error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: context.params
    })

    // Generic error response
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

