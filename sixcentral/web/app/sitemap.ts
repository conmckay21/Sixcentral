import type { MetadataRoute } from 'next';
import { getGuides, getLatestArticles } from '@/lib/content';

const BASE = 'https://sixcentral.co.uk';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [guides, articles] = await Promise.all([getGuides(), getLatestArticles(100)]);

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/guides`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...guides.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: new Date(g.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...articles.map((a) => ({
      url: `${BASE}/news/${a.slug}`,
      lastModified: new Date(a.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
