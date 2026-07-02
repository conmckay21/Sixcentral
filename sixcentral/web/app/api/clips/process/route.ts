import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Plan A processor: pulls an uploaded file from the intake bucket, pushes it
 * to the SixCentral YouTube channel via a resumable upload, then hands the
 * new video_id to clip_submissions where the existing pipeline takes over.
 * Note: until the Google API audit clears, YouTube forces uploads private.
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

  const { intakeId } = (await req.json().catch(() => ({}))) as { intakeId?: string };
  if (!intakeId) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });

  const { data: intake } = await sb.from('clip_intake').select('*').eq('id', intakeId).single();
  if (!intake || intake.status !== 'uploaded') {
    return NextResponse.json({ ok: false, error: 'not found or already handled' }, { status: 404 });
  }

  const token = await youtubeAccessToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Upload is warming up. The link route works right now.' },
      { status: 501 },
    );
  }

  await sb.from('clip_intake').update({ status: 'processing' }).eq('id', intakeId);

  async function fail(msg: string) {
    await sb!.from('clip_intake').update({ status: 'failed', error: msg }).eq('id', intakeId);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  // pull the file from intake storage
  const { data: file, error: dlErr } = await sb.storage.from('clip-intake').download(intake.storage_path);
  if (dlErr || !file) return fail('Could not read the uploaded file.');
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'video/mp4';

  // resumable upload: init
  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(bytes.length),
      },
      body: JSON.stringify({
        snippet: {
          title: intake.caption?.slice(0, 90) || 'SixCentral community clip',
          description:
            'Submitted to SixCentral by the community. Featured at https://sixcentral.co.uk/clips under the SixCentral Clip Licence.',
          categoryId: '20',
        },
        status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false },
      }),
    },
  );
  const location = init.headers.get('location');
  if (!init.ok || !location) return fail('YouTube did not accept the upload session.');

  // resumable upload: bytes
  const put = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'Content-Length': String(bytes.length) },
    body: bytes,
  });
  if (!put.ok) return fail('YouTube rejected the video bytes.');
  const video = (await put.json()) as { id?: string };
  if (!video.id) return fail('YouTube returned no video id.');

  // hand off to the existing pipeline
  const { data: clip, error: insErr } = await sb
    .from('clip_submissions')
    .insert({
      profile_id: intake.profile_id,
      source: 'upload',
      video_id: video.id,
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

  await sb.storage.from('clip-intake').remove([intake.storage_path]);
  await sb.from('clip_intake').update({ status: 'done', clip_id: clip.id }).eq('id', intakeId);

  return NextResponse.json({ ok: true });
}
