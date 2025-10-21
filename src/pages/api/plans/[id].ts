import type { APIRoute } from 'astro'
import { getPlanIdSchema } from '../../../lib/schemas/plan'
import { getPlanDetailsWithMeals } from '../../../lib/services/plans.service'
import { NotFoundError, ServerError } from '../../../lib/errors'

export const prerender = false

/**
 * GET /api/plans/{id}
 *
 * Fetch complete plan details with nested days, meals, and recipes
 *
 * URL Parameters:
 * - id (required): Plan ID (positive integer)
 *
 * Response:
 * - 200 OK: { data: PlanDetailsResponse }
 * - 400 Bad Request: Invalid plan ID format
 * - 404 Not Found: Plan doesn't exist or user doesn't have access
 * - 500 Internal Server Error: Database error
 *
 * @param context - Astro context with params, locals, request info
 * @returns JSON response with plan details or error
 */
export const GET: APIRoute = async (context) => {
  try {
    const { params } = context

    // Step 1: Validate plan ID from URL parameters
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

    // Step 2: Get Supabase client from context
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

    // Step 3: Extract user ID from request
    // For now, accept user_id from query parameter or header
    // In production, this should come from authenticated session
    const userIdParam = context.url.searchParams.get('user_id')
    const userIdHeader = context.request.headers.get('X-User-ID')
    const userId = userIdParam || userIdHeader

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: 'User ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 4: Fetch plan details using service
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

    // Step 6: Return successful response
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
    // Handle specific error types
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
