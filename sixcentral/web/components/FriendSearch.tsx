'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import FriendButton from '@/components/FriendButton';

type Result = {
  id: string;
  handle: string;
  avatar_url: string | null;
  title: string | null;
  flair: string | null;
};

/** Live handle search with a friend button on every result. */
export default function FriendSearch() {
  const sb = getBrowserSupabase();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!sb) return;
    const t = term.trim();
    if (t.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await sb
        .from('public_profiles')
        .select('id, handle, avatar_url, title, flair')
        .ilike('handle', `%${t}%`)
        .order('respect', { ascending: false })
        .limit(8);
      setResults((data as Result[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [sb, term]);

  return (
    <div className="frsearch">
      <input
        className="nl__input"
        placeholder="Search handles, e.g. Mckay21"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Search for friends by handle"
      />
      {term.trim().length >= 2 && (
        <div className="frsearch__results">
          {searching && results.length === 0 ? (
            <p className="panel__hint" style={{ padding: '10px 14px', margin: 0 }}>Searching…</p>
          ) : results.length === 0 ? (
            <p className="panel__hint" style={{ padding: '10px 14px', margin: 0 }}>
              Nobody by that handle yet.
            </p>
          ) : (
            results.map((r) => (
              <div key={r.id} className="frsearch__row">
                <span className={`lb__avatar${r.flair ? ` flair-${r.flair}` : ''}`}>
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" />
                  ) : (
                    <span>{r.handle.slice(0, 1).toUpperCase()}</span>
                  )}
                </span>
                <span className="frsearch__who">
                  <Link href={`/u/${r.handle}`}>@{r.handle}</Link>
                  {r.title && <em>{r.title}</em>}
                </span>
                <FriendButton profileId={r.id} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
