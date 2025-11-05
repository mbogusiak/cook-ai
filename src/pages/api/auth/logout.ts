import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.server';

export const prerender = false;

/**
 * POST /api/auth/logout
 * 
 * Logs out the current user and clears session cookies.
 * 
 * Success Response: 200 OK
 * {}
 * 
 * Error Responses:
 * - 500 Internal Server Error: Unexpected server error
 */
export const POST: APIRoute = async (context) => {
  try {
    // Create Supabase client instance
    const supabase = createSupabaseServerInstance({
      headers: context.request.headers,
      cookies: context.cookies,
    });

    // Sign out from Supabase (this will clear session cookies)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[POST /api/auth/logout] Supabase signOut error:', error);
      // Still return success to ensure cookies are cleared
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[POST /api/auth/logout] Unexpected error:', error);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};






