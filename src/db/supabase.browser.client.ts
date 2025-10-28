import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let supabaseBrowserClient: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseBrowserClient = (
  supabaseUrl?: string,
  supabaseAnonKey?: string
): ReturnType<typeof createClient<Database>> => {
  if (!supabaseBrowserClient) {
    const url = supabaseUrl || import.meta.env.PUBLIC_SUPABASE_URL;
    const key = supabaseAnonKey || import.meta.env.PUBLIC_SUPABASE_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and Key are required. Please check your environment variables.');
    }

    supabaseBrowserClient = createClient<Database>(url, key);
  }
  return supabaseBrowserClient;
};
