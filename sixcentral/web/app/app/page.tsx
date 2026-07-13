import Image from 'next/image';
import Link from 'next/link';
import AppStoreBadge from '@/components/AppStoreBadge';
import NewsletterSignup from '@/components/NewsletterSignup';
import { APP_STORE_URL, SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'The SixCentral app for iPhone',
  description:
    'The GTA 6 companion, now on the App Store. Verified news, the countdown, community clips and The Come-Up today; the Leonida map and 100% tracker unlock at launch. Free on iPhone.',
  alternates: { canonical: '/app' },
  openGraph: {
    title: 'The SixCentral app for iPhone',
    description:
      'The GTA 6 companion, now on the App Store. Free on iPhone; Android in the works.',
  },
};

/**
 * App Store screenshots. Drop the approved ASC set into
 * /public/app/screens/ and list them here; the section below renders
 * nothing while this array is empty, so the page deploys clean either way.
 * Sources are 520x1055 (status bar cropped); keep that ratio in the entries.
 */
const SCREENS: { src: string; alt: string }[] = [
  { src: '/app/screens/01-home.webp', alt: 'The home feed: countdown to launch, the big read and the latest verified stories' },
  { src: '/app/screens/02-guides.webp', alt: 'The guides desk: live guides now, the rest landing with the game' },
  { src: '/app/screens/03-map.webp', alt: 'The Leonida map, locked until Rockstar shows theirs, with verified landmark counts' },
  { src: '/app/screens/04-progress.webp', alt: 'The 100% tracker at zero, ready to sync the day the checklist publishes' },
  { src: '/app/screens/05-profile.webp', alt: 'A SixCentral profile with Respect, friends and The Come-Up top five' },
  { src: '/app/screens/06-respect.webp', alt: 'The Earning Respect sheet: what confirmed contributions pay' },
  { src: '/app/screens/07-rumour-mill.webp', alt: 'A Rumour Mill piece with its heat rating and unconfirmed-by-design banner' },
];

const TODAY = [
  {
    k: 'News desk',
    c: 'var(--cyan)',
    t: 'Facts, checked, in your pocket',
    d: 'Every story from the news desk, fact-checked before it publishes. Rumours stay quarantined in the Rumour Mill, exactly like the site.',
  },
  {
    k: 'The countdown',
    c: 'var(--gold)',
    t: 'Launch night, to the second',
    d: 'The clock to 19 November sits at the top of the feed. No maths, no time zone guesswork.',
  },
  {
    k: 'Clips',
    c: 'var(--pink-l)',
    t: 'The community clip feed',
    d: 'Watch, vote and share the best trailer breakdowns and community clips. The strongest ones get promoted; Clip of the Month lives here.',
  },
  {
    k: 'The Come-Up',
    c: 'var(--green)',
    t: 'Respect follows you',
    d: 'Your handle, your rank and your Respect sync with the site. Confirmed contributions climb the ladder wherever you earned them.',
  },
  {
    k: 'Guides',
    c: 'var(--purple)',
    t: 'The guides desk, mobile',
    d: 'Everything published on the desk, formatted for one thumb. Spoiler-safe by default, the moment there is a game to guide.',
  },
  {
    k: 'Intel',
    c: 'var(--orange)',
    t: 'Verified landmarks only',
    d: 'Every landmark in the app is sourced and receipted from official material. If Rockstar has not shown it, we have not mapped it.',
  },
];

export default function AppPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="wrap hero__grid">
          <div>
            <div className="kicker" style={{ color: 'var(--pink-l)' }}>
              The companion app · now on the App Store
            </div>
            <h1>
              SixCentral, <span className="c">in your pocket</span>
            </h1>
            <p>
              The GTA 6 companion is live on iPhone. Verified news, the countdown, community
              clips and The Come-Up today, with the Leonida map and 100% tracker primed for
              launch night.
            </p>
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <AppStoreBadge height={56} />
              <span className="mono" style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Free on iPhone · Android in the works
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                position: 'relative',
                borderRadius: 44,
                overflow: 'hidden',
                border: '1px solid var(--line2)',
                boxShadow: '0 30px 80px rgba(255,46,136,0.22), 0 10px 40px rgba(0,0,0,0.6)',
              }}
            >
              <Image
                src="/app/app-icon.png"
                alt="The SixCentral app icon"
                width={220}
                height={220}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* In the app today */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              In the app <span className="c">today</span>
            </h2>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              Get it free &rarr;
            </a>
          </div>
          <div className="grid grid--3">
            {TODAY.map((f) => (
              <div key={f.k} className="card" style={{ padding: 20 }}>
                <div className="card__kicker" style={{ color: f.c }}>{f.k}</div>
                <div className="card__title" style={{ margin: '8px 0 6px' }}>{f.t}</div>
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {SCREENS.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="section__head">
              <h2>
                Straight from the <span className="c">app</span>
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
              {SCREENS.map((sc) => (
                <Image
                  key={sc.src}
                  src={sc.src}
                  alt={sc.alt}
                  width={260}
                  height={527}
                  style={{ borderRadius: 22, border: '1px solid var(--line2)', flex: '0 0 auto' }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Built for launch night */}
      <section className="section section--rumour">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Built for <span className="r">launch night</span>
            </h2>
            <span className="rumour-note">Two tabs, waiting on Rockstar</span>
          </div>
          <div className="grid grid--2">
            <div
              className="card"
              style={{
                padding: 30,
                background: 'linear-gradient(160deg, rgba(31,229,214,0.1), var(--bg2))',
                borderColor: 'var(--cyan)',
              }}
            >
              <div className="kicker">The Leonida map</div>
              <h3
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  fontSize: '1.5rem',
                  margin: '8px 0',
                }}
              >
                Locked until Rockstar shows theirs
              </h3>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                The interactive map opens when the real one does. Until then it holds verified
                landmarks only, each one sourced and receipted from official material. No leaked
                geography, ever. That is the deal.
              </p>
            </div>
            <div
              className="card"
              style={{
                padding: 30,
                background: 'linear-gradient(160deg, rgba(53,226,124,0.1), var(--bg2))',
                borderColor: 'var(--green)',
              }}
            >
              <div className="kicker" style={{ color: 'var(--green)' }}>The 100% tracker</div>
              <h3
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  fontSize: '1.5rem',
                  margin: '8px 0',
                }}
              >
                Zero percent, on purpose
              </h3>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                Progress sits at 0% and syncs with the guides desk the day the checklist
                publishes. Install now and your tracker is ready the second the game is.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Android + launch list */}
      <section className="section">
        <div className="wrap">
          <div className="grid grid--2">
            <div className="card" style={{ padding: 30 }}>
              <div className="kicker" style={{ color: 'var(--gold)' }}>Android</div>
              <h3
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  fontSize: '1.5rem',
                  margin: '8px 0',
                }}
              >
                In the works
              </h3>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                The Android build is on the bench and the launch list hears first. One email when
                it lands, nothing else. iPhone crew can{' '}
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>
                  get it today
                </a>
                .
              </p>
            </div>
            <NewsletterSignup source="app-page" />
          </div>
          <p className="disclaimer">
            SixCentral is an independent fan-made companion and is not affiliated with, endorsed
            by, or sponsored by Rockstar Games or Take-Two Interactive. Requires an iPhone; see
            the App Store listing for details.
          </p>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'SixCentral',
            operatingSystem: 'iOS',
            applicationCategory: 'EntertainmentApplication',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
            url: `${SITE_URL}/app`,
            installUrl: APP_STORE_URL,
          }),
        }}
      />
    </>
  );
}
