export type Motif =
  | 'skyline' | 'palms' | 'cassette' | 'disc' | 'money' | 'map'
  | 'signal' | 'phone' | 'controller' | 'pc' | 'globe' | 'question';

export type Category = {
  slug: string;
  name: string;
};

export type ContentBase = {
  slug: string;
  title: string;
  kicker: string;
  category: string; // category slug
  excerpt: string;
  updatedAt: string; // ISO date
  readingMins: number;
  // simple block content for the scaffold; swap for MDX / rich text later
  body: Array<{ type: 'p' | 'h2' | 'ul'; text?: string; items?: string[] }>;
  gradient: string; // hero palette (all-original, no game art)
  motif?: Motif;    // HeroArt illustration key
  isNew?: boolean;
};

export type Guide = ContentBase & {
  kind: 'guide';
  // when a guide maps to a trackable collectible set, the app fills this in per-user.
  trackable?: { label: string; slug: string };
};

export type Article = ContentBase & {
  kind: 'article';
  /** Rumour Mill pieces: explicitly unconfirmed, visually quarantined. */
  isRumour?: boolean;
  /** Source-quality heat rating, 1 (thin) to 5 (all but confirmed). */
  credibility?: 1 | 2 | 3 | 4 | 5;
};

export type AnyContent = Guide | Article;
