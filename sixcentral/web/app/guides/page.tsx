import type { Metadata } from 'next';
import NewsletterSignup from '@/components/NewsletterSignup';

export const metadata: Metadata = {
  title: 'GTA 6 Guides, coming with the game',
  description:
    'SixCentral covers Grand Theft Auto VI from A to Z: spoiler-safe story walkthrough, 100% completion, every collectible on our own map, money, weapons, trophies and more. Nothing published before the game is.',
  alternates: { canonical: '/guides' },
};

const COVERAGE = [
  {
    k: 'Story',
    t: 'Spoiler-safe walkthrough',
    d: 'Every mission and every choice, with spoilers sealed behind warnings until you ask for them.',
  },
  {
    k: '100%',
    t: 'The full completion checklist',
    d: 'The definitive route to 100%, synced to your tracker so it always knows what you have left.',
  },
  {
    k: 'Collect',
    t: 'Every collectible, on our own map',
    d: 'Community-submitted, moderator-confirmed. Nothing earns a tick on our map until someone has stood on the spot in-game.',
  },
  {
    k: 'Money',
    t: 'Money & businesses',
    d: 'What actually pays and in what order. Tested in-game, not theorised from trailers.',
  },
  {
    k: 'Weapons',
    t: 'Weapons & loadouts',
    d: 'Every weapon ranked and located. What hits hardest, what to carry for the job, and where to grab the good stuff early.',
  },
  {
    k: 'Trophies',
    t: 'Trophies & achievements',
    d: 'The full list guide goes live the moment the list publishes, and lists usually land days before launch.',
  },
  {
    k: 'Garage',
    t: 'Vehicles & customisation',
    d: 'Every ride, every mod shop, and where to find what. Built from the community\u2019s finds.',
  },
  {
    k: 'Online',
    t: 'GTA Online 2, when it lands',
    d: 'The weekly-update desk opens the day the online mode does: money methods, event coverage, and what is worth your time each week.',
  },
];

export default function GuidesPage() {
  return (
    <>
      <section className="hero hero--guides">
        <div className="wrap">
          <div className="kicker">The guides desk</div>
          <h1>
            Guides go live <span className="c">with the game</span>
          </h1>
          <p>
            Nobody can guide a game that is not out yet, and we will not pretend otherwise. Nothing
            gets published here until we can verify it in-game. The moment Leonida opens, this page
            becomes the most useful place in it.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              A to Z, <span className="c">the lot</span>
            </h2>
          </div>
          <div className="cov">
            {COVERAGE.map((c) => (
              <div key={c.k} className="cov__item">
                <div className="cov__k">{c.k}</div>
                <div>
                  <div className="cov__t">{c.t}</div>
                  <div className="cov__d">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="card" style={{ padding: 28 }}>
            <div className="kicker" style={{ color: 'var(--green)' }}>
              How ours are different
            </div>
            <p style={{ color: 'var(--muted)', maxWidth: '68ch', marginTop: 10 }}>
              Every SixCentral guide is wired to the tracker. Read a guide and tick the item off,
              or get pointed straight at the guide for whatever has you stuck. Locations get
              confirmed by the community through the Respect system before they earn a verified
              mark, and the same fact-checking culture that runs our news desk runs here. If we
              have not confirmed it, we say so.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <NewsletterSignup source="guides" />
        </div>
      </section>
    </>
  );
}
