import type { APIRoute } from 'astro'
import { getPlanIdSchema, updatePlanCommandSchema } from '../../../lib/schemas/plan'
import { getPlanDetailsWithMeals, updatePlanState } from '../../../lib/services/plans.service'
import { NotFoundError, ForbiddenError, ServerError } from '../../../lib/errors'

export const prerender = false

/**
 * GET /api/plans/{id}
 *
 * Fetch complete plan details with nested days, meals, and recipes (v2 Schema Updated)
 *
 * v2 Updates:
 * - Returns portions_to_cook in meals (number of portions to prepare for day 1, NULL for day 2)
 * - Returns is_leftover flag to distinguish cooking day vs leftover day
 * - Returns multi_portion_group_id for grouped multi-portion meals
 *
 * Authentication: Session-based (Supabase Auth)
 *
 * URL Parameters:
 * - id (required): Plan ID (positive integer)
 *
 * Response:
 * - 200 OK: { data: PlanDetailsResponse } with v2 meal fields
 * - 400 Bad Request: Invalid plan ID format
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Plan belongs to different user
 * - 404 Not Found: Plan doesn't exist
 * - 500 Internal Server Error: Database error
 *
 * @param context - Astro context with params, locals, request info
 * @returns JSON response with plan details (v2) or error
 */
export const GET: APIRoute = async (context) => {
  try {
    const { params } = context

    // Step 1: Check authentication (session-based)
    const session = context.locals.session
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const userId = session.user.id

    // Step 2: Validate plan ID from URL parameters
    const validation = getPlanIdSchema.safeParse({ id: params.id })

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid plan ID'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const planId = validation.data.id

    // Step 3: Get Supabase client from context
    const supabase = context.locals.supabase

    if (!supabase) {
      console.error('[GET /api/plans/{id}] Supabase client not available in context')
      return new Response(
        JSON.stringify({
          error: 'Internal server error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 4: Fetch plan details using service (v2: includes portions_to_cook)
    const planDetails = await getPlanDetailsWithMeals(supabase, planId, userId)

    // Step 5: Handle not found case
    if (!planDetails) {
      return new Response(
        JSON.stringify({
          error: 'Plan not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 6: Return successful response (v2: includes portions_to_cook, is_leftover, etc.)
    return new Response(
      JSON.stringify({
        data: planDetails
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    // Step 7: Handle specific error types
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: 'Plan not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (error instanceof ServerError) {
      console.error('[GET /api/plans/{id}] Server error:', {
        message: error.message,
        originalError: error.originalError?.message
      })
      return new Response(
        JSON.stringify({
          error: 'Internal server error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/plans/{id}] Unexpected error:', errorMessage)

    return new Response(
      JSON.stringify({
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * PATCH /api/plans/{id}
 *
 * Update plan state (e.g., active, archived, cancelled, completed)
 *
 * Authentication: Session-based (Supabase Auth)
 *
 * URL Parameters:
 * - id (required): Plan ID (positive integer)
 *
 * Request Body:
 * - state (required): New plan state (active | archived | cancelled | completed)
 *
 * Response:
 * - 200 OK: { data: PlanDTO } with updated state
 * - 400 Bad Request: Invalid plan ID or state value
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Plan belongs to different user
 * - 404 Not Found: Plan doesn't exist
 * - 500 Internal Server Error: Database error
 *
 * @param context - Astro context with params, locals, request info
 * @returns JSON response with updated plan or error
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const { params, request } = context

    // Step 1: Check authentication (session-based)
    const session = context.locals.session
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const userId = session.user.id

    // Step 2: Validate plan ID from URL parameters
    const idValidation = getPlanIdSchema.safeParse({ id: params.id })

    if (!idValidation.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid plan ID',
          details: idValidation.error.errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const planId = idValidation.data.id

    // Step 3: Parse and validate request body
    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch {
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

    const bodyValidation = updatePlanCommandSchema.safeParse(requestBody)

    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: bodyValidation.error.errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const { state: newState } = bodyValidation.data

    // Step 4: Get Supabase client from context
    const supabase = context.locals.supabase

    if (!supabase) {
      console.error('[PATCH /api/plans/{id}] Supabase client not available in context')
      return new Response(
        JSON.stringify({
          error: 'Internal server error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 5: Update plan state using service
    const updatedPlan = await updatePlanState(supabase, planId, userId, newState as any)

    // Step 6: Return successful response
    return new Response(
      JSON.stringify({
        data: updatedPlan
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    // Step 7: Handle specific error types
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (error instanceof ForbiddenError) {
      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (error instanceof ServerError) {
      console.error('[PATCH /api/plans/{id}] Server error:', {
        message: error.message,
        originalError: error.originalError?.message
      })
      return new Response(
        JSON.stringify({
          error: 'Internal server error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PATCH /api/plans/{id}] Unexpected error:', errorMessage)

    return new Response(
      JSON.stringify({
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
