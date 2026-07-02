import { getSupabase } from './supabase';
import type { Guide, Article, Category, AnyContent } from './types';
import { MOCK_GUIDES, MOCK_ARTICLES, MOCK_CATEGORIES } from '@/content/mock';

/**
 * Data access for content. Every function tries Supabase first (when env is set)
 * and falls back to the mock content so the site runs with zero configuration.
 *
 * When you wire the database, implement the Supabase branch of each function
 * against the `guides` / `articles` / `categories` tables in the schema.
 */

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
    // const { data } = await sb.from('articles').select('*').order('updated_at', { ascending: false }).limit(limit);
    // if (data) return data.map(mapArticle);
  }
  return byNewest(MOCK_ARTICLES).slice(0, limit);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getLatestArticles(100);
  return articles.find((a) => a.slug === slug) ?? null;
}

export async function getFeatured(): Promise<Article> {
  const [first] = await getLatestArticles(1);
  return first;
}

export async function getRelated(current: AnyContent, limit = 3): Promise<AnyContent[]> {
  const all: AnyContent[] = [...(await getGuides()), ...(await getLatestArticles(100))];
  return all
    .filter((c) => c.slug !== current.slug && c.category === current.category)
    .slice(0, limit);
}

function byNewest<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
