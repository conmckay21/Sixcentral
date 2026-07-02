import Link from 'next/link';
import type { Guide } from '@/lib/types';
import { formatDate } from '@/lib/format';
import HeroMedia from '@/components/HeroMedia';

export default function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link href={`/guides/${guide.slug}`} className="card">
      <div className="card__media" style={{ background: guide.gradient }}>
        <HeroMedia motif={guide.motif} gradient={guide.gradient} heroImage={guide.heroImage} />
        <div className="v" />
      </div>
      <div className="card__body">
        {guide.isNew && <span className="badge-new">New</span>}
        <span className="card__kicker">{guide.kicker}</span>
        <span className="card__title">{guide.title}</span>
        {guide.trackable && (
          <div className="progress-chip">
            <div className="pr">
              <span className="pl">Tracked</span>
              <span className="pv">in the app</span>
            </div>
            <div className="bar">
              <span style={{ width: '42%' }} />
            </div>
          </div>
        )}
        <span className="card__meta">
          {guide.readingMins} min · updated {formatDate(guide.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
