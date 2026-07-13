import type { Metadata } from 'next';
import Link from 'next/link';
import AppStoreBadge from '@/components/AppStoreBadge';

export const metadata: Metadata = {
  title: 'About SixCentral',
  description:
    'SixCentral is the independent GTA 6 companion: verified news, guides, the countdown and a community, built in the UK by fans who check their facts.',
  alternates: { canonical: '/about' },
};

export default function About() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker">Who is behind this</div>
          <h1>
            About <span className="c">SixCentral</span>
          </h1>
          <p style={{ maxWidth: '66ch' }}>
            SixCentral is the GTA 6 companion for people who are tired of guesswork sold as fact.
            Verified news, honest rumour coverage, guides that go live with the game, a countdown
            you can trust and a community that earns its stripes.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <p style={{ color: 'var(--muted)' }}>
            The site is built in the UK by a two-person crew, founded by Connor, @Mckay21 on The
            Come-Up, and run as an independent operation: no network, no sponsor, no access to
            protect. That independence is the whole point. When we say something is confirmed, it
            is because Rockstar or Take-Two said it, not because it would be convenient if they
            had. The full rules are public in our{' '}
            <Link href="/editorial-policy">editorial policy</Link>.
          </p>
          <p style={{ color: 'var(--muted)' }}>
            The same discipline runs through everything here: the news desk separates confirmed
            stories from the <Link href="/news#rumour-mill">Rumour Mill</Link>, the{' '}
            <Link href="/rap-sheet">Rap Sheet</Link> keeps the controversies on the record, the{' '}
            <Link href="/countdown">countdown</Link> runs to the official date and nothing else,
            and the interactive map in the app stays locked until Rockstar shows theirs.
          </p>
          <p style={{ color: 'var(--muted)' }}>
            The community lives on The Come-Up, our reputation ladder. Confirmed contributions,
            accepted clips, verified corrections and verified intel earn Respect, and the board is
            shared between the site and the app. The fastest way in is the{' '}
            <a href="https://discord.gg/8xsC3tymm" target="_blank" rel="noopener noreferrer">Discord</a>.
          </p>
          <p style={{ color: 'var(--muted)' }}>
            SixCentral is an independent fan-made companion and is not affiliated with, endorsed by
            or connected to Rockstar Games or Take-Two Interactive.
          </p>
          <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <AppStoreBadge />
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Free on iPhone · Android in the works
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
