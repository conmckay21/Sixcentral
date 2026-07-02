import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Stored verbatim with each signup — the provable consent record. */
const CONSENT_TEXT =
  'SixCentral launch updates and newsletter. Unsubscribe at any time.';

export async function POST(req: Request) {
  let email = '';
  let source = 'web';

  try {
    const body = await req.json();
    email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'web';
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: 'That email address doesn’t look right.' },
      { status: 400 },
    );
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: 'Signups aren’t open just yet — check back soon.' },
      { status: 503 },
    );
  }

  const { error } = await sb
    .from('subscribers')
    .insert({ email, source, consent_text: CONSENT_TEXT });

  // 23505 = unique violation → already on the list. Treat as success so the
  // endpoint can't be used to probe whether an address is subscribed.
  if (error && error.code !== '23505') {
    return NextResponse.json(
      { ok: false, error: 'Something went wrong — please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
