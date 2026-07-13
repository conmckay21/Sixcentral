import { APP_STORE_URL } from '@/lib/site';

/**
 * The standard black "Download on the App Store" badge, drawn inline so it
 * ships with zero extra requests and scales crisply. Follows Apple's badge
 * artwork: black fill, thin grey keyline, white mark and lettering. Keep it
 * unmodified per Apple's marketing guidelines; brand styling belongs around
 * the badge, never on it.
 */
export default function AppStoreBadge({ height = 52 }: { height?: number }) {
  const width = Math.round(height * 3);
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download SixCentral on the App Store"
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 40"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="0.5" y="0.5" width="119" height="39" rx="7.5" fill="#000" stroke="#A6A6A6" />
        <path
          fill="#FFF"
          d="M24.77 20.3c.04 3.9 3.42 5.2 3.46 5.22-.03.09-.54 1.85-1.78 3.67-1.08 1.57-2.19 3.14-3.95 3.17-1.72.03-2.28-1.02-4.25-1.02-1.98 0-2.59.99-4.23 1.05-1.69.07-2.98-1.7-4.06-3.27-2.22-3.21-3.91-9.08-1.64-13.04 1.13-1.97 3.15-3.21 5.34-3.25 1.66-.03 3.24 1.12 4.26 1.12 1.01 0 2.92-1.38 4.93-1.18.84.04 3.2.34 4.71 2.56-.12.08-2.81 1.65-2.79 4.97M21.3 8.26c.9-1.09 1.51-2.61 1.34-4.12-1.3.05-2.86.87-3.79 1.95-.84.97-1.57 2.51-1.37 3.99 1.44.11 2.92-.73 3.82-1.82"
        />
        <text
          x="40"
          y="15"
          fill="#FFF"
          fontFamily="-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontSize="8.2"
          letterSpacing="0.4"
        >
          Download on the
        </text>
        <text
          x="40"
          y="31"
          fill="#FFF"
          fontFamily="-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontSize="15"
          fontWeight="600"
        >
          App Store
        </text>
      </svg>
    </a>
  );
}
