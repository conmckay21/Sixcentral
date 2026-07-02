import { NextResponse } from 'next/server';
import { getArticleBySlug, getGuideBySlug } from '@/lib/content';

export const revalidate = 300;

const SITE = 'https://sixcentral.co.uk';
const abs = (u: string) => (u.startsWith('/') ? `${SITE}${u}` : u);
const absImg = <T extends { src: string }>(img?: T): T | undefined =>
  img ? { ...img, src: abs(img.src) } : undefined;

/** Full content item, body blocks included, for native rendering in the app. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const item = (await getArticleBySlug(params.slug)) ?? (await getGuideBySlug(params.slug));
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    ...item,
    heroImage: absImg(item.heroImage),
    gallery: item.gallery?.map((g) => absImg(g)),
  });
}
