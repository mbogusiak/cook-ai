import type { APIRoute } from 'astro'
import { getPlansQuerySchema } from '../../../lib/schemas/plan'
import { getPlans } from '../../../lib/services/plans.service'

export const prerender = false

/**
 * GET /api/plans
 * 
 * Retrieves paginated list of user's plans with optional filtering
 * 
 * Query Parameters:
 * - state: optional, filter by plan state ('active' | 'archived' | 'cancelled')
 * - limit: optional, results per page (1-50, default 10)
 * - offset: optional, pagination offset (>=0, default 0)
 * 
 * Responses:
 * - 200: Success with PlansListResponse
 * - 400: Bad Request (validation error)
 * - 500: Internal Server Error
 * 
 * Note: Currently uses hardcoded user_id for development. 
 *       Authentication will be added later.
 */
export const GET: APIRoute = async (context) => {
  try {
    // 1. Parse query parameters
    const url = new URL(context.request.url)
    const queryParams = {
      state: url.searchParams.get('state'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset')
    }

    // 2. Validate query parameters
    const validationResult = getPlansQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          details: validationResult.error.issues
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const filters = validationResult.data

    // 3. Get Supabase client
    const supabase = context.locals.supabase

    // TODO: Replace with proper authentication
    // For now, using hardcoded user_id for development
    const userId = '1e486c09-70e2-4acc-913d-7b500bbde2ca'

    // 4. Call service to get plans
    const result = await getPlans(supabase, userId, filters)

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    // Log error details server-side
    console.error('[GET /api/plans] Error:', error)

    // Return generic error to client
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

