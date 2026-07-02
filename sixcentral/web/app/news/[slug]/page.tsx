import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LongformArticle from '@/components/LongformArticle';
import { getAllArticles, getArticleBySlug, getRelated } from '@/lib/content';

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: 'Article not found' };
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/news/${article.slug}` },
  };
}

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const related = await getRelated(article);
  return <LongformArticle content={article} related={related} />;
}
