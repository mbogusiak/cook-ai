import { defineMiddleware } from 'astro:middleware';

import { supabaseServer } from '../db/supabase.server';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseServer;
  return next();
});
