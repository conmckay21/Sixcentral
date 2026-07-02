import Link from 'next/link';
import Countdown from '@/components/Countdown';
import NewsletterSignup from '@/components/NewsletterSignup';
import GuideCard from '@/components/GuideCard';
import ArticleRow from '@/components/ArticleRow';
import { getGuides, getLatestArticles, getFeatured } from '@/lib/content';

export const metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const [guides, articles, featured] = await Promise.all([
    getGuides(),
    getLatestArticles(4),
    getFeatured(),
  ]);

  return (
    <>
      <section className="hero">
        <div className="wrap hero__grid">
          <div>
            <div className="kicker">The UK GTA 6 companion</div>
            <h1>
              Everything you need for <span className="c">Grand Theft Auto VI</span>
            </h1>
            <p>
              Verified guides, straight news, and an interactive tracker that knows what you have
              left to do. Built by fans, for the UK.
            </p>
          </div>
          <Countdown />
        </div>
      </section>

      {/* Featured */}
      <section className="section">
        <div className="wrap">
          <Link href={`/news/${featured.slug}`} className="card" style={{ minHeight: 220 }}>
            <div className="card__media" style={{ height: 220, background: featured.gradient }}>
              <div className="v" />
              <div style={{ position: 'absolute', bottom: 0, padding: 22, zIndex: 2 }}>
                <div className="card__kicker" style={{ color: 'var(--gold)' }}>
                  {featured.kicker} · updated
                </div>
                <div
                  style={{
                    fontFamily: 'var(--display)',
                    textTransform: 'uppercase',
                    fontSize: '2rem',
                    lineHeight: 0.98,
                    color: '#fff',
                    marginTop: 8,
                  }}
                >
                  {featured.title}
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Latest guides */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Latest <span className="c">guides</span>
            </h2>
            <Link href="/guides">All guides →</Link>
          </div>
          <div className="grid grid--3">
            {guides.slice(0, 3).map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </div>
      </section>

      {/* Latest news */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Latest <span className="c">news</span>
            </h2>
          </div>
          <div className="rows">
            {articles.map((a) => (
              <ArticleRow key={a.slug} article={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Launch list */}
      <section className="section" id="newsletter">
        <div className="wrap">
          <NewsletterSignup source="home" />
        </div>
      </section>

      {/* App teaser */}
      <section className="section" id="app">
        <div className="wrap">
          <div
            className="card"
            style={{
              padding: 30,
              background: 'linear-gradient(160deg, rgba(255,46,136,0.14), var(--bg2))',
              borderColor: 'var(--pink)',
            }}
          >
            <div className="kicker" style={{ color: 'var(--pink-l)' }}>
              The companion app
            </div>
            <h2
              style={{
                fontFamily: 'var(--display)',
                textTransform: 'uppercase',
                fontSize: '1.8rem',
                margin: '8px 0',
              }}
            >
              Track your 100% on the go
            </h2>
            <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
              An interactive map, collectible tracking that syncs with these guides, a community
              clip feed, and a reputation ladder for the people mapping the game. Coming to iOS and
              Android.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
