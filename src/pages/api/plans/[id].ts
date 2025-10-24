import type { APIRoute } from 'astro'
import { planIdParamSchema } from '../../../lib/schemas/planParams'
import { getPlanById } from '../../../lib/services/plans.service'

export const prerender = false

// TODO: Remove hardcoded userId when authentication is implemented
const TEMP_USER_ID = '321a3490-fa8f-43ee-82c5-9efdfe027603'

/**
 * GET /api/plans/{id}
 * 
 * Fetch complete plan details with nested days, meals, and recipes.
 * 
 * NOTE: Currently uses hardcoded user_id. Authentication will be added in a separate step.
 * 
 * Path Parameters:
 * - id: Plan ID (positive integer)
 * 
 * Success Response (200):
 * {
 *   "data": {
 *     "id": number,
 *     "user_id": string,
 *     "state": "active" | "completed" | "archived",
 *     "start_date": string,
 *     "end_date": string,
 *     "created_at": string,
 *     "updated_at": string,
 *     "days": [
 *       {
 *         "id": number,
 *         "plan_id": number,
 *         "date": string,
 *         "meals": [...],
 *         "slot_targets": [...]
 *       }
 *     ]
 *   }
 * }
 * 
 * Error Responses:
 * - 400: Invalid plan ID format
 * - 404: Plan not found
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Validate plan ID parameter
    const validationResult = planIdParamSchema.safeParse({
      id: context.params.id
    })

    if (!validationResult.success) {
      console.error('[GET /api/plans/:id] Validation error:', {
        input: context.params.id,
        errors: validationResult.error.errors
      })

      return new Response(
        JSON.stringify({ error: 'Invalid plan ID format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const planId = validationResult.data.id

    // Step 2: Fetch plan from service (using hardcoded userId for now)
    const plan = await getPlanById(context.locals.supabase, planId, TEMP_USER_ID)

    // Step 3: Handle not found
    if (!plan) {
      console.warn('[GET /api/plans/:id] Plan not found:', {
        planId,
        userId: TEMP_USER_ID
      })

      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 4: Success response
    return new Response(
      JSON.stringify({ data: plan }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    // Log full error for debugging (server-side only)
    console.error('[GET /api/plans/:id] Internal error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: context.params
    })

    // Generic error response (don't leak implementation details)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
