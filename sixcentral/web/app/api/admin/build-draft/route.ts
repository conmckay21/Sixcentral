import { NextResponse } from 'next/server';
import {
  adminClient,
  staffUserId,
  claude,
  slugify,
  uniqueSlug,
  credibilityFor,
  gradientFor,
} from '@/lib/draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ARTICLE_SYSTEM = `You are the writer for SixCentral, an independent GTA 6 companion site. Write a complete news article from the intel brief provided.

Voice and rules:
- SixCentral's position is confirmed over rumour. If the brief is a rumour or leak, say clearly in the piece that it is unconfirmed and attribute it to its source. If it is confirmed, state it plainly.
- UK English. Never use em dashes. Human, punchy and clear, never robotic and never hyperbolic.
- Do not invent facts beyond the brief and its sources. Do not fabricate quotes.

Length and shape:
- 1200 words minimum, 1400 the target. This is a proper piece, not a news brief.
- At least four subheadings, each opening a section that genuinely earns its place.
- Never pad to reach the count. If you are running short, go deeper: the background a new reader needs, how this compares to what Rockstar did with GTA 5, what it means for UK buyers specifically, what would have to happen next for this to change, and what the counter-argument is. Depth beats repetition every time.
- Structure the piece: what happened, what is confirmed versus what is only claimed, the background and context, what it means for players, what happens next, and the receipts, naming sources in the text.

Leaks: you may describe what a leak claims, in your own words, clearly labelled unconfirmed and attributed to where the claim circulated. Never quote leaked documents, never describe leaked footage or images shot by shot, never tell readers where to find leaked material. Claims in text only, never the goods.

Reply in this exact plain text format. Do not use JSON. Do not use markdown or code fences.

TITLE: headline, punchy, under 70 characters
KICKER: a 2 to 3 word label such as Analysis, Breaking or Rumour
EXCERPT: one sentence summary under 160 characters
READING_MINS: a whole number
MOTIF: one of: skyline palms cassette disc money map signal phone controller pc globe question
BODY:
===P
a paragraph of body copy
===H2
a subheading
===P
another paragraph
===UL
- a bullet point
- another bullet point

Rules for the body:
- Open every block with its own ===P, ===H2 or ===UL marker on its own line.
- ===P is one paragraph. ===H2 is one subheading. ===UL is a list, one item per line, each starting with a hyphen.
- Use ===UL only where a list genuinely helps. Most of the piece is paragraphs.
- Never write === anywhere except as a block marker.
- Apostrophes and quotation marks are safe to use freely, write naturally and do not escape anything.`;

const PICK_SYSTEM_BASE = `You choose images for a GTA 6 news article from a catalogue of described images. Pick the single best hero image whose subject and mood match the article. Prefer a specific scene, location or character over generic promotional key art or box art. Only choose promotional artwork when nothing else in the catalogue is a defensible fit.`;
const PICK_SYSTEM_TAIL = `Reply with ONLY JSON, no fences: {"hero":"exact path","gallery":["exact path","exact path","exact path"]}. Use exact path strings from the catalogue. If no gallery is requested, return an empty array.`;

/** Read a single-line field out of the article head. */
function fieldLine(text: string, name: string): string {
  const m = text.match(new RegExp('^' + name + ':[ \\t]*(.*)$', 'm'));
  return m ? m[1].trim() : '';
}

/** Split the delimited article into head fields and typed body blocks. */
function parseArticle(raw: string): {
  title: string;
  kicker: string;
  excerpt: string;
  readingMins: number;
  motif: string;
  body: any[];
} {
  const marker = raw.match(/^BODY:[ \t]*$/m);
  const head = marker ? raw.slice(0, marker.index) : raw;
  const bodyRaw = marker ? raw.slice((marker.index || 0) + marker[0].length) : '';

  const body: any[] = [];
  const parts = bodyRaw.split(/^===(P|H2|UL)[ \t]*$/im);
  for (let i = 1; i < parts.length; i += 2) {
    const tag = String(parts[i] || '').toUpperCase();
    const content = String(parts[i + 1] || '').trim();
    if (!content) continue;
    if (tag === 'UL') {
      const items = content
        .split('\n')
        .map((l) => l.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean);
      if (items.length) body.push({ type: 'ul', items });
    } else {
      body.push({
        type: tag === 'H2' ? 'h2' : 'p',
        text: content.replace(/\s+/g, ' ').trim(),
      });
    }
  }

  const mins = parseInt(fieldLine(head, 'READING_MINS'), 10);
  return {
    title: fieldLine(head, 'TITLE'),
    kicker: fieldLine(head, 'KICKER'),
    excerpt: fieldLine(head, 'EXCERPT'),
    readingMins: Number.isFinite(mins) && mins > 0 ? mins : 6,
    motif: fieldLine(head, 'MOTIF') || 'signal',
    body,
  };
}

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

  let raw = '';
  let article: ReturnType<typeof parseArticle>;
  try {
    raw = await claude(ARTICLE_SYSTEM, brief, 6000);
    article = parseArticle(raw);
  } catch (e: any) {
    const peek = raw ? ' | raw: ' + raw.slice(0, 160).replace(/\s+/g, ' ') : '';
    return NextResponse.json(
      { error: 'article generation failed: ' + String(e?.message || e).slice(0, 200) + peek },
      { status: 502 }
    );
  }
  if (!article.title || !article.body.length) {
    const peek = raw ? ' | raw: ' + raw.slice(0, 160).replace(/\s+/g, ' ') : '';
    return NextResponse.json({ error: 'article came back unparsable' + peek }, { status: 502 });
  }
  const body = article.body;
  const wordCount = body.reduce((n: number, b: any) => {
    const text = b.type === 'ul' ? (b.items || []).join(' ') : b.text || '';
    return n + String(text).split(/\s+/).filter(Boolean).length;
  }, 0);
  if (wordCount < 900) {
    console.warn('[build-draft] short article:', wordCount, 'words for', article.title);
  }

  // 2) pick images from the catalogue
  const RECENT_EXCLUDE = 8;
  const { data: recentRows } = await admin
    .from('articles')
    .select('hero_image')
    .not('hero_image', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(RECENT_EXCLUDE);
  const recentSrcs = new Set(
    (recentRows || []).map((r: any) => r?.hero_image?.src).filter(Boolean)
  );

  const { data: assetsData } = await admin
    .from('media_assets')
    .select('path,url,alt,credit,description')
    .order('path', { ascending: true })
    .limit(400);
  const allAssets: any[] = assetsData || [];
  const fresh = allAssets.filter((a) => !recentSrcs.has(a.url));
  const assets: any[] = fresh.length >= 20 ? fresh : allAssets;

  let hero: any = assets.length ? assets[Math.floor(Math.random() * assets.length)] : null;
  let galleryPicks: any[] = [];

  if (assets.length) {
    const catalogue = assets
      .map(
        (a) =>
          `${a.path} :: ${(a.description || a.alt || '').replace(/\s+/g, ' ').slice(0, 140)}`
      )
      .join('\n');
    const sys =
      PICK_SYSTEM_BASE +
      (gallery ? ' Also pick 3 different gallery images that complement the hero. ' : ' ') +
      PICK_SYSTEM_TAIL;
    try {
      const pickRaw = await claude(
        sys,
        `Article: ${article.title}\n${article.excerpt}\n\nCatalogue:\n${catalogue}`,
        300
      );
      const a = pickRaw.indexOf('{');
      const b = pickRaw.lastIndexOf('}');
      const pick = JSON.parse(a >= 0 && b > a ? pickRaw.slice(a, b + 1) : pickRaw);
      const byPath = new Map(assets.map((x) => [x.path, x]));
      const picked = byPath.get(pick.hero);
      if (picked) {
        hero = picked;
      } else {
        console.warn('[build-draft] hero not in catalogue:', pick.hero);
      }
      if (gallery && Array.isArray(pick.gallery)) {
        galleryPicks = pick.gallery
          .map((path: string) => byPath.get(path))
          .filter(Boolean)
          .filter((x: any) => x.path !== (hero && hero.path))
          .slice(0, 3);
      }
    } catch (e) {
      console.warn('[build-draft] image pick failed, random fallback:', e);
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
    reading_mins: article.readingMins,
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

  return NextResponse.json({ ok: true, slug, words: wordCount, draft: row });
}
