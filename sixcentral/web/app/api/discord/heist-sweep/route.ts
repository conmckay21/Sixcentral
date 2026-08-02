import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sweepExpired } from '@/lib/heists';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Heist Finder housekeeping, run by Vercel cron every 15 minutes: any lobby
 * past its expiry is marked done, its Discord post flips to closed with the
 * buttons disabled, and the crew thread gets a timeout note. Keeps the board
 * honest without anyone lifting a finger.
 */
function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set => allow (dev only). Set it in prod.
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

async function serviceClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const sb = await serviceClient();
  if (!sb) return NextResponse.json({ error: 'no service client' }, { status: 500 });
  try {
    const closed = await sweepExpired(sb);
    return NextResponse.json({ ok: true, closed });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
