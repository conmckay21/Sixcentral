import type { Metadata } from 'next';
import GuidesExplorer from '@/components/GuidesExplorer';
import { getGuides, getCategories } from '@/lib/content';

export const metadata: Metadata = {
  title: 'GTA 6 Guides',
  description:
    'Verified Grand Theft Auto VI guides — beginner tips, money methods, collectibles, and full completion walkthroughs, wired to your tracker.',
  alternates: { canonical: '/guides' },
};

export default async function GuidesPage() {
  const [guides, categories] = await Promise.all([getGuides(), getCategories()]);

  return (
    <section className="section">
      <div className="wrap">
        <div className="section__head">
          <h2>
            GTA 6 <span className="c">guides</span>
          </h2>
        </div>
        <p style={{ color: 'var(--muted)', maxWidth: '60ch', marginBottom: 22 }}>
          Everything from your first hours to 100% completion. Trackable guides sync with the
          companion app, so they know what you have already done.
        </p>
        <GuidesExplorer guides={guides} categories={categories} />
      </div>
    </section>
  );
}
