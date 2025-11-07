import type { APIRoute } from "astro";
import { GetRecipeParamsSchema } from "../../../lib/schemas/recipe";
import { getRecipeById } from "../../../lib/services/recipes";

export const prerender = false;

/**
 * GET /api/recipes/{id}
 *
 * Fetches a single recipe with all its details and available meal slots.
 *
 * @param context - Astro context containing params, locals, and other request data
 * @returns JSON response with recipe data or error message
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate ID from path parameter
    const { id: idParam } = context.params;

    if (!idParam) {
      return new Response(JSON.stringify({ error: "Invalid recipe ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Validate ID with Zod schema
    const paramsValidation = GetRecipeParamsSchema.safeParse({ id: idParam });

    if (!paramsValidation.success) {
      return new Response(JSON.stringify({ error: "Invalid recipe ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = paramsValidation.data;

    // Step 3: Get Supabase client from context
    const supabase = context.locals.supabase;

    if (!supabase) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Fetch recipe from database
    const recipe = await getRecipeById(supabase, id);

    // Step 5: Handle not found case
    if (!recipe) {
      return new Response(JSON.stringify({ error: "Recipe not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Return successful response with cache headers
    return new Response(JSON.stringify({ data: recipe }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // 1 hour cache
      },
    });
  } catch (error) {
    // Step 7: Handle unexpected errors
    console.error("Error fetching recipe:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
