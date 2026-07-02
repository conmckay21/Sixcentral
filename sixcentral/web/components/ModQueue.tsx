'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Payload = { about?: string | null; details?: string; source?: string | null };
type Row = {
  id: string;
  type_key: string;
  status: string;
  payload: Payload | null;
  created_at: string;
  reviewed_at: string | null;
  profiles: { handle: string; avatar_url: string | null } | null;
};

const EMBED =
  'id, type_key, status, payload, created_at, reviewed_at, profiles!contributions_profile_id_fkey(handle, avatar_url)';

export default function ModQueue() {
  const sb = getBrowserSupabase();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isMod, setIsMod] = useState<boolean | null>(null);
  const [pending, setPending] = useState<Row[]>([]);
  const [recent, setRecent] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sb) return;
    const [{ data: p }, { data: r }] = await Promise.all([
      sb.from('contributions').select(EMBED).eq('status', 'pending').order('created_at', { ascending: true }),
      sb
        .from('contributions')
        .select(EMBED)
        .neq('status', 'pending')
        .order('reviewed_at', { ascending: false })
        .limit(10),
    ]);
    if (p) setPending(p as unknown as Row[]);
    if (r) setRecent(r as unknown as Row[]);
  }, [sb]);

  useEffect(() => {
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const { data: prof } = await sb
          .from('profiles')
          .select('is_moderator')
          .eq('id', data.session.user.id)
          .single();
        const mod = !!prof?.is_moderator;
        setIsMod(mod);
        if (mod) load();
      }
      setReady(true);
    });
  }, [sb, load]);

  async function review(id: string, status: 'accepted' | 'rejected') {
    if (!sb || !session || busy) return;
    setBusy(id);
    const { error } = await sb
      .from('contributions')
      .update({ status, reviewed_by: session.user.id })
      .eq('id', id);
    if (!error) {
      setPending((rows) => rows.filter((r) => r.id !== id));
      load();
    }
    setBusy(null);
  }

  if (!sb || !ready) return <div className="panel"><p className="panel__muted">Loading…</p></div>;
  if (!session)
    return (
      <div className="panel">
        <p className="panel__muted">Moderators only. <a href="/account" style={{ color: 'var(--cyan)' }}>Sign in</a>.</p>
      </div>
    );
  if (isMod === false)
    return (
      <div className="panel">
        <p className="panel__muted">
          Moderators only. Verification powers unlock at Shot Caller on The Come-Up.
        </p>
      </div>
    );

  return (
    <>
      <div className="section__head" style={{ marginBottom: 16 }}>
        <h2>
          The <span className="c">queue</span>
        </h2>
        <span className="rumour-note">{pending.length} pending</span>
      </div>

      {pending.length === 0 ? (
        <p className="panel__muted">Queue&rsquo;s clear. Nice.</p>
      ) : (
        <div className="modq">
          {pending.map((row) => (
            <div key={row.id} className="modq__item">
              <div className="modq__meta">
                <span className="modq__type">{row.type_key.replace(/_/g, ' ')}</span>
                <span className="modq__who">
                  @{row.profiles?.handle ?? 'unknown'} ·{' '}
                  {new Date(row.created_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {row.payload?.about && <div className="modq__about">Re: {row.payload.about}</div>}
              <p className="modq__details">{row.payload?.details}</p>
              {row.payload?.source && (
                <a className="modq__source" href={row.payload.source} target="_blank" rel="noopener noreferrer">
                  Source: {row.payload.source}
                </a>
              )}
              <div className="modq__actions">
                <button
                  className="modq__accept"
                  disabled={busy === row.id}
                  onClick={() => review(row.id, 'accepted')}
                >
                  Accept and award Respect
                </button>
                <button
                  className="modq__reject"
                  disabled={busy === row.id}
                  onClick={() => review(row.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <div className="section__head" style={{ margin: '30px 0 12px' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Recent decisions</h2>
          </div>
          <div className="modq modq--recent">
            {recent.map((row) => (
              <div key={row.id} className="modq__item modq__item--slim">
                <span className={row.status === 'accepted' ? 'modq__ok' : 'modq__no'}>
                  {row.status}
                </span>
                <span className="modq__who">@{row.profiles?.handle ?? 'unknown'}</span>
                <span className="modq__type">{row.type_key.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
