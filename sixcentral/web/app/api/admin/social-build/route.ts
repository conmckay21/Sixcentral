import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminClient, staffUserId, claude } from '@/lib/draft';
import {
  ANGLES_SYSTEM,
  PACK_SYSTEM,
  IMAGE_PICK_SYSTEM,
  EVERGREEN_DEBATES,
  deskDigest,
  recentAngleTitles,
  SocialAngle,
} from '@/lib/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNone(v: string): boolean {
  return !v || /^(none|null|n\/a|-)$/i.test(v.trim());
}

/** Read a single-line field out of a delimited block. */
function fieldLine(block: string, name: string): string {
  const m = block.match(new RegExp('^' + name + ':[ \\t]*(.*)$', 'm'));
  return m ? m[1].trim() : '';
}

/** Read the trailing multi-line BODY field, stopping if another field follows it. */
function fieldBody(block: string): string {
  const m = block.match(/^BODY:[ \t]*\n?([\s\S]*)$/m);
  if (!m) return '';
  return m[1].split(/^(?:PLATFORM|VARIANT|POLL_OPTIONS|HASHTAGS):/m)[0].trim();
}

function splitBlocks(raw: string, marker: string): string[] {
  return raw
    .split(new RegExp('^===' + marker + '[ \\t]*$', 'm'))
    .map((b) => b.trim())
    .filter(Boolean);
}

function parseAngles(raw: string): SocialAngle[] {
  return splitBlocks(raw, 'ANGLE')
    .map((b) => {
      const heat = parseInt(fieldLine(b, 'HEAT'), 10);
      const srcId = fieldLine(b, 'SOURCE_ID');
      const srcTitle = fieldLine(b, 'SOURCE_TITLE');
      return {
        title: fieldLine(b, 'TITLE'),
        rationale: fieldLine(b, 'RATIONALE'),
        heat: Number.isFinite(heat) ? Math.min(5, Math.max(1, heat)) : 3,
        format: fieldLine(b, 'FORMAT') || 'hot take',
        source_intel_id: UUID_RE.test(srcId) ? srcId : null,
        source_title: isNone(srcTitle) ? null : srcTitle,
      };
    })
    .filter((a) => a.title);
}

function parsePosts(raw: string): any[] {
  return splitBlocks(raw, 'POST')
    .map((b) => {
      const poll = fieldLine(b, 'POLL_OPTIONS');
      const tags = fieldLine(b, 'HASHTAGS');
      return {
        platform: fieldLine(b, 'PLATFORM').toLowerCase(),
        variant: fieldLine(b, 'VARIANT') || null,
        poll_options: isNone(poll)
          ? null
          : poll.split('|').map((s) => s.trim()).filter(Boolean).slice(0, 4),
        hashtags: isNone(tags)
          ? null
          : tags.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 8),
        body: fieldBody(b),
      };
    })
    .filter((x) => x.platform && x.body);
}

function failDetail(e: any, raw: string): string {
  const detail = String(e?.message || e).slice(0, 200);
  const peek = raw ? ' | raw: ' + raw.slice(0, 160).replace(/\s+/g, ' ') : '';
  return detail + peek;
}

/**
 * Catalogue image for the pack. Starts from a rotating fallback so a pack can
 * never come out imageless, then lets the model upgrade it to a proper match.
 * The whole catalogue is offered, not a truncated slice of it, and images used
 * in recent packs are held back so the desk does not settle on one picture.
 */
async function pickImage(admin: any, angle: SocialAngle): Promise<any | null> {
  let all: any[] = [];
  try {
    const { data } = await admin
      .from('media_assets')
      .select('path,url,alt,credit,description')
      .order('path', { ascending: true })
      .limit(400);
    all = data || [];
  } catch {
    return null;
  }
  if (!all.length) return null;

  let recent = new Set<string>();
  try {
    const { data } = await admin
      .from('social_posts')
      .select('image')
      .not('image', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40);
    recent = new Set(((data as any[]) || []).map((r) => r?.image?.path).filter(Boolean));
  } catch {
    /* recency is a nicety, not a requirement */
  }
  const fresh = all.filter((a) => !recent.has(a.path));
  const assets = fresh.length >= 20 ? fresh : all;

  let chosen: any = assets[Math.floor(Math.random() * assets.length)];
  try {
    const catalogue = assets
      .map(
        (a) =>
          `${a.path} :: ${(a.description || a.alt || '').replace(/\s+/g, ' ').slice(0, 140)}`
      )
      .join('\n');
    const raw = await claude(
      IMAGE_PICK_SYSTEM,
      `Angle: ${angle.title}\n${angle.rationale || ''}\n\nCatalogue:\n${catalogue}`,
      100
    );
    const wanted = String(raw || '')
      .trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .toLowerCase();
    if (wanted) {
      const found =
        assets.find((a) => String(a.path).toLowerCase() === wanted) ||
        assets.find((a) => wanted.includes(String(a.path).toLowerCase())) ||
        assets.find((a) => String(a.path).toLowerCase().includes(wanted));
      if (found) chosen = found;
      else console.warn('[social-build] image pick not matched:', wanted.slice(0, 120));
    }
  } catch (e) {
    console.warn('[social-build] image pick failed, random fallback:', e);
  }
  return {
    url: chosen.url,
    alt: chosen.alt || angle.title,
    credit: chosen.credit || 'Rockstar Games',
    path: chosen.path,
  };
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
      'Desk stories, open and uncovered, hottest and highest ranked:',
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
    let angles: SocialAngle[] = [];
    try {
      raw = await claude(ANGLES_SYSTEM, brief, 3000);
      angles = parseAngles(raw).slice(0, 8);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'angle generation failed: ' + failDetail(e, raw) },
        { status: 502 }
      );
    }
    if (!angles.length) {
      return NextResponse.json(
        { error: 'no angles came back' + failDetail('nothing parsable', raw) },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, angles });
  }

  // --- op: pack --------------------------------------------------------------
  // Writes the eight-post pack for one angle, picks a catalogue image, saves as drafts.
  if (p.op === 'pack') {
    const angle = p.angle;
    if (!angle || !angle.title) return NextResponse.json({ error: 'missing angle' }, { status: 400 });

    // Only trust the story link if the row actually exists, so the FK never trips.
    let srcId: string | null = null;
    let context = '';
    if (angle.source_intel_id && UUID_RE.test(String(angle.source_intel_id))) {
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
    let posts: any[] = [];
    try {
      raw = await claude(PACK_SYSTEM, brief, 3200);
      posts = parsePosts(raw);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'pack generation failed: ' + failDetail(e, raw) },
        { status: 502 }
      );
    }
    if (!posts.length) {
      return NextResponse.json(
        { error: 'pack came back empty' + failDetail('nothing parsable', raw) },
        { status: 502 }
      );
    }

    const image = await pickImage(admin, angle);

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
      image,
      status: 'draft',
    }));
    const { data: saved, error } = await admin.from('social_posts').insert(rows).select('*');
    if (error) return NextResponse.json({ error: 'save failed: ' + error.message }, { status: 500 });
    return NextResponse.json({ ok: true, angle_id: angleId, posts: saved || [] });
  }

  return NextResponse.json({ error: 'unknown op' }, { status: 400 });
}
