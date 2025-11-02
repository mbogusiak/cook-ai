import type { APIRoute } from 'astro'
import { createUserSettings } from '../../lib/services/user-settings.service'
import type { CreateUserSettingsCommand, UserSettingsDTO } from '../../types'

export const prerender = false

/**
 * POST /api/user-settings
 * 
 * Creates user settings during first-time onboarding
 * 
 * Request Body:
 * {
 *   "default_daily_calories": 2000,
 *   "default_plan_length_days": 7 (optional, default: 7)
 * }
 * 
 * Note: user_id is automatically taken from the authenticated session
 * 
 * Success Response: 201 Created
 * {
 *   "data": {
 *     "user_id": "550e8400-e29b-41d4-a716-446655440000",
 *     "default_daily_calories": 2000,
 *     "default_plan_length_days": 7,
 *     "created_at": "2024-01-15T10:00:00Z",
 *     "updated_at": "2024-01-15T10:00:00Z"
 *   }
 * }
 * 
 * Error Responses:
 * - 401 Unauthorized: User not authenticated
 * - 400 Bad Request: Invalid input data or malformed JSON
 * - 409 Conflict: User settings already exist
 * - 500 Internal Server Error: Database or server error
 * 
 * @param context - Astro context with request, locals, and URL data
 * @returns JSON response with user settings or error details
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Get Supabase client from context
    const supabase = context.locals.supabase

    if (!supabase) {
      console.error('Supabase client not available in context')
      return new Response(
        JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection not available'
          }
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 2: Check authentication
    const user = context.locals.user
    if (!user || !user.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 3: Parse request body as JSON
    let requestBody: unknown
    try {
      const bodyText = await context.request.text()
      if (!bodyText) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'BAD_REQUEST',
              message: 'Request body is empty'
            }
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      requestBody = JSON.parse(bodyText)
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid JSON in request body'
          }
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 4: Validate input data and create user settings
    // Use user_id from session instead of request body
    const body = requestBody as { default_daily_calories?: number; default_plan_length_days?: number }
    const command: CreateUserSettingsCommand = {
      user_id: user.id,
      default_daily_calories: body.default_daily_calories!,
      default_plan_length_days: body.default_plan_length_days
    }
    const result = await createUserSettings(supabase, command)

    // Step 4: Handle errors from service layer
    if (result.error) {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'SETTINGS_ALREADY_EXIST' ? 409 :
                        500

      return new Response(
        JSON.stringify({
          error: {
            code: result.code || 'INTERNAL_SERVER_ERROR',
            message: result.error
          }
        }),
        {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 5: Return successful response with 201 Created
    return new Response(
      JSON.stringify({
        data: result.data as UserSettingsDTO
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    // Step 6: Handle unexpected errors
    console.error('Error creating user settings:', error)

    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Error details:', {
        code: (error as any).code,
        message: (error as any).message
      })
    }

    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while creating user settings'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
