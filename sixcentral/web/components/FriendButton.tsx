'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Edge = { id: string; requester: string; addressee: string; status: 'pending' | 'accepted' };

/** Add friend / accept / cancel / remove, shown on public profiles. */
export default function FriendButton({ profileId }: { profileId: string }) {
  const sb = getBrowserSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [edge, setEdge] = useState<Edge | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (uid: string) => {
      if (!sb) return;
      const { data } = await sb
        .from('friendships')
        .select('id, requester, addressee, status')
        .or(
          `and(requester.eq.${uid},addressee.eq.${profileId}),and(requester.eq.${profileId},addressee.eq.${uid})`,
        )
        .maybeSingle();
      setEdge((data as Edge) ?? null);
      setReady(true);
    },
    [sb, profileId],
  );

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) load(data.session.user.id);
      else setReady(true);
    });
  }, [sb, load]);

  if (!sb || !ready) return null;
  if (!session) {
    return (
      <Link href="/account" className="friend-hint">
        Sign in to add friends
      </Link>
    );
  }
  const uid = session.user.id;
  if (uid === profileId) return null;

  async function act(fn: () => PromiseLike<unknown>) {
    if (busy) return;
    setBusy(true);
    await fn();
    await load(uid);
    setBusy(false);
  }

  if (!edge) {
    return (
      <button
        className="friend-btn friend-btn--add"
        disabled={busy}
        onClick={() => act(() => sb!.from('friendships').insert({ requester: uid, addressee: profileId }))}
      >
        + Add friend
      </button>
    );
  }
  if (edge.status === 'pending' && edge.requester === uid) {
    return (
      <span className="friend-set">
        <span className="friend-state">Requested</span>
        <button className="friend-btn" disabled={busy} onClick={() => act(() => sb!.from('friendships').delete().eq('id', edge.id))}>
          Cancel
        </button>
      </span>
    );
  }
  if (edge.status === 'pending') {
    return (
      <span className="friend-set">
        <button
          className="friend-btn friend-btn--add"
          disabled={busy}
          onClick={() =>
            act(() =>
              sb!
                .from('friendships')
                .update({ status: 'accepted', responded_at: new Date().toISOString() })
                .eq('id', edge.id),
            )
          }
        >
          Accept
        </button>
        <button className="friend-btn" disabled={busy} onClick={() => act(() => sb!.from('friendships').delete().eq('id', edge.id))}>
          Decline
        </button>
      </span>
    );
  }
  return (
    <span className="friend-set">
      <span className="friend-state friend-state--on">Friends ✓</span>
      <button className="friend-btn" disabled={busy} onClick={() => act(() => sb!.from('friendships').delete().eq('id', edge.id))}>
        Remove
      </button>
    </span>
  );
}
