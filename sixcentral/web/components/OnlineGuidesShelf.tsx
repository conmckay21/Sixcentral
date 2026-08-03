'use client';

import { useMemo, useState } from 'react';
import type { Guide } from '@/lib/types';
import GuideCard from './GuideCard';

/**
 * Turns a guide kicker into a filter topic. Kickers are the source of truth,
 * so new desks (Weapons guide, Vehicles guide) grow their own chip automatically.
 */
const TOPIC_LABELS: Record<string, string> = {
  'heist guide': 'Heists',
  'business guide': 'Business',
  'weapons guide': 'Weapons',
  'vehicles guide': 'Vehicles',
  'money guide': 'Money',
  'the comparison desk': 'Comparisons',
};

function topicOf(kicker: string): string {
  const k = kicker.trim().toLowerCase();
  if (TOPIC_LABELS[k]) return TOPIC_LABELS[k];
  if (k.includes('comparison')) return 'Comparisons';
  return kicker.trim().replace(/\s*guide$/i, '') || 'Guides';
}

const TOPIC_ORDER: Record<string, number> = { Heists: 0, Business: 1, Money: 2, Weapons: 3, Vehicles: 4, Comparisons: 90 };

export default function OnlineGuidesShelf({ guides }: { guides: Guide[] }) {
  const [topic, setTopic] = useState('All');
  const [q, setQ] = useState('');

  const topics = useMemo(() => {
    const seen = new Set<string>();
    for (const g of guides) seen.add(topicOf(g.kicker));
    return [
      'All',
      ...Array.from(seen).sort(
        (a, b) => (TOPIC_ORDER[a] ?? 50) - (TOPIC_ORDER[b] ?? 50) || a.localeCompare(b)
      ),
    ];
  }, [guides]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return guides.filter((g) => {
      const okTopic = topic === 'All' || topicOf(g.kicker) === topic;
      const okQ =
        !query || `${g.title} ${g.excerpt} ${g.kicker}`.toLowerCase().includes(query);
      return okTopic && okQ;
    });
  }, [guides, topic, q]);

  return (
    <>
      <div className="search">
        <span style={{ color: 'var(--dim)' }}>⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${guides.length} GTA Online guides…`}
          aria-label="Search GTA Online guides"
        />
      </div>

      <div className="cats">
        {topics.map((t) => (
          <button
            key={t}
            className={`cchip${topic === t ? ' on' : ''}`}
            onClick={() => setTopic(t)}
          >
            {t}
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
