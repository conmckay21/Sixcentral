/** Flair ring colours, keyed to the flairs table. */
export const FLAIR_COLORS: Record<string, string> = {
  teal_trim: '#1FE5D6',
  cyan_glow: '#1FE5D6',
  heist_green: '#37D67A',
  gold_trim: '#FFC83D',
  ember_ring: '#FF7A45',
  kingpin_pink: '#FF2E88',
  legend_neon: '#8A4FFF',
};

export function flairColor(key: string | null | undefined, fallback = '#FF2E88') {
  return (key && FLAIR_COLORS[key]) || fallback;
}
