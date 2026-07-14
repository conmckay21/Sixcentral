import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminClient, staffUserId, claude, stripJson } from '@/lib/draft';
import {
  ANGLES_SYSTEM,
  PACK_SYSTEM,
  EVERGREEN_DEBATES,
  deskDigest,
  recentAngleTitles,
  SocialAngle,
} from '@/lib/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Carve the JSON object out of a response, tolerating chatter around it. */
function jsonSlice(text: string): string {
  const t = stripJson(text);
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  return a >= 0 && b > a ? t.slice(a, b + 1) : t;
}

function failDetail(e: any, raw: string): string {
  const detail = String(e?.message || e).slice(0, 200);
  const peek = raw ? ' | raw: ' + raw.slice(0, 160).replace(/\s+/g, ' ') : '';
  return detail + peek;
}

export async function POST(req: Request) {
  const admin = adminClient();
  const staff = await staffUserId(req, admin);
  if (!staff) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  let p: { op?: string; angle?: SocialAngle };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // --- op: angles -----------------------------------------------------------
  // Reads the open desk plus the evergreen bank, avoids anything served in the
  // last fortnight, returns the 8 most argumentative angles.
  if (p.op === 'angles') {
    const [digest, used] = await Promise.all([deskDigest(admin), recentAngleTitles(admin)]);
    const brief = [
      'Desk stories, open and uncovered, ranked:',
      digest || '(the desk is quiet today)',
      '',
      'Evergreen debate bank:',
      EVERGREEN_DEBATES.map((d) => `- ${d}`).join('\n'),
      '',
      used.length
        ? `Recently used, do not repeat:\n${used.map((t) => `- ${t}`).join('\n')}`
        : 'Nothing used recently.',
    ].join('\n');

    let raw = '';
    let out: any;
    try {
      raw = await claude(ANGLES_SYSTEM, brief, 3000);
      out = JSON.parse(jsonSlice(raw));
    } catch (e: any) {
      return NextResponse.json(
        { error: 'angle generation failed: ' + failDetail(e, raw) },
        { status: 502 }
      );
    }
    const angles = (Array.isArray(out.angles) ? out.angles : [])
      .filter((a: any) => a && a.title)
      .slice(0, 8);
    if (!angles.length) return NextResponse.json({ error: 'no angles came back' }, { status: 502 });
    return NextResponse.json({ ok: true, angles });
  }

  // --- op: pack --------------------------------------------------------------
  // Writes the six-post pack for one angle and saves it as drafts.
  if (p.op === 'pack') {
    const angle = p.angle;
    if (!angle || !angle.title) return NextResponse.json({ error: 'missing angle' }, { status: 400 });

    // Only trust the story link if the row actually exists, so the FK never trips.
    let srcId: string | null = null;
    let context = '';
    if (angle.source_intel_id) {
      const { data: s } = await admin
        .from('intel_items')
        .select('id,title,summary,key_points,category,corroborated,source_tier')
        .eq('id', angle.source_intel_id)
        .maybeSingle();
      if (s) {
        const st: any = s;
        srcId = st.id;
        context = [
          '',
          'Desk story behind this angle:',
          `Title: ${st.title}`,
          `Category: ${st.category} | Corroborated: ${st.corroborated ? 'yes' : 'no'} | Source tier: ${st.source_tier}`,
          `Summary: ${st.summary || ''}`,
          `Key points: ${(Array.isArray(st.key_points) ? st.key_points : []).join(' | ')}`,
        ].join('\n');
      }
    }

    const brief = [
      `Angle: ${angle.title}`,
      `Why it works: ${angle.rationale || ''}`,
      `Format lean: ${angle.format || 'any'}`,
      context,
    ].join('\n');

    let raw = '';
    let out: any;
    try {
      raw = await claude(PACK_SYSTEM, brief, 2600);
      out = JSON.parse(jsonSlice(raw));
    } catch (e: any) {
      return NextResponse.json(
        { error: 'pack generation failed: ' + failDetail(e, raw) },
        { status: 502 }
      );
    }
    const posts = (Array.isArray(out.posts) ? out.posts : []).filter(
      (x: any) => x && x.platform && x.body
    );
    if (!posts.length) return NextResponse.json({ error: 'pack came back empty' }, { status: 502 });

    const angleId = randomUUID();
    const rows = posts.map((x: any) => ({
      angle_id: angleId,
      angle_title: String(angle.title).slice(0, 200),
      angle_rationale: angle.rationale ? String(angle.rationale).slice(0, 300) : null,
      source_intel_id: srcId,
      platform: String(x.platform).slice(0, 20),
      variant: x.variant ? String(x.variant).slice(0, 30) : null,
      body: String(x.body),
      poll_options: Array.isArray(x.poll_options) ? x.poll_options.slice(0, 4) : null,
      hashtags: Array.isArray(x.hashtags) ? x.hashtags.slice(0, 8) : null,
      char_count: String(x.body).length,
      status: 'draft',
    }));
    const { data: saved, error } = await admin.from('social_posts').insert(rows).select('*');
    if (error) return NextResponse.json({ error: 'save failed: ' + error.message }, { status: 500 });
    return NextResponse.json({ ok: true, angle_id: angleId, posts: saved || [] });
  }

  return NextResponse.json({ error: 'unknown op' }, { status: 400 });
}
