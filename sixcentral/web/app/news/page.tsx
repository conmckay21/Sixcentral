import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import NewsletterSignup from '@/components/NewsletterSignup';
import { getLatestArticles, getRumours } from '@/lib/content';

export const metadata: Metadata = {
  title: 'GTA 6 news, checked before it ships',
  description:
    'Every Grand Theft Auto VI story SixCentral has published. Confirmed facts on top, rumours kept in their own lane and clearly marked.',
  alternates: { canonical: '/news' },
};

// Publishing revalidates this path on demand. The timer is the safety net.
export const revalidate = 60;

export default async function NewsIndex() {
  const [articles, rumours] = await Promise.all([getLatestArticles(60), getRumours(60)]);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker">The news desk</div>
          <h1>
            GTA 6 news, <span className="c">checked before it ships</span>
          </h1>
          <p style={{ maxWidth: '66ch' }}>
            Confirmed facts first, sourced and dated. Rumours live further down, clearly marked and
            never dressed up as fact.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Confirmed <span className="c">news</span>
            </h2>
            <span className="rumour-note">
              {articles.length} {articles.length === 1 ? 'story' : 'stories'}
            </span>
          </div>
          {articles.length ? (
            <div className="grid grid--3">
              {articles.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>Nothing published yet. Check back shortly.</p>
          )}
        </div>
      </section>

      <section className="section section--rumour" id="rumour-mill">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The <span className="r">rumour mill</span>
            </h2>
            <span className="rumour-note">Unconfirmed by design. Never mixed with the facts.</span>
          </div>
          {rumours.length ? (
            <div className="grid grid--3">
              {rumours.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>Nothing in the mill right now.</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Start <span className="c">here</span>
            </h2>
            <Link href="/news/everything-confirmed">Everything confirmed &rarr;</Link>
          </div>
          <NewsletterSignup source="news" />
        </div>
      </section>
    </>
  );
}
