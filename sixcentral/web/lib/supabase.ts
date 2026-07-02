import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a Supabase client if env vars are present, otherwise null.
 * The content layer (lib/content.ts) falls back to mock data when this is null,
 * so the app runs out of the box and lights up for real the moment you add keys.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  cached = url && key ? createClient(url, key) : null;
  return cached;
}
