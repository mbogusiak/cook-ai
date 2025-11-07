import type { APIRoute } from "astro";
import { GetRecipesQuerySchema } from "../../../lib/schemas/recipe";
import { searchRecipes } from "../../../lib/services/recipes";

export const prerender = false;

/**
 * GET /api/recipes
 *
 * Searches and filters recipes with pagination support.
 * Supports filtering by meal slot, calorie range, and text search.
 *
 * Query Parameters:
 * - slot: Filter by meal slot (breakfast, lunch, dinner, snack)
 * - min_calories: Minimum calories per serving
 * - max_calories: Maximum calories per serving
 * - search: Search by recipe name (case-insensitive)
 * - limit: Number of results per page (1-100, default: 20)
 * - offset: Pagination offset (default: 0)
 *
 * @param context - Astro context containing URL params, locals, and request data
 * @returns JSON response with paginated recipe list and metadata
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Parse query parameters from URL
    const searchParams = context.url.searchParams;
    const queryParams = {
      slot: searchParams.get("slot") || undefined,
      min_calories: searchParams.get("min_calories") || undefined,
      max_calories: searchParams.get("max_calories") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    // Step 2: Validate query parameters with Zod schema
    const validation = GetRecipesQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const params = validation.data;

    // Step 3: Get Supabase client from context
    const supabase = context.locals.supabase;

    if (!supabase) {
      console.error("Supabase client not available in context");
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Database connection not available",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Search recipes using service layer
    const result = await searchRecipes(supabase, params);

    // Step 5: Return successful response with cache headers
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // 5 minutes cache for search results
      },
    });
  } catch (error) {
    // Step 6: Handle unexpected errors
    console.error("Error searching recipes:", error);

    // Check if it's a database error
    if (error && typeof error === "object" && "code" in error) {
      console.error("Database error details:", {
        code: (error as any).code,
        message: (error as any).message,
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while fetching recipes",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
