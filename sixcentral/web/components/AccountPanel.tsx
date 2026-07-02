'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { DISCORD_AUTH_READY } from '@/lib/site';

type Profile = {
  id: string;
  handle: string;
  avatar_url: string | null;
  discord_id: string | null;
  respect: number;
  rank_id: number;
  is_moderator: boolean;
  is_pro: boolean;
  created_at: string;
};

type Rank = { id: number; name: string; min_respect: number; heat: number; perk: string | null };

const HANDLE_RE = /^[A-Za-z0-9_]{3,20}$/;

export default function AccountPanel() {
  const sb = getBrowserSupabase();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);

  const [email, setEmail] = useState('');
  const [authState, setAuthState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [authMsg, setAuthMsg] = useState('');

  const [handle, setHandle] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const loadProfile = useCallback(
    async (uid: string) => {
      if (!sb) return;
      const [{ data: p }, { data: r }] = await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).single(),
        sb.from('ranks').select('*').order('id'),
      ]);
      if (p) {
        setProfile(p as Profile);
        setHandle((p as Profile).handle);
      }
      if (r) setRanks(r as Rank[]);
    },
    [sb],
  );

  useEffect(() => {
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, loadProfile]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || authState === 'busy') return;
    setAuthState('busy');
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setAuthState('error');
      setAuthMsg(error.message);
    } else {
      setAuthState('sent');
    }
  }

  async function signInDiscord() {
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/account` },
    });
  }

  async function saveHandle() {
    if (!sb || !profile || saveState === 'busy') return;
    const next = handle.trim();
    if (!HANDLE_RE.test(next)) {
      setSaveState('error');
      setSaveMsg('3–20 characters: letters, numbers and underscores only.');
      return;
    }
    setSaveState('busy');
    const { error } = await sb.from('profiles').update({ handle: next }).eq('id', profile.id);
    if (error) {
      setSaveState('error');
      setSaveMsg(error.code === '23505' ? 'That handle is taken.' : 'Could not save — try again.');
    } else {
      setSaveState('done');
      setSaveMsg('Saved.');
      setProfile({ ...profile, handle: next });
      setTimeout(() => setSaveState('idle'), 2000);
    }
  }

  async function signOut() {
    if (!sb) return;
    await sb.auth.signOut();
  }

  if (!sb) {
    return <div className="panel"><p className="panel__muted">Accounts come online once the site is connected to its database.</p></div>;
  }
  if (!ready) {
    return <div className="panel"><p className="panel__muted">Loading…</p></div>;
  }

  // ---------- signed out ----------
  if (!session) {
    return (
      <div className="panel">
        <div className="kicker">Join the crew</div>
        <h2 className="panel__title">Sign in to SixCentral</h2>
        <p className="panel__muted" style={{ maxWidth: '52ch' }}>
          One account for your handle, your Respect on The Come-Up, and — when the tracker lands —
          your progress. No passwords: we email you a sign-in link.
        </p>
        {authState === 'sent' ? (
          <p className="panel__ok">Check your inbox — your sign-in link is on the way. It opens right back here.</p>
        ) : (
          <form className="nl__row" style={{ marginTop: 16 }} onSubmit={sendMagicLink}>
            <input
              className="nl__input"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button className="nl__btn" type="submit" disabled={authState === 'busy'}>
              {authState === 'busy' ? 'Sending…' : 'Email me a link'}
            </button>
          </form>
        )}
        {authState === 'error' && <p className="panel__err">{authMsg}</p>}
        {DISCORD_AUTH_READY ? (
          <button className="btn-discord" onClick={signInDiscord}>
            Continue with Discord
          </button>
        ) : (
          <p className="panel__hint">Discord sign-in is coming online shortly — email works today.</p>
        )}
      </div>
    );
  }

  // ---------- signed in ----------
  const rank = ranks.find((r) => r.id === profile?.rank_id);
  const nextRank = ranks.find((r) => r.id === (profile?.rank_id ?? 0) + 1);
  const progress =
    profile && rank && nextRank
      ? Math.min(100, Math.round(((profile.respect - rank.min_respect) / (nextRank.min_respect - rank.min_respect)) * 100))
      : 100;

  return (
    <div className="panel">
      {!profile ? (
        <p className="panel__muted">Setting up your profile…</p>
      ) : (
        <>
          <div className="acct__head">
            <div className="acct__avatar">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" />
              ) : (
                <span>{profile.handle.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="acct__handle">@{profile.handle}</div>
              <div className="acct__sub">
                {rank && (
                  <>
                    <span className="rank-chip">
                      {rank.name} <span className="heat heat--gold">{'\u25AE'.repeat(rank.heat)}</span>
                    </span>
                    <span className="acct__respect">{profile.respect.toLocaleString('en-GB')} Respect</span>
                  </>
                )}
                {profile.is_pro && <span className="pro-chip">Premium</span>}
                {profile.is_moderator && <span className="mod-chip">Moderator</span>}
              </div>
            </div>
          </div>

          {nextRank ? (
            <div className="xp">
              <div className="xp__label">
                <span>Next: {nextRank.name}</span>
                <span>
                  {profile.respect.toLocaleString('en-GB')} / {nextRank.min_respect.toLocaleString('en-GB')}
                </span>
              </div>
              <div className="xp__bar">
                <span style={{ width: `${progress}%` }} />
              </div>
              {nextRank.perk && <div className="xp__perk">Unlocks: {nextRank.perk}</div>}
            </div>
          ) : (
            <div className="xp__perk">Top of the ladder. City Legend.</div>
          )}

          <div className="acct__field">
            <label htmlFor="handle">Handle</label>
            <div className="nl__row">
              <input
                id="handle"
                className="nl__input"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                maxLength={20}
              />
              <button className="nl__btn" onClick={saveHandle} disabled={saveState === 'busy' || handle === profile.handle}>
                {saveState === 'busy' ? 'Saving…' : 'Save'}
              </button>
            </div>
            {saveState === 'error' && <p className="panel__err">{saveMsg}</p>}
            {saveState === 'done' && <p className="panel__ok">{saveMsg}</p>}
          </div>

          <div className="acct__meta">
            <span>{profile.discord_id ? 'Discord linked ✓' : 'Discord not linked — sign in with Discord once it\u2019s live and it links automatically.'}</span>
            <span>Member since {new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
          </div>

          <button className="btn-signout" onClick={signOut}>
            Sign out
          </button>
        </>
      )}
    </div>
  );
}
