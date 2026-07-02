import type { Metadata } from 'next';
import Link from 'next/link';
import TheComeUp from '@/components/TheComeUp';

export const metadata: Metadata = {
  title: 'The Come-Up: ranks, Respect and the crew leaderboard',
  description:
    'How the SixCentral reputation system works: earn Respect for confirmed contributions, climb from Fresh off the Bus to City Legend, unlock free Premium at Lieutenant.',
  alternates: { canonical: '/crew' },
};

export default function CrewPage() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker">The Come-Up</div>
          <h1>
            Respect is <span className="c">earned</span>
          </h1>
          <p>
            SixCentral runs on its community: the people confirming locations, correcting facts
            and mapping the game. Every confirmed contribution banks Respect; Respect climbs the
            ladder; the ladder unlocks real things, including free Premium at Lieutenant and
            verification powers at Shot Caller. Nothing is bought. Everything is earned.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link href="/account" style={{ color: 'var(--cyan)' }}>
              Create your account →
            </Link>
          </p>
        </div>
      </section>
      <TheComeUp />
    </>
  );
}
