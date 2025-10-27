import type { APIRoute } from 'astro'
import { z } from 'zod'
import { planMealIdSchema, alternativesQuerySchema } from '../../../../lib/schemas/planMeal'
import { getAlternativesForMeal } from '../../../../lib/services/planMeals.service'
import { ServerError } from '../../../../lib/errors'
import type { AlternativesResponse } from '../../../../types'

export const prerender = false

/**
 * GET /api/plan-meals/{id}/alternatives
 * 
 * Returns a list of alternative recipes (max 3 by default) for a specific plan meal.
 * Alternatives must belong to the same slot and meet calorie criteria (±20% of target).
 * 
 * TEMPORARY: No session authentication (will be added in separate step)
 * 
 * Query Parameters:
 * - limit (optional): Number of alternatives to return (default 3, max 10)
 * 
 * Success Response: 200 OK
 * {
 *   "data": [
 *     {
 *       "id": 456,
 *       "slug": "grilled-chicken-salad",
 *       "name": "Grilled Chicken Salad",
 *       "available_slots": ["lunch", "dinner"],
 *       "calories_per_serving": 450,
 *       "servings": 4,
 *       "time_minutes": 30,
 *       "image_url": "https://...",
 *       "source_url": "https://..."
 *     }
 *   ]
 * }
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid ID or query parameters
 * - 401 Unauthorized: No valid session (when auth is implemented)
 * - 403 Forbidden: User doesn't own the meal
 * - 404 Not Found: Meal not found
 * - 500 Internal Server Error: Unexpected server error
 * 
 * @param context - Astro context with request, locals, params, and URL data
 * @returns JSON response with alternative recipes or error details
 */
export const GET: APIRoute = async (context) => {
  const startTime = Date.now()
  let planMealId: number | undefined

  try {
    // =========================================================================
    // STEP 1: Get Supabase Client
    // =========================================================================

    const supabase = context.locals.supabase
    if (!supabase) {
      console.error('[GET /api/plan-meals/{id}/alternatives] Supabase client not available in context')

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

        console.warn('[GET /api/plan-meals/{id}/alternatives] Invalid ID parameter', {
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
    // STEP 3: Validate Query Parameters (limit)
    // =========================================================================

    let limit = 3 // default
    try {
      const url = new URL(context.request.url)
      const limitParam = url.searchParams.get('limit')
      
      const validatedQuery = alternativesQuerySchema.parse({
        limit: limitParam
      })
      
      limit = validatedQuery.limit
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0]
        const errorMessage = firstIssue?.message || 'Invalid query parameters'

        console.warn('[GET /api/plan-meals/{id}/alternatives] Invalid query parameters', {
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
    // STEP 4: Get User Session (Temporary Placeholder)
    // =========================================================================

    // TODO: Replace with actual session authentication
    // For now, using a placeholder user ID (hardcoded for local dev)
    const TEMP_USER_ID = '1e486c09-70e2-4acc-913d-7b500bbde2ca'

    // When auth is implemented, use:
    // const session = context.locals.session
    // if (!session) {
    //   return new Response(
    //     JSON.stringify({ error: 'Unauthorized' }),
    //     { status: 401, headers: { 'Content-Type': 'application/json' } }
    //   )
    // }
    // const userId = session.user.id

    // =========================================================================
    // STEP 5: Fetch Alternative Recipes
    // =========================================================================

    console.info('[GET /api/plan-meals/{id}/alternatives] Fetching alternatives', {
      planMealId,
      limit,
      userId: TEMP_USER_ID
    })

    const alternatives = await getAlternativesForMeal(
      planMealId,
      TEMP_USER_ID,
      supabase,
      limit
    )

    const duration = Date.now() - startTime

    console.info('[GET /api/plan-meals/{id}/alternatives] Alternatives fetched successfully', {
      planMealId,
      alternativesCount: alternatives.length,
      duration_ms: duration
    })

    // =========================================================================
    // STEP 6: Return Success Response
    // =========================================================================

    const response: AlternativesResponse = {
      data: alternatives
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
    // STEP 7: Handle Errors and Map to HTTP Status Codes
    // =========================================================================

    const duration = Date.now() - startTime

    // Handle ServerError with Forbidden status
    if (error instanceof ServerError) {
      const errorMessage = error.message

      // Check if it's a Forbidden error (user ownership check)
      if (errorMessage.includes('Forbidden')) {
        console.warn('[GET /api/plan-meals/{id}/alternatives] Forbidden access', {
          planMealId,
          duration_ms: duration,
          error: errorMessage
        })

        return new Response(
          JSON.stringify({
            error: 'Forbidden: Cannot access meal from another user\'s plan'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Handle all other errors as 500
    console.error('[GET /api/plan-meals/{id}/alternatives] Server error', {
      planMealId,
      duration_ms: duration,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch alternative recipes'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}


