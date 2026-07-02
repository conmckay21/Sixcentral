/** Brand palette for native, sourced from shared tokens. */
export const C = {
  bg: '#0B0810',
  bg2: '#120D1B',
  surface: '#1A1226',
  line: '#241A33',
  line2: '#332347',
  text: '#EDE7F5',
  muted: '#9C8FB3',
  dim: '#6F6488',
  purple: '#8A4FFF',
  pink: '#FF2E88',
  pinkL: '#FF6AAE',
  cyan: '#1FE5D6',
  gold: '#FFC83D',
  green: '#37D67A',
} as const;

/** Mockup gradients: linear-gradient(160deg, ...) from the hub design. */
export const G = {
  hot: ['#FF2E88', '#8A4FFF', '#1FE5D6'] as const,
  cool: ['#1FE5D6', '#8A4FFF', '#FF2E88'] as const,
  gold: ['#FFC83D', '#FF2E88', '#8A4FFF'] as const,
};
export const GRAD = { start: { x: 0.1, y: 0 }, end: { x: 0.75, y: 1 } } as const;
