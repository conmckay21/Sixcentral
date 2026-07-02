import Link from 'next/link';
import type { Article } from '@/lib/types';
import { formatDate } from '@/lib/format';
import HeroMedia from '@/components/HeroMedia';

function Heat({ level }: { level: number }) {
  return (
    <span className="heat" aria-label={`Heat ${level} out of 5`}>
      {'▮'.repeat(level)}
      <span className="heat__off">{'▮'.repeat(5 - level)}</span>
    </span>
  );
}

export default function ArticleRow({ article }: { article: Article }) {
  const rumour = article.isRumour === true;
  return (
    <Link href={`/news/${article.slug}`} className={rumour ? 'row-item row-item--rumour' : 'row-item'}>
      <div className="row-item__thumb">
        <HeroMedia motif={article.motif} gradient={article.gradient} heroImage={article.heroImage} compact />
      </div>
      <div>
        <div className={rumour ? 'row-item__k row-item__k--rumour' : 'row-item__k'}>
          {rumour ? (
            <>
              <span className="rumour-chip">Rumour</span> Heat <Heat level={article.credibility ?? 2} />
            </>
          ) : (
            article.kicker
          )}
        </div>
        <div className="row-item__t">{article.title}</div>
        <div className="row-item__d">
          {rumour ? 'Unconfirmed · tracked ' : 'Facts checked '}
          {formatDate(article.updatedAt)}
        </div>
      </div>
    </Link>
  );
}
