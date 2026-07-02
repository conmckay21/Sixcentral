'use client';

import { useMemo, useState } from 'react';
import type { Guide, Category } from '@/lib/types';
import GuideCard from './GuideCard';

export default function GuidesExplorer({
  guides,
  categories,
}: {
  guides: Guide[];
  categories: Category[];
}) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return guides.filter((g) => {
      const okCat = cat === 'all' || g.category === cat;
      const okQ =
        !query ||
        `${g.title} ${g.excerpt} ${g.kicker}`.toLowerCase().includes(query);
      return okCat && okQ;
    });
  }, [guides, cat, q]);

  return (
    <>
      <div className="search">
        <span style={{ color: 'var(--dim)' }}>⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${guides.length} guides…`}
          aria-label="Search guides"
        />
      </div>

      <div className="cats">
        {categories.map((c) => (
          <button
            key={c.slug}
            className={`cchip${cat === c.slug ? ' on' : ''}`}
            onClick={() => setCat(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid grid--3">
          {filtered.map((g) => (
            <GuideCard key={g.slug} guide={g} />
          ))}
        </div>
      ) : (
        <p className="empty">No guides match that search.</p>
      )}
    </>
  );
}
