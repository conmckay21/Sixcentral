'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type TypeRow = { key: string; label: string; points: number };

const WEB_TYPES = ['verified_correction', 'intel'];

export default function ContributeForm() {
  const sb = getBrowserSupabase();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [types, setTypes] = useState<TypeRow[]>([]);

  const [typeKey, setTypeKey] = useState('verified_correction');
  const [about, setAbout] = useState('');
  const [details, setDetails] = useState('');
  const [source, setSource] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Prefill from ?type= and ?about= (set by the "report an error" links).
    const params = new URLSearchParams(window.location.search);
    const t = params.get('type');
    const a = params.get('about');
    if (t && WEB_TYPES.includes(t)) setTypeKey(t);
    if (a) setAbout(a.slice(0, 200));

    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    sb.from('contribution_types')
      .select('*')
      .in('key', WEB_TYPES)
      .then(({ data }) => data && setTypes(data as TypeRow[]));

    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const selected = types.find((t) => t.key === typeKey);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || !session || state === 'busy') return;
    if (details.trim().length < 20) {
      setState('error');
      setMsg('Give the mods something to verify. A sentence or two at least.');
      return;
    }
    setState('busy');
    const { error } = await sb.from('contributions').insert({
      profile_id: session.user.id,
      type_key: typeKey,
      status: 'pending',
      payload: {
        about: about.trim() || null,
        details: details.trim(),
        source: source.trim() || null,
      },
    });
    if (error) {
      setState('error');
      setMsg('Could not submit. Try again.');
    } else {
      setState('done');
    }
  }

  if (!sb || !ready) {
    return <div className="panel"><p className="panel__muted">Loading…</p></div>;
  }

  if (!session) {
    return (
      <div className="panel">
        <div className="kicker">Contribute</div>
        <h2 className="panel__title">Sign in to submit</h2>
        <p className="panel__muted" style={{ maxWidth: '54ch' }}>
          Contributions are tied to your profile, and confirmed submissions bank Respect on
          The Come-Up. Takes thirty seconds.
        </p>
        <Link href="/account" className="btn-crew" style={{ marginTop: 16 }}>
          Sign in / create account
        </Link>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="panel">
        <div className="kicker" style={{ color: 'var(--green)' }}>Submitted</div>
        <h2 className="panel__title">In the queue ✓</h2>
        <p className="panel__muted" style={{ maxWidth: '54ch' }}>
          A moderator will verify it. If it holds up, {selected ? `+${selected.points} Respect` : 'Respect'} lands
          on your profile automatically. The board only ever pays out for confirmed work.
        </p>
        <button
          className="btn-signout"
          style={{ marginTop: 16 }}
          onClick={() => {
            setState('idle');
            setDetails('');
            setSource('');
          }}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="kicker">Contribute</div>
      <h2 className="panel__title">Submit intel or a correction</h2>
      <p className="panel__muted" style={{ maxWidth: '58ch' }}>
        Everything goes through verification before it counts. That gate keeps SixCentral
        trustworthy and the board honest.
      </p>

      <div className="acct__field">
        <label htmlFor="ctype">What is it?</label>
        <select id="ctype" className="nl__input" value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
          <option value="verified_correction">A factual correction to something we published</option>
          <option value="intel">Intel / a tip we should cover</option>
        </select>
        {selected && <p className="panel__hint">Worth +{selected.points} Respect when confirmed.</p>}
      </div>

      <div className="acct__field">
        <label htmlFor="cabout">What is it about? Article link or topic, optional</label>
        <input
          id="cabout"
          className="nl__input"
          value={about}
          maxLength={200}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="/news/which-edition-to-preorder"
        />
      </div>

      <div className="acct__field">
        <label htmlFor="cdetails">The details</label>
        <textarea
          id="cdetails"
          className="nl__input"
          rows={5}
          value={details}
          maxLength={2000}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="What's wrong / what do you know, and how do you know it?"
        />
      </div>

      <div className="acct__field">
        <label htmlFor="csource">Source link (strongly recommended)</label>
        <input
          id="csource"
          className="nl__input"
          value={source}
          maxLength={300}
          onChange={(e) => setSource(e.target.value)}
          placeholder="https://…"
        />
      </div>

      {state === 'error' && <p className="panel__err">{msg}</p>}

      <button className="nl__btn" type="submit" disabled={state === 'busy'}>
        {state === 'busy' ? 'Submitting…' : 'Submit for verification'}
      </button>
    </form>
  );
}
