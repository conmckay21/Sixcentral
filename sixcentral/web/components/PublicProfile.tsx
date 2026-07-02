'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type PublicProfile = {
  id: string;
  handle: string;
  title: string | null;
  avatar_url: string | null;
  respect: number;
  rank_id: number;
  is_moderator: boolean;
  is_pro: boolean;
  is_staff: boolean;
  created_at: string;
  bio: string | null;
  platform: 'ps5' | 'xbox' | null;
  psn_id: string | null;
  xbox_gamertag: string | null;
  flair: string | null;
};

type Rank = { id: number; name: string; heat: number };
type Find = { created_at: string; contribution_types: { label: string } | null };

export default function PublicProfileView({ handle }: { handle: string }) {
  const sb = getBrowserSupabase();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!sb) {
      setState('missing');
      return;
    }
    (async () => {
      const { data: p } = await sb
        .from('public_profiles')
        .select('*')
        .ilike('handle', handle)
        .maybeSingle();
      if (!p) {
        setState('missing');
        return;
      }
      setProfile(p as PublicProfile);
      const [{ data: r }, { data: f }] = await Promise.all([
        sb.from('ranks').select('id, name, heat').order('id'),
        sb
          .from('contributions')
          .select('created_at, contribution_types(label)')
          .eq('profile_id', (p as PublicProfile).id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);
      if (r) setRanks(r as Rank[]);
      if (f) setFinds(f as unknown as Find[]);
      setState('ready');
    })();
  }, [sb, handle]);

  if (state === 'loading') {
    return <div className="panel"><p className="panel__muted">Loading…</p></div>;
  }
  if (state === 'missing' || !profile) {
    return (
      <div className="panel">
        <div className="kicker">Not found</div>
        <h2 className="panel__title">No one goes by @{handle}</h2>
        <p className="panel__muted">
          Maybe they changed their handle. The board&rsquo;s at{' '}
          <Link href="/crew" style={{ color: 'var(--cyan)' }}>
            /crew
          </Link>
          .
        </p>
      </div>
    );
  }

  const rank = ranks.find((r) => r.id === profile.rank_id);
  const flairClass = profile.flair ? ` flair-${profile.flair}` : '';

  return (
    <div className="panel">
      <div className="pp__head">
        <div className={`pp__avatar${flairClass}`}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" />
          ) : (
            <span>{profile.handle.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h1 className="pp__handle">@{profile.handle}</h1>
          <div className="acct__sub">
            {profile.title && <span className="title-chip">{profile.title}</span>}
            {profile.is_staff ? (
              <span className="acct__respect">Above the ladder</span>
            ) : (
              rank && (
                <>
                  <span className="rank-chip">
                    {rank.name} <span className="heat heat--gold">{'▮'.repeat(rank.heat)}</span>
                  </span>
                  <span className="acct__respect">
                    {profile.respect.toLocaleString('en-GB')} Respect
                  </span>
                </>
              )
            )}
            {profile.is_moderator && <span className="mod-chip">Moderator</span>}
          </div>
          <div className="pp__meta">
            {profile.platform && (
              <span className={`platform-chip platform-chip--${profile.platform}`}>
                {profile.platform === 'ps5' ? 'PS5' : 'Xbox'}
              </span>
            )}
            {profile.psn_id && <span className="pp__gid">PSN: {profile.psn_id}</span>}
            {profile.xbox_gamertag && <span className="pp__gid">Xbox: {profile.xbox_gamertag}</span>}
            <span className="pp__since">
              Since{' '}
              {new Date(profile.created_at).toLocaleDateString('en-GB', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {profile.bio && <p className="pp__bio">{profile.bio}</p>}

      <div className="pp__finds">
        <div className="kicker" style={{ color: 'var(--green)' }}>
          Verified finds
        </div>
        {finds.length === 0 ? (
          <p className="panel__muted" style={{ marginTop: 8 }}>
            Nothing confirmed yet. The ladder&rsquo;s waiting.
          </p>
        ) : (
          <ul className="pp__findlist">
            {finds.map((f, i) => (
              <li key={i}>
                <span>{f.contribution_types?.label ?? 'Contribution'}</span>
                <span className="pp__finddate">
                  {new Date(f.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="pp__cta">
        Earn your own spot:{' '}
        <Link href="/contribute" style={{ color: 'var(--cyan)' }}>
          submit intel
        </Link>{' '}
        or see{' '}
        <Link href="/crew" style={{ color: 'var(--cyan)' }}>
          The Come-Up
        </Link>
        .
      </p>
    </div>
  );
}
