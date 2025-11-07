import type { APIRoute } from "astro";
import { registerApiSchema } from "../../../lib/schemas/auth";
import { createSupabaseServerInstance } from "../../../db/supabase.server";
import { mapSupabaseAuthError } from "../../../lib/auth-error-mapper";

export const prerender = false;

/**
 * POST /api/auth/register
 *
 * Registers a new user with email and password.
 *
 * Request Body:
 * {
 *   "email": string,
 *   "password": string
 * }
 *
 * Success Response: 200 OK
 * {
 *   "user": {
 *     "id": string,
 *     "email": string
 *   },
 *   "requiresEmailConfirmation": boolean
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid input data or validation failure
 * - 409 Conflict: Email already registered
 * - 500 Internal Server Error: Unexpected server error
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Parse request body
    let requestBody: unknown;
    try {
      const bodyText = await context.request.text();
      if (!bodyText) {
        return new Response(JSON.stringify({ error: "Request body is empty" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      requestBody = JSON.parse(bodyText);
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Validate input with Zod schema
    const validationResult = registerApiSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const errorMessage = firstIssue?.message || "Invalid input parameters";

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, password } = validationResult.data;

    // Step 3: Create Supabase client instance
    const supabase = createSupabaseServerInstance({
      headers: context.request.headers,
      cookies: context.cookies,
    });

    // Step 4: Attempt sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // Step 5: Handle Supabase errors
    if (error) {
      const mappedError = mapSupabaseAuthError(error);

      // Use 409 for email already exists, 400 for other validation errors
      const statusCode = mappedError.code === "EMAIL_EXISTS" ? 409 : 400;

      return new Response(JSON.stringify({ error: mappedError.message }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Check if email confirmation is required
    // In Supabase, if email confirmation is enabled, data.session will be null
    // even if signUp was successful
    const requiresEmailConfirmation = !data.session && data.user !== null;

    // Step 7: Return success response
    if (!data.user) {
      return new Response(JSON.stringify({ error: "Rejestracja nie powiodła się" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        requiresEmailConfirmation,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Step 8: Handle unexpected errors
    console.error("[POST /api/auth/register] Unexpected error:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
