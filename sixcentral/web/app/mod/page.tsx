import type { Metadata } from 'next';
import ModQueue from '@/components/ModQueue';

export const metadata: Metadata = {
  title: 'Moderation queue',
  robots: { index: false },
};

export default function ModPage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 860 }}>
        <ModQueue />
      </div>
    </section>
  );
}
