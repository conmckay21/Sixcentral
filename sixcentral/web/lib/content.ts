import { getSupabase } from './supabase';
import type { Guide, Article, Category, AnyContent } from './types';
import { MOCK_GUIDES, MOCK_ARTICLES, MOCK_CATEGORIES } from '@/content/mock';

/**
 * Data access for content. Articles read from Supabase when the DB has them and
 * fall back to the mock content otherwise, so the site never goes dark: before
 * the articles are migrated the DB returns nothing and mock is served; once the
 * table is populated it takes over automatically. Guides still use mock.
 */

// Supabase row -> Article shape used across the site.
function mapArticle(r: any): Article {
  return {
    kind: 'article',
    slug: r.slug,
    title: r.title,
    kicker: r.kicker ?? '',
    category: r.category_slug ?? '',
    excerpt: r.excerpt ?? '',
    updatedAt: typeof r.updated_at === 'string' ? r.updated_at.slice(0, 10) : r.updated_at,
    publishedAt: r.published_at
      ? String(r.published_at).slice(0, 10)
      : typeof r.updated_at === 'string'
        ? r.updated_at.slice(0, 10)
        : r.updated_at,
    readingMins: r.reading_mins ?? 5,
    body: Array.isArray(r.body) ? r.body : [],
    gradient: r.gradient ?? '',
    motif: r.motif ?? undefined,
    heroImage: r.hero_image ?? undefined,
    gallery: r.gallery ?? undefined,
    isNew: r.is_new ?? undefined,
    isRumour: r.is_rumour ?? undefined,
    credibility: (r.credibility ?? undefined) as Article['credibility'],
  };
}

export async function getCategories(): Promise<Category[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('categories').select('slug,name').order('name');
    if (data && data.length) return [{ slug: 'all', name: 'All' }, ...data];
  }
  return MOCK_CATEGORIES;
}

export async function getGuides(): Promise<Guide[]> {
  const sb = getSupabase();
  if (sb) {
    // const { data } = await sb.from('guides').select('*').order('updated_at', { ascending: false });
    // if (data) return data.map(mapGuide);
  }
  return byNewest(MOCK_GUIDES);
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const guides = await getGuides();
  return guides.find((g) => g.slug === slug) ?? null;
}

export async function getLatestArticles(limit = 6): Promise<Article[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('articles')
      .select('*')
      .eq('published', true)
      .eq('is_rumour', false)
      .neq('category_slug', 'controversy')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (data && data.length) return data.map(mapArticle);
  }
  return byNewest(MOCK_ARTICLES.filter((a) => !a.isRumour && a.category !== 'controversy')).slice(0, limit);
}

/** Rumour Mill: explicitly unconfirmed pieces, kept out of Latest News. */
export async function getRumours(limit = 6): Promise<Article[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('articles')
      .select('*')
      .eq('published', true)
      .eq('is_rumour', true)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (data && data.length) return data.map(mapArticle);
  }
  return byNewest(MOCK_ARTICLES.filter((a) => a.isRumour)).slice(0, limit);
}

/** The Rap Sheet: documented controversies, every offence on the record. */
export async function getControversies(limit = 6): Promise<Article[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('articles')
      .select('*')
      .eq('published', true)
      .eq('category_slug', 'controversy')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (data && data.length) return data.map(mapArticle);
  }
  return byNewest(MOCK_ARTICLES.filter((a) => a.category === 'controversy')).slice(0, limit);
}

/** Every article, facts and rumours: for routing, sitemaps and lookups. */
export async function getAllArticles(): Promise<Article[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('articles')
      .select('*')
      .eq('published', true)
      .order('updated_at', { ascending: false });
    if (data && data.length) return data.map(mapArticle);
  }
  return byNewest(MOCK_ARTICLES);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('articles').select('*').eq('slug', slug).maybeSingle();
    if (data) return mapArticle(data);
  }
  const articles = await getAllArticles();
  return articles.find((a) => a.slug === slug) ?? null;
}

export async function getFeatured(): Promise<Article> {
  const [first] = await getLatestArticles(1);
  return first;
}

export async function getRelated(current: AnyContent, limit = 3): Promise<AnyContent[]> {
  const all: AnyContent[] = [...(await getGuides()), ...(await getAllArticles())];
  return all
    .filter((c) => c.slug !== current.slug && c.category === current.category)
    .slice(0, limit);
}

function byNewest<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
