import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Direct-to-YouTube intake, step one. The server holds the channel
 * credentials, so it opens the resumable session (title, unlisted privacy,
 * licence description all locked in here) and hands the phone a one-time
 * upload URL. The video bytes never touch our storage or our functions,
 * which is what makes full-size console captures possible.
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function youtubeAccessToken(): Promise<string | null> {
  const id = process.env.YOUTUBE_CLIENT_ID;
  const secret = process.env.YOUTUBE_CLIENT_SECRET;
  const refresh = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!id || !secret || !refresh) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function POST(req: NextRequest) {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'offline' }, { status: 503 });

  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 });
  const { data: userData } = await sb.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    caption?: string | null;
    category?: string | null;
    comp_entry?: boolean;
    contentType?: string;
  };
  const contentType = body.contentType && /^video\//.test(body.contentType) ? body.contentType : 'video/mp4';

  const token = await youtubeAccessToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Upload is warming up. The link route works right now.' },
      { status: 501 },
    );
  }

  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
      },
      body: JSON.stringify({
        snippet: {
          title: body.caption?.slice(0, 90) || 'SixCentral community clip',
          description:
            'Submitted to SixCentral by the community. Featured at https://sixcentral.co.uk/clips under the SixCentral Clip Licence.',
          categoryId: '20',
        },
        status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false },
      }),
    },
  );
  const uploadUrl = init.headers.get('location');
  if (!init.ok || !uploadUrl) {
    return NextResponse.json({ ok: false, error: 'YouTube did not accept the upload session.' }, { status: 502 });
  }

  const { data: intake, error: inErr } = await sb
    .from('clip_intake')
    .insert({
      profile_id: user.id,
      storage_path: 'direct-to-youtube',
      caption: body.caption ?? null,
      category: body.category ?? 'gameplay',
      comp_entry: !!body.comp_entry,
      terms_version: 'v1-app',
      agreed_at: new Date().toISOString(),
      status: 'processing',
    })
    .select('id')
    .single();
  if (inErr || !intake) {
    return NextResponse.json({ ok: false, error: 'Could not queue the upload. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, uploadUrl, intakeId: intake.id });
}
