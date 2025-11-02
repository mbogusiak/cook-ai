import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createPlanCommandSchema } from '../../../lib/schemas/plan'
import { generatePlan } from '../../../lib/services/plans.service'
import { ConflictError, ServerError } from '../../../lib/errors'
import type { PlanDTO } from '../../../types'

export const prerender = false

/**
 * POST /api/plans/generate
 * 
 * Generates a new meal plan for a user.
 * 
 * TEMPORARY: Accepts user_id in request body (will be replaced with session auth)
 * TODO: Add authentication via context.locals.session in separate step
 * 
 * Request Body:
 * {
 *   "user_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "daily_calories": number (800-6000),
 *   "plan_length_days": number (1-365),
 *   "start_date": string (ISO 8601, future date)
 * }
 * 
 * Success Response: 201 Created
 * {
 *   "id": 42,
 *   "user_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "state": "active",
 *   "start_date": "2025-10-20",
 *   "end_date": "2025-10-26",
 *   "daily_calories": 2000,
 *   "created_at": "2025-10-17T14:30:00Z",
 *   "updated_at": "2025-10-17T14:30:00Z"
 * }
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid input data or validation failure
 * - 409 Conflict: User already has an active plan
 * - 500 Internal Server Error: Unexpected server error
 * 
 * @param context - Astro context with request, locals, and URL data
 * @returns JSON response with created plan or error details
 */
export const POST: APIRoute = async (context) => {
  const startTime = Date.now()
  let requestBody: unknown = null
  let userId = 'unknown'

  try {
    // =========================================================================
    // STEP 1: Get Supabase Client
    // =========================================================================

    const supabase = context.locals.supabase
    if (!supabase) {
      console.error('[POST /api/plans/generate] Supabase client not available in context')

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
    // STEP 2: Parse Request Body
    // =========================================================================

    try {
      const bodyText = await context.request.text()

      if (!bodyText) {
        console.warn('[POST /api/plans/generate] Empty request body')

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
      console.warn('[POST /api/plans/generate] Invalid JSON in request body', {
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

    // =========================================================================
    // STEP 3: Extract user_id from request body (TEMPORARY)
    // =========================================================================

    const body = requestBody as Record<string, unknown>
    userId = body.user_id as string

    if (!userId || typeof userId !== 'string') {
      console.warn('[POST /api/plans/generate] Missing or invalid user_id', { userId })

      return new Response(
        JSON.stringify({
          error: 'user_id is required and must be a string'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // =========================================================================
    // STEP 4: Validate Input with Zod Schema
    // =========================================================================

    let command
    try {
      command = createPlanCommandSchema.parse({
        daily_calories: body.daily_calories,
        plan_length_days: body.plan_length_days,
        start_date: body.start_date
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0]
        const errorMessage = firstIssue?.message || 'Invalid input parameters'

        console.warn('[POST /api/plans/generate] Validation failed', {
          userId,
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
    // STEP 5: Call Service Layer - Generate Plan
    // =========================================================================

    console.info('[POST /api/plans/generate] Starting plan generation', {
      userId,
      daily_calories: command.daily_calories,
      plan_length_days: command.plan_length_days,
      start_date: command.start_date
    })

    let plan
    try {
      plan = await generatePlan(supabase, userId, command)
    } catch (err) {
      console.error('[POST /api/plans/generate] generatePlan failed:', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
      throw err
    }

    const duration = Date.now() - startTime

    console.info('[POST /api/plans/generate] Plan generated successfully', {
      userId,
      planId: plan.id,
      duration_ms: duration
    })

    // =========================================================================
    // STEP 6: Return 201 Created Response
    // =========================================================================

    return new Response(
      JSON.stringify(plan as PlanDTO),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Location': `/api/plans/${plan.id}`
        }
      }
    )
  } catch (error) {
    // =========================================================================
    // STEP 7: Handle Errors and Map to HTTP Status Codes
    // =========================================================================

    const duration = Date.now() - startTime

    // Handle ConflictError (409)
    if (error instanceof ConflictError) {
      console.warn('[POST /api/plans/generate] Conflict - user already has active plan', {
        userId,
        duration_ms: duration
      })

      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle ServerError or other errors (500)
    console.error('[POST /api/plans/generate] Server error during plan generation', {
      userId,
      duration_ms: duration,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })

    return new Response(
      JSON.stringify({
        error: 'Failed to generate meal plan'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
