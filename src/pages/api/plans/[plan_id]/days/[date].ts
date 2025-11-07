import type { APIRoute } from "astro";
import { z } from "zod";
import { getPlanDayParamsSchema } from "../../../../../lib/schemas/planDay";
import { getPlanDay } from "../../../../../lib/services/planDays.service";
import { AuthenticationError, ServerError, ValidationError, NotFoundError } from "../../../../../lib/errors";

export const prerender = false;

/**
 * GET /api/plans/{plan_id}/days/{date}
 * Returns a single plan day with meals and slot targets.
 */
export const GET: APIRoute = async (context) => {
  try {
    // Check authentication
    const user = context.locals.user;
    const supabase = context.locals.supabase;

    if (!user || !user.id) {
      console.warn("[GET /api/plans/:plan_id/days/:date] User not authenticated");
      throw new AuthenticationError();
    }

    if (!supabase) {
      console.error("[GET /api/plans/:plan_id/days/:date] Missing Supabase client in context");
      throw new ServerError("Internal server error");
    }

    // Validate params
    let params;
    try {
      params = getPlanDayParamsSchema.parse({
        plan_id: context.params.plan_id,
        date: context.params.date,
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        const message = e.issues[0]?.message || "Invalid parameters";
        throw new ValidationError(message);
      }
      throw e;
    }

    // Fetch plan day - note: function signature is (supabase, planId, date, userId)
    const result = await getPlanDay(supabase, params.plan_id, params.date, user.id);
    if (!result) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof AuthenticationError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: error.message || "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof ServerError) {
      console.error("[GET /api/plans/:plan_id/days/:date] Server error:", error.originalError || error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("[GET /api/plans/:plan_id/days/:date] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
