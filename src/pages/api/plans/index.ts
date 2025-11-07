import type { APIRoute } from "astro";
import { getPlansQuerySchema } from "../../../lib/schemas/plan";
import { getPlans } from "../../../lib/services/plans.service";

export const prerender = false;

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
 * - 401: Unauthorized (user not authenticated)
 * - 400: Bad Request (validation error)
 * - 500: Internal Server Error
 *
 * Note: user_id is automatically taken from the authenticated session
 */
export const GET: APIRoute = async (context) => {
  try {
    // 1. Parse query parameters
    const url = new URL(context.request.url);
    const queryParams = {
      state: url.searchParams.get("state"),
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    };

    // 2. Validate query parameters
    const validationResult = getPlansQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          details: validationResult.error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const filters = validationResult.data;

    // 3. Check authentication
    const user = context.locals.user;
    if (!user || !user.id) {
      console.warn("[GET /api/plans] User not authenticated");

      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Get Supabase client
    const supabase = context.locals.supabase;

    // 5. Call service to get plans using authenticated user_id
    const result = await getPlans(supabase, user.id, filters);

    // 6. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error details server-side
    console.error("[GET /api/plans] Error:", error);

    // Return generic error to client
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
