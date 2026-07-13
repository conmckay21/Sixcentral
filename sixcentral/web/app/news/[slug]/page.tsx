import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LongformArticle from '@/components/LongformArticle';
import ArticleReactions from '@/components/ArticleReactions';
import { getAllArticles, getArticleBySlug, getRelated } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

// Regenerate from the database periodically, and render new slugs on demand.
export const revalidate = 300;

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
    openGraph: {
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      ...(article.heroImage
        ? { images: [{ url: article.heroImage.src, alt: article.heroImage.alt }] }
        : {}),
    },
  };
}

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const related = await getRelated(article);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt ?? article.updatedAt,
    dateModified: article.updatedAt,
    ...(article.heroImage ? { image: [article.heroImage.src] } : {}),
    author: [{ '@type': 'Organization', name: 'SixCentral', url: SITE_URL }],
    publisher: {
      '@type': 'Organization',
      name: 'SixCentral',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/app/app-icon.png` },
    },
    mainEntityOfPage: `${SITE_URL}/news/${article.slug}`,
    isAccessibleForFree: true,
  };
  return (
    <>
      <LongformArticle content={article} related={related} reactions={<ArticleReactions slug={article.slug} />} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
