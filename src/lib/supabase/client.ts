import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create client if both env vars are present and not placeholders
const isConfigured = supabaseUrl && supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder') &&
  supabaseAnonKey.length > 30;

let supabaseClient: SupabaseClient | null = null;

if (isConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
}

export const supabase = supabaseClient;
export const isSupabaseConfigured = isConfigured;
