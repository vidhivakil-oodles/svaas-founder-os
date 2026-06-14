import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder') &&
  supabaseAnonKey.length > 30;

export function createServerClient(): SupabaseClient | null {
  if (!isConfigured) return null;
  return createClient(supabaseUrl!, supabaseAnonKey!);
}

export { isConfigured as isSupabaseConfigured };
