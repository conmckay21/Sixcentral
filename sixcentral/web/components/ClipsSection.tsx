'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Clip = {
  id: string;
  video_id: string;
  caption: string | null;
  category: string | null;
  comp_entry: boolean | null;
  created_at: string;
  profiles: { handle: string } | null;
};

type Friend = { id: string; handle: string };

type SharedClip = {
  id: string;
  created_at: string;
  clip: { video_id: string; caption: string | null } | null;
  from_p: { handle: string } | null;
};

/** Stored via terms_version + agreed_at. Shown verbatim at submission. */
const LICENCE_SUMMARY =
  'You keep ownership. It is your clip, always. You let SixCentral feature it on the site, in the app and in weekly best of compilations. We credit you and link your channel wherever it appears. Ask us to remove it any time.';

function parseYoutubeId(input: string): string | null {
  const m = input.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  const bare = input.trim();
  return /^[A-Za-z0-9_-]{11}$/.test(bare) ? bare : null;
}

export default function ClipsSection() {
  const sb = getBrowserSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('gameplay');
  const [comp, setComp] = useState(true);
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Record<string, string>>({});
  const [inbox, setInbox] = useState<SharedClip[]>([]);

  useEffect(() => {
    if (!sb) {
      setLoaded(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        sb.from('clip_shares')
          .select('id, created_at, clip:clip_submissions!clip_shares_clip_id_fkey(video_id, caption), from_p:profiles!clip_shares_from_profile_fkey(handle)')
          .eq('to_profile', data.session.user.id)
          .order('created_at', { ascending: false })
          .limit(6)
          .then(({ data: shares }) => {
            if (shares) setInbox(shares as unknown as SharedClip[]);
          });
        sb.from('clip_shares')
          .update({ seen_at: new Date().toISOString() })
          .eq('to_profile', data.session.user.id)
          .is('seen_at', null)
          .then(() => {});
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    sb.from('clip_submissions')
      .select('id, video_id, caption, category, comp_entry, created_at, profiles!clip_submissions_profile_id_fkey(handle)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (data) setClips(data as unknown as Clip[]);
        setLoaded(true);
      });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  async function openPicker(clipId: string) {
    if (!sb || !session) return;
    setPickerFor((cur) => (cur === clipId ? null : clipId));
    if (friends !== null) return;
    const uid = session.user.id;
    const { data: edges } = await sb
      .from('friendships')
      .select('requester, addressee, requester_p:profiles!friendships_requester_fkey(handle), addressee_p:profiles!friendships_addressee_fkey(handle)')
      .eq('status', 'accepted');
    const list: Friend[] = (edges ?? []).map((e: Record<string, unknown>) => {
      const mine = e.requester === uid;
      const p = (mine ? e.addressee_p : e.requester_p) as { handle: string } | null;
      return { id: (mine ? e.addressee : e.requester) as string, handle: p?.handle ?? 'unknown' };
    });
    setFriends(list);
  }

  async function sendClip(clipId: string, friendId: string, handle: string) {
    if (!sb || !session) return;
    const { error } = await sb
      .from('clip_shares')
      .insert({ clip_id: clipId, from_profile: session.user.id, to_profile: friendId });
    setSentTo((s) => ({ ...s, [clipId]: error?.code === '23505' ? `Already sent to @${handle}` : error ? 'Could not send' : `Sent to @${handle} ✓` }));
    setPickerFor(null);
  }

  async function dismissShare(id: string) {
    if (!sb) return;
    await sb.from('clip_shares').delete().eq('id', id);
    setInbox((rows) => rows.filter((r) => r.id !== id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || !session || state === 'busy') return;
    const vid = parseYoutubeId(link);
    if (!vid) {
      setState('error');
      setMsg('That does not look like a YouTube link. Paste the full watch, share or Shorts URL.');
      return;
    }
    if (!agree) {
      setState('error');
      setMsg('Tick the licence box and you are good to go.');
      return;
    }
    setState('busy');
    const { error } = await sb.from('clip_submissions').insert({
      profile_id: session.user.id,
      source: 'link',
      video_id: vid,
      caption: caption.trim() || null,
      category,
      comp_entry: comp,
      terms_version: 'v1-web',
      agreed_at: new Date().toISOString(),
      status: 'pending',
    });
    if (error) {
      setState('error');
      setMsg(error.code === '23505' ? 'That clip is already in the system.' : 'Could not submit. Try again.');
    } else {
      setState('done');
    }
  }

  return (
    <>
      <section className="section" id="community-clips">
        <div className="wrap">
          {inbox.length > 0 && (
            <>
              <div className="section__head">
                <h2>
                  Shared <span className="c">with you</span>
                </h2>
              </div>
              <div className="clipgrid" style={{ marginBottom: 34 }}>
                {inbox.map((s) => (
                  <figure key={s.id} className="clipcard">
                    <div className="ytwrap">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${s.clip?.video_id}`}
                        title={s.clip?.caption ?? 'Shared clip'}
                        loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <figcaption>
                      {s.clip?.caption && <span className="clipcard__cap">{s.clip.caption}</span>}
                      <span className="clipcard__meta">
                        {s.from_p?.handle && <Link href={`/u/${s.from_p.handle}`}>from @{s.from_p.handle}</Link>}
                        <button className="clipcard__dismiss" onClick={() => dismissShare(s.id)}>
                          Dismiss
                        </button>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
          <div className="section__head">
            <h2>
              The community <span className="c">feed</span>
            </h2>
          </div>
          {clips.length === 0 ? (
            <p className="panel__muted">
              {loaded
                ? 'The feed opens with the game. First featured clip in SixCentral history is up for grabs on launch night.'
                : 'Loading…'}
            </p>
          ) : (
            <div className="clipgrid">
              {clips.map((c) => (
                <figure key={c.id} className="clipcard">
                  <div className="ytwrap">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${c.video_id}`}
                      title={c.caption ?? 'Community clip'}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <figcaption>
                    {c.caption && <span className="clipcard__cap">{c.caption}</span>}
                    <span className="clipcard__meta">
                      {c.profiles?.handle && (
                        <Link href={`/u/${c.profiles.handle}`}>@{c.profiles.handle}</Link>
                      )}
                      {c.comp_entry && <em>Clip of the Month entry</em>}
                      {session && (
                        <button className="clipcard__send" onClick={() => openPicker(c.id)}>
                          Send to a friend
                        </button>
                      )}
                    </span>
                    {sentTo[c.id] && <span className="clipcard__sent">{sentTo[c.id]}</span>}
                    {pickerFor === c.id && (
                      <span className="friendpick">
                        {friends === null ? (
                          <em>Loading friends…</em>
                        ) : friends.length === 0 ? (
                          <em>No friends yet. Add people from their profiles first.</em>
                        ) : (
                          friends.map((f) => (
                            <button key={f.id} className="friend-btn" onClick={() => sendClip(c.id, f.id, f.handle)}>
                              @{f.handle}
                            </button>
                          ))
                        )}
                      </span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 720 }}>
          {state === 'done' ? (
            <div className="panel">
              <div className="kicker" style={{ color: 'var(--green)' }}>Submitted</div>
              <h2 className="panel__title">In the queue ✓</h2>
              <p className="panel__muted">
                A moderator checks it. Once approved it joins the feed and 50 Respect lands on your
                profile.
              </p>
              <button
                className="btn-signout"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setState('idle');
                  setLink('');
                  setCaption('');
                }}
              >
                Submit another
              </button>
            </div>
          ) : !session ? (
            <div className="panel">
              <div className="kicker">Submit a clip</div>
              <h2 className="panel__title">Sign in to submit</h2>
              <p className="panel__muted" style={{ maxWidth: '54ch' }}>
                Clips are tied to your profile. Approved clips pay 50 Respect and put your handle
                on the feed.
              </p>
              <Link href="/account" className="btn-crew" style={{ marginTop: 16 }}>
                Sign in / create account
              </Link>
            </div>
          ) : (
            <form className="panel" onSubmit={submit}>
              <div className="kicker">Submit a clip</div>
              <h2 className="panel__title">Get on the feed</h2>
              <p className="panel__muted" style={{ maxWidth: '56ch' }}>
                Paste a YouTube link. Works with normal videos and Shorts. Console share and
                direct upload arrive with the app.
              </p>

              <div className="acct__field">
                <label htmlFor="cliplink">YouTube link</label>
                <input
                  id="cliplink"
                  className="nl__input"
                  placeholder="https://youtu.be/…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  required
                />
              </div>

              <div className="acct__field">
                <label htmlFor="clipcap">Caption</label>
                <input
                  id="clipcap"
                  className="nl__input"
                  maxLength={140}
                  placeholder="Rooftop chase gone perfectly wrong"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>

              <div className="acct__field">
                <label htmlFor="clipcat">Category</label>
                <select id="clipcat" className="nl__input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="gameplay">Gameplay</option>
                  <option value="funny">Funny</option>
                  <option value="stunt">Stunt</option>
                  <option value="discovery">Discovery</option>
                </select>
              </div>

              <label className="consent-row">
                <input type="checkbox" checked={comp} onChange={(e) => setComp(e.target.checked)} />
                <span>Enter Clip of the Month. Community votes, winner takes free Premium.</span>
              </label>

              <div className="licence-box">
                <div className="kicker" style={{ fontSize: '0.58rem' }}>The clip licence, in plain English</div>
                <p>{LICENCE_SUMMARY}</p>
              </div>

              <label className="consent-row">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
                <span>I agree to the Clip Licence above.</span>
              </label>

              {state === 'error' && <p className="panel__err">{msg}</p>}

              <button className="nl__btn" type="submit" disabled={state === 'busy'}>
                {state === 'busy' ? 'Submitting…' : 'Submit for review'}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
