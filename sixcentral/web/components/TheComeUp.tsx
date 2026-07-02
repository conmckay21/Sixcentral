'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Rank = { id: number; name: string; min_respect: number; heat: number; perk: string | null };
type EarnType = { key: string; label: string; points: number };
type BoardRow = { id: string; handle: string; avatar_url: string | null; respect?: number; respect_week?: number; rank_name?: string };

export default function TheComeUp() {
  const sb = getBrowserSupabase();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [earn, setEarn] = useState<EarnType[]>([]);
  const [allTime, setAllTime] = useState<BoardRow[]>([]);
  const [week, setWeek] = useState<BoardRow[]>([]);
  const [board, setBoard] = useState<'all' | 'week'>('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sb) {
      setLoaded(true);
      return;
    }
    Promise.all([
      sb.from('ranks').select('*').order('id'),
      sb.from('contribution_types').select('*').order('points', { ascending: false }),
      sb.from('leaderboard_all').select('*').limit(15),
      sb.from('leaderboard_week').select('*').limit(15),
    ]).then(([r, e, a, w]) => {
      if (r.data) setRanks(r.data as Rank[]);
      if (e.data) setEarn(e.data as EarnType[]);
      if (a.data) setAllTime(a.data as BoardRow[]);
      if (w.data) setWeek(w.data as BoardRow[]);
      setLoaded(true);
    });
  }, [sb]);

  const rows = board === 'all' ? allTime : week;

  return (
    <>
      {/* The ladder */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The <span className="c">ladder</span>
            </h2>
          </div>
          <div className="ladder">
            {(ranks.length ? ranks : []).map((r) => (
              <div key={r.id} className="ladder__row">
                <span className="ladder__heat heat heat--gold">{'\u25AE'.repeat(Math.max(r.heat, 0)) || '\u2013'}</span>
                <span className="ladder__name">{r.name}</span>
                <span className="ladder__min">{r.min_respect.toLocaleString('en-GB')} Respect</span>
                <span className="ladder__perk">{r.perk ?? ''}</span>
              </div>
            ))}
            {loaded && ranks.length === 0 && <p className="panel__muted">The ladder loads once the site is connected.</p>}
          </div>
        </div>
      </section>

      {/* How Respect is earned */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              Earning <span className="c">Respect</span>
            </h2>
          </div>
          <p style={{ color: 'var(--muted)', maxWidth: '68ch', marginBottom: 18 }}>
            Respect is only ever awarded for <strong style={{ color: 'var(--green)' }}>confirmed</strong>{' '}
            contributions — a submission earns nothing until a moderator or trusted member verifies
            it. That gate is what keeps the board honest and the data trustworthy.
          </p>
          <div className="earn">
            {earn.map((e) => (
              <div key={e.key} className="earn__row">
                <span className="earn__label">{e.label}</span>
                <span className="earn__pts">+{e.points}</span>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--dim)', fontSize: '0.86rem', marginTop: 14, maxWidth: '68ch' }}>
            Right now there are two ways in:{' '}
            <Link href="/contribute" style={{ color: 'var(--cyan)' }}>
              submit intel or a correction
            </Link>{' '}
            right here on the site, or earn as a founding contributor in the Discord. The full
            pipeline — map pins, collectible confirmations, clip features — opens with the tracker
            at launch.
          </p>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The <span className="c">board</span>
            </h2>
            <div className="lb-toggle">
              <button className={board === 'all' ? 'on' : ''} onClick={() => setBoard('all')}>
                All-time
              </button>
              <button className={board === 'week' ? 'on' : ''} onClick={() => setBoard('week')}>
                This week
              </button>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="panel__muted">
              {loaded
                ? 'The board opens with the first crew members — early names live here forever.'
                : 'Loading…'}
            </p>
          ) : (
            <div className="lb">
              {rows.map((r, i) => (
                <div key={r.id} className="lb__row">
                  <span className="lb__pos">{i + 1}</span>
                  <span className="lb__avatar">
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt="" />
                    ) : (
                      <span>{r.handle.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="lb__handle">
                    @{r.handle}
                    {r.rank_name && <em>{r.rank_name}</em>}
                  </span>
                  <span className="lb__pts">
                    {(board === 'all' ? r.respect ?? 0 : r.respect_week ?? 0).toLocaleString('en-GB')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
