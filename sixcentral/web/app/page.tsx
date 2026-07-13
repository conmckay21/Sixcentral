import Link from 'next/link';
import Countdown from '@/components/Countdown';
import AppStoreBadge from '@/components/AppStoreBadge';
import NewsletterSignup from '@/components/NewsletterSignup';
import HeroMedia from '@/components/HeroMedia';
import ArticleCard from '@/components/ArticleCard';
import Carousel from '@/components/Carousel';
import { getLatestArticles, getFeatured, getRumours, getControversies } from '@/lib/content';

export const metadata = { alternates: { canonical: '/' } };

// Without this the home page is prerendered once at build time and never again,
// so anything published from the Intel Desk never reaches it. Publishing also
// revalidates this path on demand, so 60s is only the safety net.
export const revalidate = 60;

export default async function HomePage() {
  const [articles, featured, rumours, controversies] = await Promise.all([
    getLatestArticles(8),
    getFeatured(),
    getRumours(8),
    getControversies(4),
  ]);

  return (
    <>
      <section className="hero">
        <div className="wrap hero__grid">
          <div>
            <div className="kicker">The GTA 6 companion</div>
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
              <HeroMedia motif={featured.motif} gradient={featured.gradient} heroImage={featured.heroImage} />
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
                {(featured.upCount ?? 0) + (featured.downCount ?? 0) > 0 && (
                  <div className="mono" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', marginTop: 8 }}>
                    👍 {featured.upCount ?? 0} · 👎 {featured.downCount ?? 0}
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* The guides desk */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The guides <span className="c">desk</span>
            </h2>
            <Link href="/guides">What&rsquo;s coming &rarr;</Link>
          </div>
          <Link href="/guides" className="card" style={{ padding: 28, display: 'block' }}>
            <div className="kicker" style={{ color: 'var(--green)' }}>The plan</div>
            <div
              style={{
                fontFamily: 'var(--display)',
                textTransform: 'uppercase',
                fontSize: '1.6rem',
                margin: '8px 0',
              }}
            >
              Everything from A to Z, the moment there is a game to guide
            </div>
            <p style={{ color: 'var(--muted)', maxWidth: '66ch' }}>
              Spoiler-safe story walkthrough, the 100% checklist, every collectible on our own
              community-verified map, money &amp; businesses, trophies live the day the list
              publishes. Nothing gets published before we can verify it in-game. That is the promise.
            </p>
          </Link>
        </div>
      </section>

      {/* Latest news */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Latest <span className="c">news</span>
            </h2>
            <Link href="/news">All news &rarr;</Link>
          </div>
          <Carousel label="Latest news">
            {articles
              .filter((a) => a.slug !== featured.slug)
              .map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
          </Carousel>
        </div>
      </section>

      {/* The Rumour Mill */}
      <section className="section section--rumour" id="rumour-mill">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The <span className="r">rumour mill</span>
            </h2>
            <span className="rumour-note">Unconfirmed by design. Never mixed with the facts.</span>
          </div>
          <Carousel label="The Rumour Mill">
            {rumours.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </Carousel>
        </div>
      </section>

      {controversies.length > 0 && (
        <section className="section" id="rap-sheet">
          <div className="wrap">
            <div className="section__head">
              <h2>
                The <span className="g">Rap Sheet</span>
              </h2>
              <Link href="/rap-sheet" className="mono" style={{ fontSize: '0.72rem', color: 'var(--gold, #FFC83D)' }}>
                Every offence on the record &rarr;
              </Link>
            </div>
            <div className="grid grid--3">
              {controversies.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Launch list */}
      <section className="section" id="newsletter">
        <div className="wrap">
          <NewsletterSignup source="home" />
        </div>
      </section>

      {/* The app + the crew */}
      <section className="section" id="app">
        <div className="wrap">
          <div className="grid grid--2">
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
                Now on the App Store
              </h2>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                Verified news, the countdown, community clips and The Come-Up, free on iPhone.
                The Leonida map and 100% tracker unlock at launch. Android is in the works.
              </p>
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <AppStoreBadge />
                <Link href="/app" className="mono" style={{ fontSize: '0.74rem', color: 'var(--cyan)' }}>
                  What&rsquo;s inside &rarr;
                </Link>
              </div>
            </div>
            <div
              className="card"
              style={{
                padding: 30,
                background: 'linear-gradient(160deg, rgba(31,229,214,0.12), var(--bg2))',
                borderColor: 'var(--cyan)',
              }}
              id="community"
            >
              <div className="kicker">The community</div>
              <h2
                style={{
                  fontFamily: 'var(--display)',
                  textTransform: 'uppercase',
                  fontSize: '1.8rem',
                  margin: '8px 0',
                }}
              >
                Join the crew
              </h2>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                The Discord is where SixCentral gets built: founding contributors, pre-order intel,
                and first access to everything. Confirmed contributions earn Respect on The Come-Up.
                Climb the ladder and Premium comes free at Lieutenant.
              </p>
              <a className="btn-crew" href="/account">
                Join the crew
              </a>
              <p className="crew-note">Create your account, and the Discord opens from your account page.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
