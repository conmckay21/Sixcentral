import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import GuideCard from '@/components/GuideCard';
import NewsletterSignup from '@/components/NewsletterSignup';
import { getOnlineArticles, getOnlineGuides } from '@/lib/content';

export const metadata: Metadata = {
  title: 'GTA Online news, guides and the Raid Finder',
  description:
    'The SixCentral GTA Online desk: verified news, guides checked in-game, the weekly update every Thursday, and crews forming in the Raid Finder on our Discord.',
  alternates: { canonical: '/online' },
};

export const revalidate = 60;

/**
 * Live crew counts for the Raid Finder strip. Raid data is service-role only
 * by design (recruiting lives in Discord, never on the site), so aggregate
 * numbers are read here on the server and nothing else ever leaves the table.
 */
async function crewCounts(): Promise<{ xbox: number; ps5: number } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await sb.from('raid_lobbies').select('platform').eq('status', 'open');
    if (!data) return null;
    return {
      xbox: data.filter((r) => r.platform === 'xbox').length,
      ps5: data.filter((r) => r.platform === 'ps5').length,
    };
  } catch {
    return null;
  }
}

function crewLine(c: { xbox: number; ps5: number }): string | null {
  if (!c.xbox && !c.ps5) return null;
  const bits: string[] = [];
  if (c.xbox) bits.push(`${c.xbox} Xbox ${c.xbox === 1 ? 'crew' : 'crews'}`);
  if (c.ps5) bits.push(`${c.ps5} PS5 ${c.ps5 === 1 ? 'crew' : 'crews'}`);
  return `Right now: ${bits.join(' and ')} forming.`;
}

export default async function OnlinePage() {
  const [articles, guides, counts] = await Promise.all([
    getOnlineArticles(6),
    getOnlineGuides(12),
    crewCounts(),
  ]);
  const live = counts ? crewLine(counts) : null;

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="wrap">
          <div className="kicker" style={{ color: 'var(--cyan)' }}>
            The GTA Online desk
          </div>
          <h1>
            GTA Online, <span className="c">covered properly</span>
          </h1>
          <p style={{ maxWidth: '66ch' }}>
            GTA 6 launches single-player only. Rockstar said so themselves, which makes GTA Online
            the only multiplayer in town for a while yet. So the desk runs both games now: verified
            online news, guides checked in-game before they publish, and the Raid Finder filling
            crews on our Discord.
          </p>
        </div>
      </section>

      {/* News */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The online <span className="c">news desk</span>
            </h2>
            <Link href="/news">All news &rarr;</Link>
          </div>
          {articles.length ? (
            <div className="grid grid--3">
              {articles.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>
              The online desk is warming up. First stories land this week, and the weekly update
              gets covered every Thursday, same as Rockstar drops it.
            </p>
          )}
        </div>
      </section>

      {/* Guides */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Guides, <span className="c">checked in-game</span>
            </h2>
            <Link href="/guides">The guides desk &rarr;</Link>
          </div>
          {guides.length ? (
            <div className="grid grid--3">
              {guides.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>
              Landing in batches: a guide for every raid on the Finder, then the businesses and the
              money. Nothing publishes here until it has been run in-game, and our own video sits at
              the top of a guide whenever we have one.
            </p>
          )}
        </div>
      </section>

      {/* The Raid Finder + inside the Discord */}
      <section className="section">
        <div className="wrap">
          <div className="grid grid--2">
            <div
              className="card"
              style={{
                padding: 30,
                background: 'linear-gradient(160deg, rgba(255,46,136,0.1), var(--bg2))',
                borderColor: 'var(--pink)',
              }}
            >
              <div className="kicker" style={{ color: 'var(--pink-l)' }}>
                The Raid Finder
              </div>
              <h3
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  fontSize: '1.5rem',
                  margin: '8px 0',
                }}
              >
                Crews on tap, no crossplay chaos
              </h3>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                Pick the raid, drop your gamertag once, and the right platform gets pinged. Xbox
                raids stay Xbox, PS5 stays PS5, because GTA Online has no crossplay and neither do
                we. When the crew fills, the host has every gamertag ready for invites. It runs
                inside our Discord and nowhere else, by design: crew coordination stays off the
                site and the app entirely.
              </p>
              {live && (
                <p
                  className="mono"
                  style={{
                    marginTop: 14,
                    fontSize: '0.74rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--green)',
                  }}
                >
                  {live}
                </p>
              )}
            </div>
            <div
              className="card"
              style={{
                padding: 30,
                background: 'linear-gradient(160deg, rgba(138,79,255,0.1), var(--bg2))',
                borderColor: 'var(--purple)',
              }}
            >
              <div className="kicker" style={{ color: 'var(--purple)' }}>
                Inside the Discord
              </div>
              <h3
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  fontSize: '1.5rem',
                  margin: '8px 0',
                }}
              >
                More than a chat
              </h3>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
                The Raid Finder, platform lounges for Xbox and PS5, an /ask helper that only answers
                from confirmed facts, /submit intel that earns Respect on The Come-Up, the verified
                log where every accepted contribution gets its receipt, and the clips channel.
              </p>
              <p style={{ color: 'var(--muted)', maxWidth: '52ch', marginTop: 12 }}>
                The Discord opens with a SixCentral account, and only from your account page. There
                is no public invite, on purpose: it keeps the crews real and every member
                accountable.
              </p>
              <a className="btn-crew" href="/account">
                Create your account
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Launch list */}
      <section className="section">
        <div className="wrap">
          <NewsletterSignup source="online" />
        </div>
      </section>
    </>
  );
}
