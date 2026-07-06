import { NextResponse } from 'next/server';
import {
  adminClient,
  staffUserId,
  claude,
  stripJson,
  slugify,
  uniqueSlug,
  credibilityFor,
  gradientFor,
} from '@/lib/draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ARTICLE_SYSTEM = `You are the writer for SixCentral, an independent GTA 6 companion site. Write a complete news article from the intel brief provided.

Voice and rules:
- SixCentral's position is confirmed over rumour. If the brief is a rumour or leak, say clearly in the piece that it is unconfirmed and attribute it to its source. If it is confirmed, state it plainly.
- UK English. Never use em dashes. Human, punchy and clear, never robotic and never hyperbolic.
- Do not invent facts beyond the brief and its sources. Do not fabricate quotes.
- Lead with what matters. Roughly 250 to 450 words.

Reply with ONLY a JSON object, no markdown fences, shaped exactly:
{"title":"headline, punchy, under 70 characters","kicker":"2 to 3 word label such as Analysis, Breaking or Rumour","excerpt":"one sentence summary under 160 characters","readingMins":number,"motif":"one of: skyline palms cassette disc money map signal phone controller pc globe question","body":[{"type":"p","text":"a paragraph"},{"type":"h2","text":"a subheading"},{"type":"ul","items":["a point","a point"]}]}
The body must be several paragraphs with at least one h2 subheading. Use a ul only where it genuinely helps.`;

const PICK_SYSTEM_BASE = `You choose images for a GTA 6 news article from a catalogue of described images. Pick the single best hero image whose subject and mood match the article.`;
const PICK_SYSTEM_TAIL = `Reply with ONLY JSON, no fences: {"hero":"exact path","gallery":["exact path","exact path","exact path"]}. Use exact path strings from the catalogue. If no gallery is requested, return an empty array.`;

export async function POST(req: Request) {
  const admin = adminClient();
  const staff = await staffUserId(req, admin);
  if (!staff) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  let payload: { intel_id?: string; gallery?: boolean };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const { intel_id, gallery } = payload;
  if (!intel_id) return NextResponse.json({ error: 'missing intel_id' }, { status: 400 });

  const { data: story } = await admin.from('intel_items').select('*').eq('id', intel_id).maybeSingle();
  if (!story) return NextResponse.json({ error: 'story not found' }, { status: 404 });
  const s: any = story;

  // 1) write the article
  const brief = [
    `Category: ${s.category}`,
    `Headline seed: ${s.title}`,
    `Summary: ${s.summary || ''}`,
    `Key points: ${(Array.isArray(s.key_points) ? s.key_points : []).join(' | ')}`,
    `Sources: ${(Array.isArray(s.sources) ? s.sources : []).map((x: any) => x.outlet).join(', ')}`,
    `Corroborated: ${s.corroborated ? 'yes' : 'no'} | Source tier: ${s.source_tier}`,
  ].join('\n');

  let article: any;
  try {
    article = JSON.parse(stripJson(await claude(ARTICLE_SYSTEM, brief, 1800)));
  } catch {
    return NextResponse.json({ error: 'article generation failed' }, { status: 502 });
  }
  const body = Array.isArray(article.body) ? article.body : [{ type: 'p', text: String(article.body || '') }];

  // 2) pick images from the catalogue
  const { data: assetsData } = await admin
    .from('media_assets')
    .select('path,url,alt,credit,description')
    .limit(400);
  const assets: any[] = assetsData || [];
  let hero: any = assets[0] || null;
  let galleryPicks: any[] = [];
  if (assets.length) {
    const catalogue = assets
      .map((a) => `${a.path} :: ${a.description || ''}`)
      .join('\n')
      .slice(0, 14000);
    const sys =
      PICK_SYSTEM_BASE +
      (gallery ? ' Also pick 3 different gallery images that complement the hero. ' : ' ') +
      PICK_SYSTEM_TAIL;
    try {
      const pick = JSON.parse(
        stripJson(
          await claude(sys, `Article: ${article.title}\n${article.excerpt}\n\nCatalogue:\n${catalogue}`, 300)
        )
      );
      const byPath = new Map(assets.map((a) => [a.path, a]));
      hero = byPath.get(pick.hero) || hero;
      if (gallery && Array.isArray(pick.gallery)) {
        galleryPicks = pick.gallery
          .map((p: string) => byPath.get(p))
          .filter(Boolean)
          .filter((a: any) => a.path !== (hero && hero.path))
          .slice(0, 3);
      }
    } catch {
      /* fall back to first asset as hero */
    }
  }
  const heroImage = hero
    ? { src: hero.url, alt: hero.alt || article.title, credit: hero.credit || 'Rockstar Games' }
    : null;
  const galleryImgs = galleryPicks.length
    ? galleryPicks.map((a) => ({ src: a.url, alt: a.alt || '', credit: a.credit || 'Rockstar Games' }))
    : null;

  // 3) save as an unpublished draft, classification taken from the intel story
  const isRumour = ['rumour', 'leak'].includes(s.category);
  const credibility = credibilityFor(s.source_tier, s.corroborated);
  const slug = await uniqueSlug(admin, slugify(article.title), s.draft_slug || undefined);
  const row = {
    slug,
    title: String(article.title || s.title).slice(0, 200),
    kicker: String(article.kicker || (isRumour ? 'Rumour' : 'News')).slice(0, 40),
    category_slug: 'news',
    excerpt: String(article.excerpt || '').slice(0, 300),
    body,
    gradient: gradientFor(s.category),
    reading_mins: Number(article.readingMins) || 4,
    motif: String(article.motif || 'signal'),
    hero_image: heroImage,
    gallery: galleryImgs,
    kind: 'article',
    is_rumour: isRumour,
    credibility,
    published: false,
    updated_at: new Date().toISOString(),
  };
  const { error: upErr } = await admin.from('articles').upsert(row, { onConflict: 'slug' });
  if (upErr) return NextResponse.json({ error: 'save failed: ' + upErr.message }, { status: 500 });
  await admin.from('intel_items').update({ draft_slug: slug }).eq('id', intel_id);

  return NextResponse.json({ ok: true, slug, draft: row });
}
