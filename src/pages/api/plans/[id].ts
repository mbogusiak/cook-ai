import type { APIRoute } from "astro";
import { z } from "zod";
import { planIdParamSchema } from "../../../lib/schemas/planParams";
import { getPlanById, updatePlanState } from "../../../lib/services/plans.service";
import { NotFoundError, ForbiddenError, ServerError } from "../../../lib/errors";

export const prerender = false;

// Validation schema for PATCH request body
const updatePlanCommandSchema = z.object({
  state: z.enum(["active", "archived", "cancelled"]).describe("New plan state"),
});

/**
 * GET /api/plans/{id}
 *
 * Fetch complete plan details with nested days, meals, and recipes.
 *
 * Note: user_id is automatically taken from the authenticated session
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
 * - 401: Unauthorized (user not authenticated)
 * - 400: Invalid plan ID format
 * - 404: Plan not found
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Validate plan ID parameter
    const validationResult = planIdParamSchema.safeParse({
      id: context.params.id,
    });

    if (!validationResult.success) {
      console.error("[GET /api/plans/:id] Validation error:", {
        input: context.params.id,
        errors: validationResult.error.errors,
      });

      return new Response(JSON.stringify({ error: "Invalid plan ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const planId = validationResult.data.id;

    // Step 2: Check authentication
    const user = context.locals.user;
    if (!user || !user.id) {
      console.warn("[GET /api/plans/:id] User not authenticated", {
        planId,
      });

      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch plan from service using authenticated user_id
    const plan = await getPlanById(context.locals.supabase, planId, user.id);

    // Step 4: Handle not found
    if (!plan) {
      console.warn("[GET /api/plans/:id] Plan not found:", {
        planId,
        userId: user.id,
      });

      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 5: Success response
    return new Response(JSON.stringify({ data: plan }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Log full error for debugging (server-side only)
    console.error("[GET /api/plans/:id] Internal error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      params: context.params,
    });

    // Generic error response (don't leak implementation details)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/plans/{id}
 *
 * Update plan state (archive or cancel plan)
 *
 * Path Parameters:
 * - id: Plan ID (positive integer)
 *
 * Request Body:
 * {
 *   "state": "active" | "archived" | "cancelled"
 * }
 *
 * Success Response (200):
 * {
 *   "data": {
 *     "id": number,
 *     "user_id": string,
 *     "state": "active" | "archived" | "cancelled",
 *     "start_date": string,
 *     "end_date": string,
 *     "created_at": string,
 *     "updated_at": string
 *   }
 * }
 *
 * Error Responses:
 * - 401: Unauthorized (user not authenticated)
 * - 400: Invalid plan ID or request body
 * - 403: User doesn't own the plan
 * - 404: Plan not found
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async (context) => {
  try {
    // Step 1: Validate plan ID parameter
    const validationResult = planIdParamSchema.safeParse({
      id: context.params.id,
    });

    if (!validationResult.success) {
      console.error("[PATCH /api/plans/:id] Validation error:", {
        input: context.params.id,
        errors: validationResult.error.errors,
      });

      return new Response(JSON.stringify({ error: "Invalid plan ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const planId = validationResult.data.id;

    // Step 2: Parse and validate request body
    let requestBody: unknown;
    try {
      const bodyText = await context.request.text();
      requestBody = JSON.parse(bodyText);
    } catch (error) {
      console.warn("[PATCH /api/plans/:id] Invalid JSON in request body", {
        planId,
        error: error instanceof Error ? error.message : String(error),
      });

      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate command schema
    const commandResult = updatePlanCommandSchema.safeParse(requestBody);
    if (!commandResult.success) {
      console.warn("[PATCH /api/plans/:id] Validation failed", {
        planId,
        errors: commandResult.error.errors,
      });

      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const command = commandResult.data;

    // Step 3: Check authentication
    const user = context.locals.user;
    if (!user || !user.id) {
      console.warn("[PATCH /api/plans/:id] User not authenticated", {
        planId,
      });

      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Update plan state
    try {
      const updatedPlan = await updatePlanState(context.locals.supabase, planId, user.id, command.state as any);

      console.info("[PATCH /api/plans/:id] Plan updated successfully", {
        planId,
        newState: command.state,
      });

      return new Response(JSON.stringify({ data: updatedPlan }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle specific application errors
      if (error instanceof NotFoundError) {
        console.warn("[PATCH /api/plans/:id] Plan not found", {
          planId,
        });

        return new Response(JSON.stringify({ error: "Plan not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error instanceof ForbiddenError) {
        console.warn("[PATCH /api/plans/:id] Forbidden access", {
          planId,
        });

        return new Response(JSON.stringify({ error: "You do not have permission to update this plan" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw error;
    }
  } catch (error) {
    // Log full error for debugging
    console.error("[PATCH /api/plans/:id] Internal error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      params: context.params,
    });

    // Generic error response
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
