import HeroArt from '@/components/HeroArt';
import type { Motif, HeroImage } from '@/lib/types';

/**
 * HeroMedia — the one media slot for every card and article hero.
 *
 * If the content has a `heroImage` (an official, credited press screenshot
 * the editor has added to /public/media), it renders that with an automatic
 * credit chip. Otherwise it falls back to SixCentral's original HeroArt.
 *
 * Editorial rule: images come only from Rockstar's official published
 * galleries (Newswire / media page), always credited, used in article
 * context only — never in branding, logos, or store creative.
 */
export default function HeroMedia({
  motif,
  gradient,
  heroImage,
  compact = false,
  showCredit = false,
}: {
  motif?: Motif;
  gradient?: string;
  heroImage?: HeroImage;
  compact?: boolean;
  showCredit?: boolean;
}) {
  if (heroImage) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage.src}
          alt={heroImage.alt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {showCredit && heroImage.credit && (
          <span className="media-credit">Image: {heroImage.credit}</span>
        )}
      </>
    );
  }
  return <HeroArt motif={motif} gradient={gradient} compact={compact} />;
}
