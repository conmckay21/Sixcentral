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
  gradient: string; // placeholder hero treatment (all-original, no game art)
  isNew?: boolean;
};

export type Guide = ContentBase & {
  kind: 'guide';
  // when a guide maps to a trackable collectible set, the app fills this in per-user.
  trackable?: { label: string; slug: string };
};

export type Article = ContentBase & {
  kind: 'article';
};

export type AnyContent = Guide | Article;
