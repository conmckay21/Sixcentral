import Link from 'next/link';
import type { AnyContent, Guide } from '@/lib/types';
import { formatDate } from '@/lib/format';
import HeroMedia from '@/components/HeroMedia';
import MediaCarousel from '@/components/MediaCarousel';

function isGuide(c: AnyContent): c is Guide {
  return c.kind === 'guide';
}

export default function LongformArticle({
  content,
  related,
  reactions,
}: {
  content: AnyContent;
  related: AnyContent[];
  reactions?: React.ReactNode;
}) {
  return (
    <article className="article">
      <div className="article__wrap">
        <div className="article__kicker">{content.kicker}</div>
        <h1>{content.title}</h1>
        <div className="article__meta">
          {isGuide(content) ? (
            <span>Updated {formatDate(content.updatedAt)}</span>
          ) : content.isRumour ? (
            <span className="article__rumour-flag">Rumour · unconfirmed · heat {content.credibility ?? 2}/5</span>
          ) : (
            <span className="article__check">✓ Facts checked {formatDate(content.updatedAt)}</span>
          )}
          <span>{content.readingMins} min read</span>
        </div>

        <div className="article__hero" style={{ background: content.gradient }}>
          <HeroMedia motif={content.motif} gradient={content.gradient} heroImage={content.heroImage} showCredit />
          <div className="v" />
        </div>

        {!isGuide(content) && content.isRumour && (
          <div className="rumour-box">
            <strong>This is a Rumour Mill piece.</strong> Nothing here is confirmed by Rockstar
            unless explicitly marked. Our heat rating reflects the quality of the sourcing, not a
            promise. Confirmed facts live in the news section, never here.
          </div>
        )}

        <div className="prose">
          {content.body.map((block, i) => {
            if (block.type === 'h2') return <h2 key={i}>{block.text}</h2>;
            if (block.type === 'ul')
              return (
                <ul key={i}>
                  {block.items?.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              );
            return <p key={i}>{block.text}</p>;
          })}
        </div>

        {content.gallery && content.gallery.length > 0 && (
          <MediaCarousel images={content.gallery} title="The shots" />
        )}

        <p className="correction-cta">
          Spotted an error?{' '}
          <Link href={`/contribute?type=verified_correction&about=/${isGuide(content) ? 'guides' : 'news'}/${content.slug}`}>
            Report it
          </Link>{' '}
          and bank Respect on The Come-Up if you&rsquo;re right.
        </p>

        {isGuide(content) && content.trackable && (
          <div className="tracker-cta">
            <span className="ic">◎</span>
            <div>
              <div className="tl">Track this in the app</div>
              <div className="tt">{content.trackable.label}</div>
              <div className="td">
                Open SixCentral on your phone to see your progress on this synced live, and get
                pointed at exactly what you are still missing.
              </div>
            </div>
          </div>
        )}

        {reactions}

        {related.length > 0 && (
          <>
            <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.3rem', marginTop: '40px' }}>
              Related
            </h2>
            <div className="rows">
              {related.map((r) => {
                const rRumour = r.kind === 'article' && r.isRumour === true;
                return (
                  <Link
                    key={r.slug}
                    href={`/${r.kind === 'guide' ? 'guides' : 'news'}/${r.slug}`}
                    className={rRumour ? 'row-item row-item--rumour' : 'row-item'}
                  >
                    <div className="row-item__thumb">
                      <HeroMedia motif={r.motif} gradient={r.gradient} heroImage={r.heroImage} compact />
                    </div>
                    <div>
                      <div className={rRumour ? 'row-item__k row-item__k--rumour' : 'row-item__k'}>
                        {rRumour && <span className="rumour-chip">Rumour</span>}
                        {r.kicker}
                      </div>
                      <div className="row-item__t">{r.title}</div>
                      <div className="row-item__d">
                        {rRumour ? 'Unconfirmed · tracked ' : 'Updated '}
                        {formatDate(r.updatedAt)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <p className="disclaimer">
          SixCentral is an independent fan resource and is not affiliated with Rockstar Games or
          Take-Two Interactive. Facts are sourced from official Rockstar announcements; all artwork
          is original. This page may contain affiliate links.
        </p>
      </div>
    </article>
  );
}
