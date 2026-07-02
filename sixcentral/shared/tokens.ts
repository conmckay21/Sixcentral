/**
 * SixCentral design tokens — shared across web (Next.js) and mobile (Expo).
 *
 * The web app mirrors these as CSS custom properties in app/globals.css.
 * The Expo app imports this file directly (e.g. theme.colors.pink).
 * Keep this file as the source of truth; update both sides when it changes.
 */

export const colors = {
  bg: '#0B0810',
  bg2: '#120D1B',
  surface: '#181222',
  surface2: '#221634',

  pink: '#FF2E88',
  pinkLight: '#FF5CA0',
  cyan: '#1FE5D6',
  green: '#35E27C',
  gold: '#FFC83D',
  orange: '#FF9E45',
  purple: '#8A4FFF',

  text: '#F4EFE8',
  muted: '#A498BC',
  dim: '#6F6488',

  line: 'rgba(255,255,255,0.09)',
  line2: 'rgba(255,255,255,0.18)',
} as const;

export const gradients = {
  sunset: 'linear-gradient(115deg, #FF2E88 0%, #FF7A4D 58%, #FFC83D 100%)',
} as const;

export const fonts = {
  display: "'Anton', Impact, sans-serif",
  body: "'Space Grotesk', system-ui, sans-serif",
  mono: "'Spline Sans Mono', ui-monospace, monospace",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** GTA 6 launch — Thursday 19 November 2026 (used by the countdown). */
export const LAUNCH_DATE = '2026-11-19T00:00:00Z';

export const theme = { colors, gradients, fonts, radii, LAUNCH_DATE };
export default theme;
