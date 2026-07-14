/** Flair ring colours, keyed to the flairs table. Kept in step with the
 *  flair treatments in web/app/globals.css so a rank looks the same
 *  on the site and in the app. */
export const FLAIR_COLORS: Record<string, string> = {
  teal_trim: '#58B7C9',
  cyan_edge: '#1FE5D6',
  cyan_glow: '#1FE5D6',
  heist_green: '#35E27C',
  gold_trim: '#FFC83D',
  amber_ring: '#FF9E45',
  ember_ring: '#FF6B5D',
  kingpin_pink: '#FF2E88',
  legend_neon: '#8A4FFF',
};
export function flairColor(key: string | null | undefined, fallback = '#FF2E88') {
  return (key && FLAIR_COLORS[key]) || fallback;
}
