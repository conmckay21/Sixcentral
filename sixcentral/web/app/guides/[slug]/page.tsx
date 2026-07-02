import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LongformArticle from '@/components/LongformArticle';
import { getGuides, getGuideBySlug, getRelated } from '@/lib/content';

export async function generateStaticParams() {
  const guides = await getGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const guide = await getGuideBySlug(params.slug);
  if (!guide) return { title: 'Guide not found' };
  return {
    title: guide.title,
    description: guide.excerpt,
    alternates: { canonical: `/guides/${guide.slug}` },
  };
}

export default async function GuideDetail({ params }: { params: { slug: string } }) {
  const guide = await getGuideBySlug(params.slug);
  if (!guide) notFound();

  const related = await getRelated(guide);
  return <LongformArticle content={guide} related={related} />;
}
