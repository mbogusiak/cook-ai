import type { APIRoute } from 'astro'
import { z } from 'zod'
import { swapMealCommandSchema, planMealIdSchema } from '../../../../lib/schemas/planMeal'
import {
  getPlanMealById,
  getRecipeById,
  validateSwapCandidate,
  performSwapTransaction
} from '../../../../lib/services/planMeals.service'
import { ServerError } from '../../../../lib/errors'
import type { SwapMealResponse } from '../../../../types'

export const prerender = false

/**
 * POST /api/plan-meals/{id}/swap
 * 
 * Swaps the recipe assigned to a specific meal in a plan.
 * Can update single meal or all meals in a multi-portion group.
 * 
 * TEMPORARY: No session authentication (will be added in separate step)
 * 
 * Request Body:
 * {
 *   "new_recipe_id": number
 * }
 * 
 * Success Response: 200 OK
 * {
 *   "updated_meals": [
 *     {
 *       "id": 123,
 *       "slot": "lunch",
 *       "status": "planned",
 *       "calories_planned": 650,
 *       "portion_multiplier": 1.2,
 *       "portions_to_cook": 4,
 *       "multi_portion_group_id": "uuid-here" | null,
 *       "is_leftover": false,
 *       "recipe_id": 456
 *     }
 *   ]
 * }
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid input data, validation failure, or business rule violation
 * - 401 Unauthorized: No valid session (when auth is implemented)
 * - 403 Forbidden: User doesn't own the meal
 * - 404 Not Found: Meal or recipe not found
 * - 500 Internal Server Error: Unexpected server error
 * 
 * @param context - Astro context with request, locals, params, and URL data
 * @returns JSON response with updated meals or error details
 */
export const POST: APIRoute = async (context) => {
  const startTime = Date.now()
  let requestBody: unknown = null
  let planMealId: number | undefined

  try {
    // =========================================================================
    // STEP 1: Get Supabase Client
    // =========================================================================

    const supabase = context.locals.supabase
    if (!supabase) {
      console.error('[POST /api/plan-meals/{id}/swap] Supabase client not available in context')

      return new Response(
        JSON.stringify({
          error: 'Database connection not available'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // =========================================================================
    // STEP 2: Validate Plan Meal ID from URL Parameter
    // =========================================================================

    try {
      const idParam = context.params.id
      const validatedId = planMealIdSchema.parse({ id: idParam })
      planMealId = validatedId.id
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0]
        const errorMessage = firstIssue?.message || 'Invalid plan meal ID'

        console.warn('[POST /api/plan-meals/{id}/swap] Invalid ID parameter', {
          id: context.params.id,
          error: errorMessage,
          issues: error.issues
        })

        return new Response(
          JSON.stringify({
            error: errorMessage
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      throw error
    }

    // =========================================================================
    // STEP 3: Parse and Validate Request Body
    // =========================================================================

    try {
      const bodyText = await context.request.text()

      if (!bodyText) {
        console.warn('[POST /api/plan-meals/{id}/swap] Empty request body', {
          planMealId
        })

        return new Response(
          JSON.stringify({
            error: 'Request body is empty'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      requestBody = JSON.parse(bodyText)
    } catch (error) {
      console.warn('[POST /api/plan-meals/{id}/swap] Invalid JSON in request body', {
        planMealId,
        error: error instanceof Error ? error.message : String(error)
      })

      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate command schema
    let command
    try {
      command = swapMealCommandSchema.parse(requestBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0]
        const errorMessage = firstIssue?.message || 'Invalid request body'

        console.warn('[POST /api/plan-meals/{id}/swap] Validation failed', {
          planMealId,
          error: errorMessage,
          issues: error.issues
        })

        return new Response(
          JSON.stringify({
            error: errorMessage
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      throw error
    }

    // =========================================================================
    // STEP 4: Fetch Plan Meal and Verify Existence
    // =========================================================================

    console.info('[POST /api/plan-meals/{id}/swap] Fetching plan meal', {
      planMealId,
      newRecipeId: command.new_recipe_id
    })

    const planMeal = await getPlanMealById(planMealId, supabase)

    if (!planMeal) {
      console.warn('[POST /api/plan-meals/{id}/swap] Plan meal not found', {
        planMealId
      })

      return new Response(
        JSON.stringify({
          error: 'Plan meal not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // TODO: Add authorization check when session auth is implemented
    // if (planMeal.user_id !== session.user.id) {
    //   return 403 Forbidden
    // }

    // =========================================================================
    // STEP 5: Fetch New Recipe and Verify Existence
    // =========================================================================

    const newRecipe = await getRecipeById(command.new_recipe_id, supabase)

    if (!newRecipe) {
      console.warn('[POST /api/plan-meals/{id}/swap] Recipe not found', {
        planMealId,
        newRecipeId: command.new_recipe_id
      })

      return new Response(
        JSON.stringify({
          error: 'Recipe not found or not active'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // =========================================================================
    // STEP 6: Validate Swap Candidate (Business Rules)
    // =========================================================================

    console.info('[POST /api/plan-meals/{id}/swap] Validating swap candidate', {
      planMealId,
      currentRecipeId: planMeal.recipe_id,
      newRecipeId: newRecipe.id,
      slot: planMeal.slot
    })

    const validation = await validateSwapCandidate(planMeal, newRecipe, supabase)

    if (!validation.isValid) {
      console.warn('[POST /api/plan-meals/{id}/swap] Validation failed', {
        planMealId,
        newRecipeId: newRecipe.id,
        error: validation.error
      })

      return new Response(
        JSON.stringify({
          error: validation.error
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // =========================================================================
    // STEP 7: Perform Swap Transaction
    // =========================================================================

    console.info('[POST /api/plan-meals/{id}/swap] Performing swap transaction', {
      planMealId,
      newRecipeId: newRecipe.id,
      multiPortionGroupId: planMeal.multi_portion_group_id
    })

    const updatedMeals = await performSwapTransaction(
      planMealId,
      newRecipe,
      planMeal,
      supabase
    )

    const duration = Date.now() - startTime

    console.info('[POST /api/plan-meals/{id}/swap] Swap completed successfully', {
      planMealId,
      newRecipeId: newRecipe.id,
      updatedMealsCount: updatedMeals.length,
      duration_ms: duration
    })

    // =========================================================================
    // STEP 8: Return Success Response
    // =========================================================================

    const response: SwapMealResponse = {
      updated_meals: updatedMeals
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    // =========================================================================
    // STEP 9: Handle Errors and Map to HTTP Status Codes
    // =========================================================================

    const duration = Date.now() - startTime

    // Handle ServerError or other errors (500)
    console.error('[POST /api/plan-meals/{id}/swap] Server error during swap', {
      planMealId,
      duration_ms: duration,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })

    return new Response(
      JSON.stringify({
        error: 'Failed to swap meal recipe'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

