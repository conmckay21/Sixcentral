'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const C = {
  bg: '#0B0810',
  panel: '#140F1C',
  line: '#2A2138',
  text: '#EDE9F2',
  dim: '#9A8FB0',
  pink: '#FF2E88',
  cyan: '#1FE5D6',
  green: '#35E27C',
  gold: '#FFC83D',
};

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

type SetRow = { slug: string; name: string; total: number | null; cadence: string; items: number };
type Item = { idx: number; label: string; notes: string | null; verified: boolean };
type Phase = 'loading' | 'noenv' | 'signedout' | 'denied' | 'ready' | 'error';

export default function CollectiblesDesk() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [sets, setSets] = useState<SetRow[]>([]);
  const [active, setActive] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const newLabelRef = useRef<HTMLInputElement>(null);

  const sb = getClient();

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await sb!.auth.getSession();
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${data?.session?.access_token ?? ''}`,
    };
  }, [sb]);

  const api = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch('/api/admin/collectible-items', {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'request failed');
      return json;
    },
    [authHeader]
  );

  const loadSets = useCallback(async () => {
    const json = await api({ op: 'sets' });
    setSets(json.sets ?? []);
  }, [api]);

  const loadItems = useCallback(
    async (slug: string) => {
      const json = await api({ op: 'list', set_slug: slug });
      setItems(json.items ?? []);
    },
    [api]
  );

  useEffect(() => {
    (async () => {
      if (!sb) return setPhase('noenv');
      try {
        const { data: userData } = await sb.auth.getUser();
        if (!userData?.user) return setPhase('signedout');
        const { data: profile } = await sb
          .from('profiles')
          .select('is_staff')
          .eq('id', userData.user.id)
          .maybeSingle();
        if (!profile?.is_staff) return setPhase('denied');
        await loadSets();
        setPhase('ready');
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'failed');
        setPhase('error');
      }
    })();
  }, [sb, loadSets]);

  const pick = useCallback(
    async (slug: string) => {
      setActive(slug);
      setItems([]);
      if (slug) await loadItems(slug);
    },
    [loadItems]
  );

  const save = useCallback(
    async (item: Item) => {
      setBusy(true);
      setErr('');
      try {
        await api({ op: 'upsert', set_slug: active, ...item });
        await Promise.all([loadItems(active), loadSets()]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'save failed');
      } finally {
        setBusy(false);
      }
    },
    [api, active, loadItems, loadSets]
  );

  const remove = useCallback(
    async (idx: number) => {
      setBusy(true);
      setErr('');
      try {
        await api({ op: 'delete', set_slug: active, idx });
        await Promise.all([loadItems(active), loadSets()]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'delete failed');
      } finally {
        setBusy(false);
      }
    },
    [api, active, loadItems, loadSets]
  );

  const nextIdx = items.length ? Math.max(...items.map((i) => i.idx)) + 1 : 1;
  const activeSet = sets.find((s) => s.slug === active);

  const quickAdd = useCallback(async () => {
    if (!newLabel.trim() || !active) return;
    await save({ idx: nextIdx, label: newLabel.trim(), notes: newNotes.trim() || null, verified: false });
    setNewLabel('');
    setNewNotes('');
    newLabelRef.current?.focus();
  }, [newLabel, newNotes, active, nextIdx, save]);

  if (phase !== 'ready') {
    const msg: Record<Phase, string> = {
      loading: 'Loading…',
      noenv: 'Missing Supabase environment.',
      signedout: 'Sign in with a staff account to use the atlas desk.',
      denied: 'This desk is staff only.',
      error: err || 'Something went wrong.',
      ready: '',
    };
    return (
      <div style={{ background: C.bg, minHeight: '100vh', color: C.dim, display: 'grid', placeItems: 'center', fontFamily: 'ui-monospace, monospace' }}>
        {msg[phase]}
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '28px 18px', fontFamily: 'ui-sans-serif, system-ui' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <a href="/staff/intel" style={{ color: C.cyan, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>&larr; Intel Desk</a>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.4, margin: '10px 0 0' }}>
          COLLECTIBLES <span style={{ color: C.pink }}>ATLAS DESK</span>
        </h1>
        <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
          Item labels feed the app tracker instantly. Draft freely, then tick Verified once a
          location is confirmed in-game.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' }}>
          {sets.map((s) => (
            <button
              key={s.slug}
              onClick={() => pick(s.slug)}
              style={{
                background: active === s.slug ? C.pink : 'rgba(255,255,255,0.04)',
                color: active === s.slug ? '#fff' : C.dim,
                border: `1px solid ${active === s.slug ? C.pink : C.line}`,
                borderRadius: 99,
                padding: '7px 13px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {s.name} · {s.items}/{s.total ?? '∞'}
            </button>
          ))}
        </div>

        {active ? (
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
            <div style={{ color: C.cyan, fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
              {activeSet?.name} · {items.length} of {activeSet?.total ?? '∞'} entered ·{' '}
              {items.filter((i) => i.verified).length} verified
            </div>

            {items.map((it) => (
              <div key={it.idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: C.dim, fontSize: 12, width: 34, fontWeight: 800 }}>#{it.idx}</span>
                <input
                  defaultValue={it.label}
                  onBlur={(e) => {
                    if (e.target.value !== it.label) save({ ...it, label: e.target.value });
                  }}
                  style={inputStyle}
                />
                <input
                  defaultValue={it.notes ?? ''}
                  placeholder="notes"
                  onBlur={(e) => {
                    if ((e.target.value || null) !== it.notes) save({ ...it, notes: e.target.value || null });
                  }}
                  style={{ ...inputStyle, flex: 1.4 }}
                />
                <button
                  onClick={() => save({ ...it, verified: !it.verified })}
                  disabled={busy}
                  style={{
                    background: it.verified ? 'rgba(53,226,124,0.15)' : 'rgba(255,255,255,0.04)',
                    color: it.verified ? C.green : C.dim,
                    border: `1px solid ${it.verified ? C.green : C.line}`,
                    borderRadius: 8,
                    padding: '7px 10px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {it.verified ? 'VERIFIED' : 'DRAFT'}
                </button>
                <button
                  onClick={() => remove(it.idx)}
                  disabled={busy}
                  style={{ background: 'transparent', color: C.dim, border: 'none', cursor: 'pointer', fontSize: 14 }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
              <span style={{ color: C.gold, fontSize: 12, width: 34, fontWeight: 800 }}>#{nextIdx}</span>
              <input
                ref={newLabelRef}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') quickAdd();
                }}
                placeholder="label, e.g. LSIA radar tower roof"
                style={inputStyle}
              />
              <input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') quickAdd();
                }}
                placeholder="notes (optional)"
                style={{ ...inputStyle, flex: 1.4 }}
              />
              <button
                onClick={quickAdd}
                disabled={busy || !newLabel.trim()}
                style={{
                  background: C.pink,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ADD
              </button>
            </div>
            {err ? <div style={{ color: C.pink, fontSize: 12, marginTop: 10 }}>{err}</div> : null}
          </div>
        ) : (
          <div style={{ color: C.dim, fontSize: 13 }}>Pick a set to start entering items.</div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid #2A2138`,
  borderRadius: 8,
  color: '#EDE9F2',
  fontSize: 12.5,
  padding: '8px 10px',
  outline: 'none',
};
