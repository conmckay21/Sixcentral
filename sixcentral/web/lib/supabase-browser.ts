'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client for auth + account features.
 * PKCE flow with URL detection so magic-link and OAuth redirects
 * complete on whatever page the user lands on (we send them to /account).
 */
let cached: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  cached =
    url && key
      ? createClient(url, key, {
          auth: {
            flowType: 'pkce',
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
          },
        })
      : null;
  return cached;
}
