import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Direct-to-YouTube intake, step two. The phone reports the finished upload;
 * we prove the video is really ours before it can enter the queue. fileDetails
 * is only ever returned to the video owner, so its presence is the ownership
 * proof, no channel-id configuration needed.
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

  const { intakeId, videoId } = (await req.json().catch(() => ({}))) as {
    intakeId?: string;
    videoId?: string;
  };
  if (!intakeId || !videoId || !/^[\w-]{6,20}$/.test(videoId)) {
    return NextResponse.json({ ok: false, error: 'missing details' }, { status: 400 });
  }

  const { data: intake } = await sb.from('clip_intake').select('*').eq('id', intakeId).single();
  if (!intake || intake.profile_id !== user.id || intake.storage_path !== 'direct-to-youtube') {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }
  if (intake.status === 'done' && intake.clip_id) {
    return NextResponse.json({ ok: true });
  }
  if (intake.status !== 'processing') {
    return NextResponse.json({ ok: false, error: 'already handled' }, { status: 409 });
  }

  async function fail(msg: string, code = 502) {
    await sb!.from('clip_intake').update({ status: 'failed', error: msg }).eq('id', intakeId);
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }

  const token = await youtubeAccessToken();
  if (!token) return fail('Upload is warming up. The link route works right now.', 501);

  const check = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=status,fileDetails&id=${videoId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const found = (await check.json().catch(() => null)) as {
    items?: { status?: { privacyStatus?: string }; fileDetails?: unknown }[];
  } | null;
  const item = found?.items?.[0];
  if (!check.ok || !item || !item.fileDetails || item.status?.privacyStatus !== 'unlisted') {
    return fail('Could not verify that upload with YouTube.');
  }

  const { data: clip, error: insErr } = await sb
    .from('clip_submissions')
    .insert({
      profile_id: intake.profile_id,
      source: 'upload',
      video_id: videoId,
      caption: intake.caption,
      category: intake.category ?? 'gameplay',
      comp_entry: intake.comp_entry,
      terms_version: intake.terms_version,
      agreed_at: intake.agreed_at,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insErr || !clip) return fail('Uploaded to YouTube but could not queue the clip. Tell a moderator.');

  await sb.from('clip_intake').update({ status: 'done', clip_id: clip.id }).eq('id', intakeId);
  return NextResponse.json({ ok: true });
}
