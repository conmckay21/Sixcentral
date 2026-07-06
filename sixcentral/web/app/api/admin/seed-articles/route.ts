import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MOCK_ARTICLES } from '@/content/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-time (and safe to repeat) migration: copies the site's articles from
 * content into the Supabase `articles` table. Upserts by slug, so re-running
 * refreshes rather than duplicates. Guarded by CRON_SECRET.
 *
 *   curl -s -H "Authorization: Bearer YOUR_SECRET" https://sixcentral.co.uk/api/admin/seed-articles
 */
function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Ensure every category an article references exists first (there is a
  // foreign key on articles.category_slug). Existing categories are left alone.
  const catSlugs = Array.from(new Set(MOCK_ARTICLES.map((a) => a.category).filter(Boolean)));
  const catRows = catSlugs.map((slug) => ({
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
  }));
  if (catRows.length) {
    const { error: catErr } = await sb
      .from('categories')
      .upsert(catRows, { onConflict: 'slug', ignoreDuplicates: true });
    if (catErr) {
      return NextResponse.json({ ok: false, error: 'categories: ' + catErr.message }, { status: 500 });
    }
  }

  const rows = MOCK_ARTICLES.map((a) => ({
    slug: a.slug,
    title: a.title,
    kicker: a.kicker ?? null,
    category_slug: a.category ?? null,
    excerpt: a.excerpt ?? null,
    body: a.body ?? [],
    gradient: a.gradient ?? null,
    reading_mins: a.readingMins ?? 5,
    is_new: a.isNew ?? false,
    motif: a.motif ?? null,
    hero_image: a.heroImage ?? null,
    gallery: a.gallery ?? null,
    kind: 'article',
    is_rumour: a.isRumour ?? false,
    credibility: a.credibility ?? null,
    published: true,
    updated_at: a.updatedAt,
  }));

  const { error } = await sb.from('articles').upsert(rows, { onConflict: 'slug' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, migrated: rows.length, categories: catRows.length });
}
