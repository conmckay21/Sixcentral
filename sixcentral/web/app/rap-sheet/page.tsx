import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { getControversies } from '@/lib/content';

export const metadata: Metadata = {
  title: 'The Rap Sheet: every GTA 6 controversy on the record',
  description:
    'The documented GTA 6 controversies: pricing, editions, the missing disc, the delays and the fallout. Dated, sourced and kept on the record.',
  alternates: { canonical: '/rap-sheet' },
};

export const revalidate = 60;

export default async function RapSheet() {
  const offences = await getControversies(60);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker" style={{ color: 'var(--gold)' }}>
            The Rap Sheet
          </div>
          <h1>
            Every offence <span className="g">on the record</span>
          </h1>
          <p style={{ maxWidth: '66ch' }}>
            When GTA 6 causes a scene, it gets booked. Price hikes, the disc that never was, the
            delays, the fallout: documented, dated, receipts attached. Facts about backlash, not
            backlash dressed as fact.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Offences <span className="g">logged</span>
            </h2>
            <span className="rumour-note">
              {offences.length} {offences.length === 1 ? 'entry' : 'entries'} on file
            </span>
          </div>
          {offences.length ? (
            <div className="grid grid--3">
              {offences.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>The record is clean. It will not stay that way.</p>
          )}
          <p style={{ color: 'var(--muted)', marginTop: 24, fontSize: '0.9rem' }}>
            Unconfirmed drama lives in the <Link href="/news#rumour-mill">Rumour Mill</Link>. How we
            separate the two is in the <Link href="/editorial-policy">editorial policy</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
