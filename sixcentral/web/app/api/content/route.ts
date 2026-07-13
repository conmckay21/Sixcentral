import { NextResponse } from 'next/server';
import { getAllArticles, getGuides } from '@/lib/content';

export const revalidate = 60;

const SITE = 'https://sixcentral.co.uk';
const abs = (u: string) => (u.startsWith('/') ? `${SITE}${u}` : u);
const absImg = <T extends { src: string }>(img?: T): T | undefined =>
  img ? { ...img, src: abs(img.src) } : undefined;

/** Lean content index for the app: everything but body blocks and galleries. */
export async function GET() {
  const [articles, guides] = await Promise.all([getAllArticles(), getGuides()]);
  return NextResponse.json({
    articles: articles.map(({ body: _b, gallery: _g, ...a }) => ({ ...a, heroImage: absImg(a.heroImage) })),
    guides: guides.map(({ body: _b, gallery: _g, ...g }) => ({ ...g, heroImage: absImg(g.heroImage) })),
  });
}
