import { PLAY_STORE_URL } from '@/lib/site';

/**
 * The standard "Get it on Google Play" badge. Google's brand guidelines
 * require the official artwork unmodified, so this renders the badge asset
 * from /public rather than redrawing it. The artwork's aspect ratio is
 * 180:53.333; width follows from height so there is no layout shift.
 */
export default function PlayStoreBadge({ height = 52 }: { height?: number }) {
  const width = Math.round(height * (180 / 53.333));
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get SixCentral on Google Play"
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <img src="/app/google-play-badge.svg" alt="" width={width} height={height} />
    </a>
  );
}
