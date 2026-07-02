import type { Metadata } from 'next';
import PublicProfileView from '@/components/PublicProfile';

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const h = decodeURIComponent(params.handle);
  return {
    title: `@${h} on SixCentral`,
    description: `@${h} on The Come-Up. Rank, Respect and verified finds.`,
    alternates: { canonical: `/u/${h}` },
  };
}

export default function ProfilePage({ params }: { params: { handle: string } }) {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <PublicProfileView handle={decodeURIComponent(params.handle)} />
      </div>
    </section>
  );
}
