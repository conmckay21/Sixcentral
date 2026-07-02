import Link from 'next/link';
import type { AnyContent, Guide } from '@/lib/types';
import { formatDate } from '@/lib/format';

function isGuide(c: AnyContent): c is Guide {
  return c.kind === 'guide';
}

export default function LongformArticle({
  content,
  related,
}: {
  content: AnyContent;
  related: AnyContent[];
}) {
  return (
    <article className="article">
      <div className="article__wrap">
        <div className="article__kicker">{content.kicker}</div>
        <h1>{content.title}</h1>
        <div className="article__meta">
          {isGuide(content) ? (
            <span>Updated {formatDate(content.updatedAt)}</span>
          ) : (
            <span className="article__check">✓ Facts checked {formatDate(content.updatedAt)}</span>
          )}
          <span>{content.readingMins} min read</span>
        </div>

        <div className="article__hero" style={{ background: content.gradient }}>
          <div className="v" />
        </div>

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

        {related.length > 0 && (
          <>
            <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.3rem', marginTop: '40px' }}>
              Related
            </h2>
            <div className="rows">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/${r.kind === 'guide' ? 'guides' : 'news'}/${r.slug}`}
                  className="row-item"
                >
                  <div className="row-item__thumb" style={{ background: r.gradient }} />
                  <div>
                    <div className="row-item__k">{r.kicker}</div>
                    <div className="row-item__t">{r.title}</div>
                    <div className="row-item__d">Updated {formatDate(r.updatedAt)}</div>
                  </div>
                </Link>
              ))}
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
