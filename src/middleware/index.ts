import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerInstance } from '../db/supabase.server';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/reset',
  '/auth/reset/callback',
  '/onboarding',
];

export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase client instance for this request
  const supabase = createSupabaseServerInstance({
    headers: context.request.headers,
    cookies: context.cookies,
  });

  // Attach Supabase client to locals
  context.locals.supabase = supabase;

  // Get user session (IMPORTANT: Always call getUser() first)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Attach user and session to locals if authenticated
  if (user && !userError) {
    context.locals.user = {
      id: user.id,
      email: user.email || undefined,
    };

    // Get session for additional info if needed
    const {
      data: { session },
    } = await supabase.auth.getSession();
    context.locals.session = session || undefined;
  } else {
    context.locals.user = undefined;
    context.locals.session = undefined;
  }

  // Check if route requires authentication
  const isPublicPath = PUBLIC_PATHS.includes(context.url.pathname);
  const isApiPublicPath = context.url.pathname.startsWith('/api/auth/');
  const isApiPath = context.url.pathname.startsWith('/api/');

  // Redirect to login if accessing protected route without authentication
  if (!isPublicPath && !isApiPublicPath && !context.locals.user) {
    // For API endpoints, return 401 instead of redirect
    if (isApiPath) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // For pages, redirect to login
    const redirectUrl = `/auth/login?next=${encodeURIComponent(context.url.pathname)}`;
    return context.redirect(redirectUrl);
  }

  return next();
});
