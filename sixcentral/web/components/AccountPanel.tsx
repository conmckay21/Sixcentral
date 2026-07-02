'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { DISCORD_AUTH_READY } from '@/lib/site';

type Profile = {
  id: string;
  handle: string;
  title: string | null;
  is_staff: boolean;
  avatar_url: string | null;
  discord_linked: boolean;
  respect: number;
  rank_id: number;
  is_moderator: boolean;
  is_pro: boolean;
  created_at: string;
  date_of_birth: string | null;
  bio: string | null;
  platform: 'ps5' | 'xbox' | null;
  psn_id: string | null;
  xbox_gamertag: string | null;
  ids_public: boolean;
  flair: string | null;
};

type Flair = { key: string; label: string; min_rank_id: number };

const PRESETS = [
  { src: '/avatars/preset-skyline.svg', label: 'Skyline' },
  { src: '/avatars/preset-palms.svg', label: 'Palms' },
  { src: '/avatars/preset-cassette.svg', label: 'Cassette' },
  { src: '/avatars/preset-disc.svg', label: 'Disc' },
  { src: '/avatars/preset-controller.svg', label: 'Pad' },
  { src: '/avatars/preset-vi.svg', label: 'VI' },
];

/** Stored verbatim as the consent record for the account-page toggle. */
const ACCOUNT_CONSENT =
  'Launch-critical updates from SixCentral: pre-order intel, the launch-day checklist, and first access when the tracker goes live. Unsubscribe any time.';

type Rank = { id: number; name: string; min_respect: number; heat: number; perk: string | null };

const HANDLE_RE = /^[A-Za-z0-9_]{3,20}$/;

/** Stored verbatim as the consent record. Must match the checkbox label. */
const SIGNUP_CONSENT =
  'Launch-critical updates from SixCentral: pre-order intel, the launch-day checklist, and first access when the tracker goes live. Unsubscribe any time.';

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
  const [newsletter, setNewsletter] = useState(false);

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

  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [flairMsg, setFlairMsg] = useState('');
  const [bio, setBio] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [psn, setPsn] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [idsPublic, setIdsPublic] = useState(false);
  const [dob, setDob] = useState('');
  const [detailsState, setDetailsState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [detailsMsg, setDetailsMsg] = useState('');
  const [newsletter2, setNewsletter2] = useState<'unknown' | 'on' | 'off' | 'busy'>('unknown');

  const loadProfile = useCallback(
    async (uid: string) => {
      if (!sb) return;
      const [{ data: p }, { data: r }, { data: f }] = await Promise.all([
        sb.from('public_profiles').select('*').eq('id', uid).single(),
        sb.from('ranks').select('*').order('id'),
        sb.from('flairs').select('*').order('min_rank_id'),
      ]);
      if (p) {
        const prof = p as Profile;
        setProfile(prof);
        setHandle(prof.handle);
        setBio(prof.bio ?? '');
        setPlatform(prof.platform ?? '');
        setPsn(prof.psn_id ?? '');
        setGamertag(prof.xbox_gamertag ?? '');
        setIdsPublic(prof.ids_public);
        setDob(prof.date_of_birth ?? '');
      }
      if (r) setRanks(r as Rank[]);
      if (f) setFlairs(f as Flair[]);
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
      if (data.session) {
        loadProfile(data.session.user.id);
        loadNewsletter(data.session.user.email ?? '');
      }
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
      setAuthMsg('Handles are 3 to 20 characters: letters, numbers and underscores.');
      return;
    }
    if (avail === 'taken') {
      setAuthState('error');
      setAuthMsg('That handle is taken. Pick another.');
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
    if (!error && newsletter) {
      // Consent recorded verbatim; a failure here must never block the account.
      try {
        await sb
          .from('subscribers')
          .insert({ email: email.trim().toLowerCase(), source: 'signup', consent_text: SIGNUP_CONSENT });
      } catch {
        /* ignore: the account matters more than the list entry */
      }
    }
    if (error) {
      setAuthState('error');
      setAuthMsg(
        /already registered/i.test(error.message)
          ? 'That email already has an account. Sign in instead.'
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
      setAuthMsg('Reset link sent. Check your inbox and it brings you straight back here to set a new one.');
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

  async function loadNewsletter(email: string) {
    if (!sb || !email) return;
    const { count } = await sb
      .from('subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('email', email.toLowerCase());
    setNewsletter2(count && count > 0 ? 'on' : 'off');
  }

  async function toggleNewsletter() {
    if (!sb || !session?.user.email || newsletter2 === 'busy' || newsletter2 === 'unknown') return;
    const email = session.user.email.toLowerCase();
    const turningOn = newsletter2 === 'off';
    setNewsletter2('busy');
    if (turningOn) {
      const { error } = await sb
        .from('subscribers')
        .insert({ email, source: 'account', consent_text: ACCOUNT_CONSENT });
      setNewsletter2(error && error.code !== '23505' ? 'off' : 'on');
    } else {
      const { error } = await sb.from('subscribers').delete().eq('email', email);
      setNewsletter2(error ? 'on' : 'off');
    }
  }

  async function saveDetails() {
    if (!sb || !profile || detailsState === 'busy') return;
    setDetailsState('busy');
    const { error } = await sb
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        platform: platform || null,
        psn_id: psn.trim() || null,
        xbox_gamertag: gamertag.trim() || null,
        ids_public: idsPublic,
        date_of_birth: dob || null,
      })
      .eq('id', profile.id);
    if (error) {
      setDetailsState('error');
      setDetailsMsg(
        /IDS_AGE/.test(error.message)
          ? 'Showing IDs publicly needs a date of birth on file showing 18+.'
          : 'Could not save. Check the fields and try again.',
      );
    } else {
      setDetailsState('done');
      setProfile({
        ...profile,
        bio: bio.trim() || null,
        platform: (platform || null) as Profile['platform'],
        psn_id: psn.trim() || null,
        xbox_gamertag: gamertag.trim() || null,
        ids_public: idsPublic,
        date_of_birth: dob || null,
      });
      setTimeout(() => setDetailsState('idle'), 2000);
    }
  }

  async function chooseFlair(key: string | null) {
    if (!sb || !profile) return;
    setFlairMsg('');
    const { error } = await sb.from('profiles').update({ flair: key }).eq('id', profile.id);
    if (error) {
      setFlairMsg(/FLAIR_LOCKED/.test(error.message) ? 'Locked. This one gets earned higher up the ladder.' : 'Could not set that.');
    } else {
      setProfile({ ...profile, flair: key });
    }
  }

  async function usePreset(src: string) {
    if (!sb || !profile) return;
    const { error } = await sb.from('profiles').update({ avatar_url: src }).eq('id', profile.id);
    if (!error) setProfile({ ...profile, avatar_url: src });
  }

  async function saveHandle() {
    if (!sb || !profile || saveState === 'busy') return;
    const next = handle.trim();
    if (!HANDLE_RE.test(next)) {
      setSaveState('error');
      setSaveMsg('3 to 20 characters: letters, numbers and underscores only.');
      return;
    }
    setSaveState('busy');
    const { error } = await sb.from('profiles').update({ handle: next }).eq('id', profile.id);
    if (error) {
      setSaveState('error');
      setSaveMsg(error.code === '23505' ? 'That handle is taken.' : 'Could not save. Try again.');
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
      setAvatarMsg(err instanceof Error ? err.message : 'Upload failed. Try again.');
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
        <p className="panel__muted">Loading…</p>
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
            One account for your handle, your Respect on The Come-Up, and your 100% progress
            when the tracker lands.
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
                {avail === 'checking' && <p className="panel__hint">Checking…</p>}
                {avail === 'free' && <p className="panel__ok" style={{ marginTop: 8 }}>@{handleField} is free ✓</p>}
                {avail === 'taken' && <p className="panel__err">Taken. Try another.</p>}
                {avail === 'invalid' && (
                  <p className="panel__err">3 to 20 characters: letters, numbers, underscores.</p>
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

            {isUp && (
              <label className="consent-row">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                />
                <span>
                  Email me launch-critical updates: pre-order intel, the launch-day checklist, and
                  first access when the tracker goes live. Unsubscribe any time.
                </span>
              </label>
            )}

            {authState === 'error' && <p className="panel__err">{authMsg}</p>}

            <button className="nl__btn" type="submit" disabled={authState === 'busy'}>
              {authState === 'busy' ? 'One moment…' : isUp ? 'Create account' : 'Sign in'}
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
            {recoveryState === 'busy' ? 'Saving…' : 'Save password'}
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
        <p className="panel__muted">Setting up your profile…</p>
      ) : (
        <>
          <div className="acct__head">
            <div className="acct__avatarcol">
              <div className={`acct__avatar${profile.flair ? ` flair-${profile.flair}` : ''}`}>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <span>{profile.handle.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <label className="avatar-btn" htmlFor="avatar-file">
                {avatarState === 'busy' ? 'Uploading…' : 'Change photo'}
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
                {profile.title && <span className="title-chip">{profile.title}</span>}
                {!profile.is_staff && rank && (
                  <>
                    <span className="rank-chip">
                      {rank.name} <span className="heat heat--gold">{'▮'.repeat(rank.heat)}</span>
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

          {profile.is_staff ? (
            <div className="xp__perk">Above the ladder.</div>
          ) : nextRank ? (
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
                {saveState === 'busy' ? 'Saving…' : 'Save'}
              </button>
            </div>
            {saveState === 'error' && <p className="panel__err">{saveMsg}</p>}
            {saveState === 'done' && <p className="panel__ok">{saveMsg}</p>}
          </div>

          <div className="acct__field">
            <label>Preset avatars</label>
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.src} className="preset" title={p.label} onClick={() => usePreset(p.src)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.label} />
                </button>
              ))}
            </div>
          </div>

          <div className="acct__field">
            <label>Flair {profile.is_staff ? '(staff: all unlocked)' : '(earned on the ladder)'}</label>
            <div className="flairs">
              <button
                className={`flairopt${!profile.flair ? ' on' : ''}`}
                onClick={() => chooseFlair(null)}
              >
                <span className="flairdot" />
                None
              </button>
              {flairs.map((f) => {
                const unlocked = profile.is_staff || profile.rank_id >= f.min_rank_id;
                return (
                  <button
                    key={f.key}
                    className={`flairopt${profile.flair === f.key ? ' on' : ''}${unlocked ? '' : ' locked'}`}
                    onClick={() => unlocked && chooseFlair(f.key)}
                  >
                    <span className={`flairdot flair-${f.key}`} />
                    {f.label}
                    {!unlocked && <em>{ranks.find((r) => r.id === f.min_rank_id)?.name ?? ''}</em>}
                  </button>
                );
              })}
            </div>
            {flairMsg && <p className="panel__err">{flairMsg}</p>}
          </div>

          <div className="acct__field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="nl__input"
              rows={3}
              maxLength={200}
              placeholder="Who are you in Leonida? (200 characters)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="acct__field">
            <label htmlFor="platform">Platform</label>
            <select id="platform" className="nl__input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">Pick one</option>
              <option value="ps5">PS5</option>
              <option value="xbox">Xbox Series X|S</option>
            </select>
          </div>

          <div className="acct__field">
            <label htmlFor="psn">PSN ID</label>
            <input id="psn" className="nl__input" maxLength={30} value={psn} onChange={(e) => setPsn(e.target.value)} />
          </div>
          <div className="acct__field">
            <label htmlFor="gt">Xbox Gamertag</label>
            <input id="gt" className="nl__input" maxLength={30} value={gamertag} onChange={(e) => setGamertag(e.target.value)} />
          </div>

          <div className="acct__field">
            <label htmlFor="dob">Date of birth</label>
            <input
              id="dob"
              type="date"
              className="nl__input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            <p className="panel__hint">
              Only needed to show gamer IDs publicly (18+). Never shown anywhere, ever.
            </p>
          </div>

          <label className="consent-row">
            <input type="checkbox" checked={idsPublic} onChange={(e) => setIdsPublic(e.target.checked)} />
            <span>
              Show my PSN / Gamertag on my public profile (18+, date of birth required).
              Off = only you can see them.
            </span>
          </label>

          <button className="nl__btn" onClick={saveDetails} disabled={detailsState === 'busy'}>
            {detailsState === 'busy' ? 'Saving…' : detailsState === 'done' ? 'Saved ✓' : 'Save profile details'}
          </button>
          {detailsState === 'error' && <p className="panel__err">{detailsMsg}</p>}

          <div className="acct__field" style={{ marginTop: 22 }}>
            <label>The launch list</label>
            <label className="consent-row" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={newsletter2 === 'on' || newsletter2 === 'busy'}
                disabled={newsletter2 === 'unknown' || newsletter2 === 'busy'}
                onChange={toggleNewsletter}
              />
              <span>
                Launch-critical updates: pre-order intel, the launch-day checklist, and first
                access when the tracker goes live. Unsubscribe any time. That’s this box.
              </span>
            </label>
          </div>

          <p style={{ margin: '18px 0 4px' }}>
            <a href={`/u/${profile.handle}`} style={{ color: 'var(--cyan)' }}>
              View your public profile →
            </a>
          </p>

          <div className="acct__meta">
            <span>
              {profile.discord_linked
                ? 'Discord linked ✓'
                : 'Discord not linked. Sign in with Discord and it links itself.'}
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
