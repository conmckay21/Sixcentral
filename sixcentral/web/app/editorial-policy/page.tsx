import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Editorial policy: how SixCentral separates fact from rumour',
  description:
    'The rules SixCentral publishes by: what counts as confirmed, how rumours are heat-rated, the leak policy, and how corrections work.',
  alternates: { canonical: '/editorial-policy' },
};

export default function EditorialPolicy() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker">The rules we publish by</div>
          <h1>
            Editorial <span className="c">policy</span>
          </h1>
          <p style={{ maxWidth: '66ch' }}>
            SixCentral exists because GTA 6 coverage is drowning in guesswork sold as fact. These
            are the rules that keep this site out of that business. They apply to every article,
            every guide, every map pin and every push into the app.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.5rem' }}>What counts as confirmed</h2>
          <p style={{ color: 'var(--muted)' }}>
            Three sources earn the confirmed label: Rockstar Games itself, through the Newswire,
            official site, trailers and social channels; Take-Two Interactive, through investor
            releases, filings and earnings calls; and first-party platform listings that Rockstar
            controls. If a fact cannot be traced to one of those, it does not appear as fact
            anywhere on SixCentral. Retailer emails, insider posts and datamines do not qualify,
            however often they turn out right.
          </p>

          <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.5rem', marginTop: 36 }}>How rumours work</h2>
          <p style={{ color: 'var(--muted)' }}>
            Everything else that is worth covering goes to the <Link href="/news#rumour-mill">Rumour Mill</Link>,
            labelled unconfirmed by design. Each rumour carries a heat rating from 1 to 5: how much
            smoke there is, based on the track record of where it surfaced, corroboration between
            independent sources, and plausibility against what is officially known. Heat is our
            editorial judgement of likelihood. It is never a promise, and a heat 5 rumour is still
            a rumour.
          </p>

          <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.5rem', marginTop: 36 }}>The leak policy</h2>
          <p style={{ color: 'var(--muted)' }}>
            Leaks get covered as claims, never as material. We will describe what a leak alleges,
            in our own words, clearly labelled unconfirmed and attributed to where the claim
            circulated. We do not reproduce leaked footage, images, documents or audio, we do not
            describe leaked material shot by shot, we do not link to it and we do not tell you
            where to find it. The interactive map holds to a stricter line again: if Rockstar has
            not shown it, we do not pin it, full stop.
          </p>

          <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.5rem', marginTop: 36 }}>When rumours graduate</h2>
          <p style={{ color: 'var(--muted)' }}>
            The moment Rockstar or Take-Two confirms something we have tracked as rumour, it moves
            up: into <Link href="/news/everything-confirmed">the confirmed hub</Link> and confirmed
            coverage, cited to the official source rather than to whoever called it early. The
            original rumour piece stays published and dated, because the record of what was claimed
            and when is part of the story.
          </p>

          <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.5rem', marginTop: 36 }}>Corrections</h2>
          <p style={{ color: 'var(--muted)' }}>
            When we get something wrong, we fix the article, date the fix and say what changed. We
            do not quietly rewrite. Spotted an error? Flag it through the site&rsquo;s contribute
            flow or the Discord and it goes straight to the desk. Verified corrections earn Respect
            on The Come-Up.
          </p>

          <h2 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.5rem', marginTop: 36 }}>Independence</h2>
          <p style={{ color: 'var(--muted)' }}>
            SixCentral is an independent fan-made companion. We are not affiliated with, endorsed
            by or connected to Rockstar Games or Take-Two Interactive, we take no payment for
            coverage, and nobody sees a story before it publishes. More about who we are on the{' '}
            <Link href="/about">about page</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
