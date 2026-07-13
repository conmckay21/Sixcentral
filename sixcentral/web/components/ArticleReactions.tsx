'use client';

import { useEffect, useState } from 'react';

/**
 * Like/dislike for articles. One vote per person, changeable: identity is the
 * signed-in profile when the app supplies a token, otherwise a device id kept
 * in localStorage. Counts come from the reactions API so they are always live
 * regardless of ISR.
 */
export default function ArticleReactions({ slug }: { slug: string }) {
  const [up, setUp] = useState<number | null>(null);
  const [down, setDown] = useState<number | null>(null);
  const [mine, setMine] = useState<0 | 1 | -1>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(`sc-vote:${slug}`) ?? '0');
      if (saved === 1 || saved === -1) setMine(saved);
    } catch {}
    fetch(`/api/reactions?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { up: number; down: number }) => {
        setUp(j.up);
        setDown(j.down);
      })
      .catch(() => {
        setUp(0);
        setDown(0);
      });
  }, [slug]);

  function anonId(): string {
    let id = '';
    try {
      id = localStorage.getItem('sc-anon-id') ?? '';
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('sc-anon-id', id);
      }
    } catch {}
    return id;
  }

  async function vote(v: 1 | -1) {
    if (busy || up === null || down === null) return;
    const next = mine === v ? 0 : v;
    // Optimistic counts.
    setUp(up + (next === 1 ? 1 : 0) - (mine === 1 ? 1 : 0));
    setDown(down + (next === -1 ? 1 : 0) - (mine === -1 ? 1 : 0));
    setMine(next);
    setBusy(true);
    try {
      localStorage.setItem(`sc-vote:${slug}`, String(next));
    } catch {}
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, value: next, anonId: anonId() }),
      });
      if (res.ok) {
        const j = await res.json();
        setUp(j.up);
        setDown(j.down);
      }
    } catch {}
    setBusy(false);
  }

  const btn = (active: boolean, colour: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 999,
    border: `1px solid ${active ? colour : 'var(--line2)'}`,
    background: active ? `color-mix(in srgb, ${colour} 14%, transparent)` : 'transparent',
    color: active ? colour : 'var(--muted)',
    cursor: 'pointer',
    fontFamily: 'var(--mono)',
    fontSize: '0.8rem',
    letterSpacing: '0.06em',
    transition: 'all 120ms ease',
  });

  return (
    <div style={{ marginTop: 36, borderTop: '1px solid var(--line2)', paddingTop: 22 }}>
      <div className="mono" style={{ fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
        Good intel?
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" aria-pressed={mine === 1} onClick={() => vote(1)} style={btn(mine === 1, 'var(--green)')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          {up === null ? '·' : up}
        </button>
        <button type="button" aria-pressed={mine === -1} onClick={() => vote(-1)} style={btn(mine === -1, 'var(--orange)')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: 'scale(1,-1)' }}>
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          {down === null ? '·' : down}
        </button>
      </div>
    </div>
  );
}
