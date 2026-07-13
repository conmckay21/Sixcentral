import type { Metadata } from 'next';
import Link from 'next/link';
import Countdown from '@/components/Countdown';
import AppStoreBadge from '@/components/AppStoreBadge';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'GTA 6 countdown: days until 19 November 2026',
  description:
    'The live GTA 6 countdown to launch on 19 November 2026 for PS5 and Xbox Series X|S, with the release timeline, preload date and every launch question answered.',
  alternates: { canonical: '/countdown' },
};

const FAQ = [
  {
    q: 'When does GTA 6 come out?',
    a: 'GTA 6 launches on 19 November 2026 on PlayStation 5 and Xbox Series X|S. Rockstar confirmed the date on its official Newswire and Take-Two has reaffirmed it since.',
  },
  {
    q: 'What time does GTA 6 unlock in the UK?',
    a: 'Rockstar has not announced an unlock time yet. Big releases usually go live either at midnight local time or at one global moment. The second Rockstar confirms it, this page and the app countdown update.',
  },
  {
    q: 'Is GTA 6 delayed again?',
    a: 'No. The game moved from 2025 to 26 May 2026, then to 19 November 2026, and that date has held ever since, repeated in Take-Two investor materials alongside a marketing campaign that began in summer 2026.',
  },
  {
    q: 'Can I preload GTA 6?',
    a: 'Yes. Digital preloading starts on 12 November 2026, a week before launch. Physical copies ship with a download code and no disc, so every copy downloads either way.',
  },
  {
    q: 'How much does GTA 6 cost in the UK?',
    a: 'The Standard Edition is £69.99 and the Ultimate Edition is £89.99 in the UK, with US pricing at $79.99 and $99.99. What the extra £20 actually buys is broken down in our editions guide.',
  },
  {
    q: 'Is GTA 6 coming to PC?',
    a: 'No PC version has been announced for launch. Only PS5 and Xbox Series X|S are confirmed. Rockstar has historically brought GTA to PC well after console release, but nothing is confirmed for GTA 6.',
  },
];

export default function CountdownPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker">The countdown</div>
          <h1>
            GTA 6 launches <span className="c">19 November 2026</span>
          </h1>
          <p style={{ maxWidth: '66ch' }}>
            PlayStation 5 and Xbox Series X|S, one date, no maths. This clock runs to launch and
            updates the moment Rockstar confirms an unlock time.
          </p>
          <div style={{ marginTop: 26 }}>
            <Countdown />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The road <span className="c">to launch</span>
            </h2>
          </div>
          <div className="grid grid--2">
            <div className="card" style={{ padding: 24 }}>
              <div className="card__kicker" style={{ color: 'var(--pink-l)' }}>The dates that moved</div>
              <p style={{ color: 'var(--muted)', marginTop: 10 }}>
                GTA 6 was first pointed at 2025, moved to 26 May 2026, then landed on 19 November
                2026. Since that second move the date has only been repeated, never walked back,
                including in Take-Two&rsquo;s own investor materials.
              </p>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <div className="card__kicker" style={{ color: 'var(--cyan)' }}>The dates that matter now</div>
              <p style={{ color: 'var(--muted)', marginTop: 10 }}>
                Pre-orders opened on 25 June 2026 alongside the cover art. Digital preload begins
                12 November 2026. Launch night is 19 November 2026. Everything confirmed beyond the
                dates lives in the <Link href="/news/everything-confirmed">confirmed hub</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Launch questions, <span className="c">answered</span>
            </h2>
          </div>
          {FAQ.map((f) => (
            <div key={f.q} style={{ borderBottom: '1px solid var(--line2)', padding: '18px 0' }}>
              <h3 style={{ fontFamily: 'var(--body)', fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>{f.q}</h3>
              <p style={{ color: 'var(--muted)', margin: '8px 0 0', maxWidth: '75ch' }}>{f.a}</p>
            </div>
          ))}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <AppStoreBadge />
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              The same countdown, in your pocket
            </span>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
