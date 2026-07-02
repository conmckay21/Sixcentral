'use client';

import { useState } from 'react';

type Props = {
  /** Recorded against the signup so we know which placement converts. */
  source?: string;
  /** Compact variant for the footer. */
  compact?: boolean;
};

export default function NewsletterSignup({ source = 'web', compact = false }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (data.ok) {
        setState('done');
      } else {
        setState('error');
        setMessage(data.error ?? 'Something went wrong — please try again.');
      }
    } catch {
      setState('error');
      setMessage('Something went wrong — please try again.');
    }
  }

  if (state === 'done') {
    return (
      <div className={compact ? 'nl nl--compact' : 'nl'}>
        <div className="nl__done">You’re on the list. See you at launch. ✓</div>
      </div>
    );
  }

  return (
    <form className={compact ? 'nl nl--compact' : 'nl'} onSubmit={submit}>
      {!compact && (
        <>
          <div className="nl__kicker">The launch list</div>
          <h3 className="nl__title">
            Don’t miss <span className="c">launch week</span>
          </h3>
          <p className="nl__sub">
            One email when it matters — verified pre-order intel, the launch-day checklist, and
            first access when the tracker goes live. No spam, unsubscribe any time.
          </p>
        </>
      )}
      <div className="nl__row">
        <input
          className="nl__input"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
        />
        <button className="nl__btn" type="submit" disabled={state === 'busy'}>
          {state === 'busy' ? 'Adding…' : 'Join the list'}
        </button>
      </div>
      {state === 'error' && <div className="nl__err">{message}</div>}
      {compact && <div className="nl__note">Launch updates only. Unsubscribe any time.</div>}
    </form>
  );
}
