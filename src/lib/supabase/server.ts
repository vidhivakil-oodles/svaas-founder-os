import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseServiceRoleKey &&
  !supabaseServiceRoleKey.includes('placeholder') &&
  supabaseServiceRoleKey.length > 30;

/**
 * Create a server-side Supabase client using the service role key.
 * This bypasses RLS and should only be used in server-side contexts
 * (API routes, server components, server actions).
 */
export function createServerClient(): SupabaseClient | null {
  if (!isConfigured) return null;
  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a server-side Supabase client using the anon key.
 * Use this when you want RLS to apply.
 */
export function createServerAnonClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { isConfigured as isSupabaseConfigured };
