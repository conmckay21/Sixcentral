'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

  // ---- auth form state ----
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [handleField, setHandleField] = useState('');
  const [avail, setAvail] = useState<'idle' | 'checking' | 'free' | 'taken' | 'invalid'>('idle');
  const availTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authState, setAuthState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [authMsg, setAuthMsg] = useState('');

  // ---- password recovery ----
  const [recovery, setRecovery] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [recoveryState, setRecoveryState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [recoveryMsg, setRecoveryMsg] = useState('');

  // ---- profile edit state ----
  const [handle, setHandle] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [avatarState, setAvatarState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [avatarMsg, setAvatarMsg] = useState('');

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
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (s) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, loadProfile]);

  // live handle availability
  function onHandleChange(v: string) {
    setHandleField(v);
    if (availTimer.current) clearTimeout(availTimer.current);
    if (!v) {
      setAvail('idle');
      return;
    }
    if (!HANDLE_RE.test(v)) {
      setAvail('invalid');
      return;
    }
    setAvail('checking');
    availTimer.current = setTimeout(async () => {
      if (!sb) return;
      const { count } = await sb
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .ilike('handle', v);
      setAvail(count && count > 0 ? 'taken' : 'free');
    }, 350);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || authState === 'busy') return;
    if (!HANDLE_RE.test(handleField)) {
      setAuthState('error');
      setAuthMsg('Handle: 3\u201320 characters, letters, numbers and underscores.');
      return;
    }
    if (avail === 'taken') {
      setAuthState('error');
      setAuthMsg('That handle is taken \u2014 pick another.');
      return;
    }
    if (password.length < 8) {
      setAuthState('error');
      setAuthMsg('Password needs at least 8 characters.');
      return;
    }
    setAuthState('busy');
    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { user_name: handleField },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    if (error) {
      setAuthState('error');
      setAuthMsg(
        /already registered/i.test(error.message)
          ? 'That email already has an account \u2014 sign in instead.'
          : error.message,
      );
    } else if (!data.session) {
      setAuthState('sent');
      setAuthMsg('Check your inbox to confirm your email, then sign in.');
    } else {
      setAuthState('idle');
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || authState === 'busy') return;
    setAuthState('busy');
    const { error } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setAuthState('error');
      setAuthMsg(
        /invalid login credentials/i.test(error.message)
          ? 'Wrong email or password.'
          : error.message,
      );
    } else {
      setAuthState('idle');
    }
  }

  async function forgotPassword() {
    if (!sb || !email) {
      setAuthState('error');
      setAuthMsg('Enter your email above first, then hit forgot password.');
      return;
    }
    setAuthState('busy');
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/account`,
    });
    if (error) {
      setAuthState('error');
      setAuthMsg(error.message);
    } else {
      setAuthState('sent');
      setAuthMsg('Reset link sent \u2014 check your inbox. It brings you back here to set a new password.');
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || recoveryState === 'busy') return;
    if (newPass.length < 8) {
      setRecoveryState('error');
      setRecoveryMsg('At least 8 characters.');
      return;
    }
    setRecoveryState('busy');
    const { error } = await sb.auth.updateUser({ password: newPass });
    if (error) {
      setRecoveryState('error');
      setRecoveryMsg(error.message);
    } else {
      setRecovery(false);
      setRecoveryState('idle');
      setNewPass('');
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
      setSaveMsg('3\u201320 characters: letters, numbers and underscores only.');
      return;
    }
    setSaveState('busy');
    const { error } = await sb.from('profiles').update({ handle: next }).eq('id', profile.id);
    if (error) {
      setSaveState('error');
      setSaveMsg(error.code === '23505' ? 'That handle is taken.' : 'Could not save \u2014 try again.');
    } else {
      setSaveState('done');
      setSaveMsg('Saved.');
      setProfile({ ...profile, handle: next });
      setTimeout(() => setSaveState('idle'), 2000);
    }
  }

  function resizeToJpeg(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85);
      };
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = url;
    });
  }

  async function uploadAvatar(file: File) {
    if (!sb || !profile || avatarState === 'busy') return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setAvatarState('error');
      setAvatarMsg('JPEG, PNG or WebP only.');
      return;
    }
    setAvatarState('busy');
    setAvatarMsg('');
    try {
      const blob = await resizeToJpeg(file);
      const path = `${profile.id}.jpg`;
      const { error } = await sb.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (error) throw error;
      const { data } = sb.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: e2 } = await sb.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      if (e2) throw e2;
      setProfile({ ...profile, avatar_url: url });
      setAvatarState('idle');
    } catch (err) {
      setAvatarState('error');
      setAvatarMsg(err instanceof Error ? err.message : 'Upload failed \u2014 try again.');
    }
  }

  async function removeAvatar() {
    if (!sb || !profile || avatarState === 'busy') return;
    setAvatarState('busy');
    await sb.storage.from('avatars').remove([`${profile.id}.jpg`]);
    await sb.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
    setProfile({ ...profile, avatar_url: null });
    setAvatarState('idle');
  }

  async function signOut() {
    if (!sb) return;
    await sb.auth.signOut();
  }

  if (!sb) {
    return (
      <div className="panel">
        <p className="panel__muted">Accounts come online once the site is connected to its database.</p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="panel">
        <p className="panel__muted">Loading\u2026</p>
      </div>
    );
  }

  // ---------- signed out: sign in / create account ----------
  if (!session) {
    const isUp = mode === 'signup';
    return (
      <div className="panel">
        <div className="authtabs">
          <button className={isUp ? 'on' : ''} onClick={() => { setMode('signup'); setAuthState('idle'); }}>
            Create account
          </button>
          <button className={!isUp ? 'on' : ''} onClick={() => { setMode('signin'); setAuthState('idle'); }}>
            Sign in
          </button>
        </div>

        <h2 className="panel__title">{isUp ? 'Join the crew' : 'Welcome back'}</h2>
        {isUp && (
          <p className="panel__muted" style={{ maxWidth: '54ch' }}>
            One account for your handle, your Respect on The Come-Up, and \u2014 when the tracker
            lands \u2014 your progress.
          </p>
        )}

        {authState === 'sent' ? (
          <p className="panel__ok">{authMsg}</p>
        ) : (
          <form onSubmit={isUp ? signUp : signIn}>
            {isUp && (
              <div className="acct__field">
                <label htmlFor="a-handle">Username</label>
                <input
                  id="a-handle"
                  className="nl__input"
                  value={handleField}
                  maxLength={20}
                  autoComplete="username"
                  placeholder="your_handle"
                  onChange={(e) => onHandleChange(e.target.value)}
                />
                {avail === 'checking' && <p className="panel__hint">Checking\u2026</p>}
                {avail === 'free' && <p className="panel__ok" style={{ marginTop: 8 }}>@{handleField} is free ✓</p>}
                {avail === 'taken' && <p className="panel__err">Taken \u2014 try another.</p>}
                {avail === 'invalid' && (
                  <p className="panel__err">3\u201320 characters: letters, numbers, underscores.</p>
                )}
              </div>
            )}

            <div className="acct__field">
              <label htmlFor="a-email">Email</label>
              <input
                id="a-email"
                className="nl__input"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="acct__field">
              <label htmlFor="a-pass">Password</label>
              <input
                id="a-pass"
                className="nl__input"
                type="password"
                required
                minLength={8}
                autoComplete={isUp ? 'new-password' : 'current-password'}
                placeholder={isUp ? 'At least 8 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {authState === 'error' && <p className="panel__err">{authMsg}</p>}

            <button className="nl__btn" type="submit" disabled={authState === 'busy'}>
              {authState === 'busy' ? 'One moment\u2026' : isUp ? 'Create account' : 'Sign in'}
            </button>

            {!isUp && (
              <button type="button" className="linklike" onClick={forgotPassword}>
                Forgot password?
              </button>
            )}
          </form>
        )}

        {DISCORD_AUTH_READY && (
          <button className="btn-discord" onClick={signInDiscord}>
            Continue with Discord
          </button>
        )}
      </div>
    );
  }

  // ---------- password recovery ----------
  if (recovery) {
    return (
      <div className="panel">
        <div className="kicker">Reset</div>
        <h2 className="panel__title">Choose a new password</h2>
        <form onSubmit={setNewPassword}>
          <div className="acct__field">
            <label htmlFor="np">New password</label>
            <input
              id="np"
              className="nl__input"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>
          {recoveryState === 'error' && <p className="panel__err">{recoveryMsg}</p>}
          <button className="nl__btn" type="submit" disabled={recoveryState === 'busy'}>
            {recoveryState === 'busy' ? 'Saving\u2026' : 'Save password'}
          </button>
        </form>
      </div>
    );
  }

  // ---------- signed in ----------
  const rank = ranks.find((r) => r.id === profile?.rank_id);
  const nextRank = ranks.find((r) => r.id === (profile?.rank_id ?? 0) + 1);
  const progress =
    profile && rank && nextRank
      ? Math.min(
          100,
          Math.round(((profile.respect - rank.min_respect) / (nextRank.min_respect - rank.min_respect)) * 100),
        )
      : 100;

  return (
    <div className="panel">
      {!profile ? (
        <p className="panel__muted">Setting up your profile\u2026</p>
      ) : (
        <>
          <div className="acct__head">
            <div className="acct__avatarcol">
              <div className="acct__avatar">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <span>{profile.handle.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <label className="avatar-btn" htmlFor="avatar-file">
                {avatarState === 'busy' ? 'Uploading\u2026' : 'Change photo'}
              </label>
              <input
                id="avatar-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = '';
                }}
              />
              {profile.avatar_url && avatarState !== 'busy' && (
                <button className="avatar-remove" onClick={removeAvatar}>
                  Remove
                </button>
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

          {avatarState === 'error' && <p className="panel__err">{avatarMsg}</p>}

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
              <button
                className="nl__btn"
                onClick={saveHandle}
                disabled={saveState === 'busy' || handle === profile.handle}
              >
                {saveState === 'busy' ? 'Saving\u2026' : 'Save'}
              </button>
            </div>
            {saveState === 'error' && <p className="panel__err">{saveMsg}</p>}
            {saveState === 'done' && <p className="panel__ok">{saveMsg}</p>}
          </div>

          <div className="acct__meta">
            <span>
              {profile.discord_id
                ? 'Discord linked ✓'
                : 'Discord not linked \u2014 sign in with Discord once it\u2019s live and it links automatically.'}
            </span>
            <span>
              Member since{' '}
              {new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <button className="btn-signout" onClick={signOut}>
            Sign out
          </button>
        </>
      )}
    </div>
  );
}
