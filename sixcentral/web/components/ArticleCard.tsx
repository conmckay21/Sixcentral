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

/** Vertical card for the home carousels. Server component: dates render once. */
export default function ArticleCard({ article }: { article: Article }) {
  const rumour = article.isRumour === true;
  return (
    <Link href={`/news/${article.slug}`} className={rumour ? 'ccard ccard--rumour' : 'ccard'}>
      <div className="ccard__thumb">
        <HeroMedia motif={article.motif} gradient={article.gradient} heroImage={article.heroImage} compact />
      </div>
      <div className="ccard__body">
        <div className={rumour ? 'ccard__k ccard__k--rumour' : 'ccard__k'}>
          {rumour ? (
            <>
              <span className="rumour-chip">Rumour</span> Heat <Heat level={article.credibility ?? 2} />
            </>
          ) : (
            article.kicker
          )}
        </div>
        <div className="ccard__t">{article.title}</div>
        <div className="ccard__d">
          {rumour ? 'Unconfirmed · tracked ' : 'Facts checked '}
          {formatDate(article.updatedAt)}
          {(article.upCount ?? 0) + (article.downCount ?? 0) > 0 && (
            <> · 👍 {article.upCount ?? 0} · 👎 {article.downCount ?? 0}</>
          )}
        </div>
      </div>
    </Link>
  );
}
