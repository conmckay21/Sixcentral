import Link from 'next/link';
import type { Article } from '@/lib/types';
import { formatDate } from '@/lib/format';

export default function ArticleRow({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`} className="row-item">
      <div className="row-item__thumb" style={{ background: article.gradient }} />
      <div>
        <div className="row-item__k">{article.kicker}</div>
        <div className="row-item__t">{article.title}</div>
        <div className="row-item__d">Updated {formatDate(article.updatedAt)}</div>
      </div>
    </Link>
  );
}
