import { parseFeed } from "./rss";

export interface RawItem {
  title: string;
  url: string;
  outlet: string;
  publishedAt: string | null;
  snippet: string;
  kind: "news" | "reddit" | "youtube";
  engagement?: number;
}

const UA = "sixcentral-intel/1.0 (+https://sixcentral.co.uk)";
const FETCH_TIMEOUT = 7000;

async function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": UA, ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Relevance and junk gates. These are the difference between a usable desk and
// 200 rows of livestream titles and football scores.
// ---------------------------------------------------------------------------
const GTA6 = /\bgta\s*(6|vi)\b|grand theft auto\s*(6|vi|six)|\bgtavi\b/i;

function aboutGta6(title: string, snippet = ""): boolean {
  return GTA6.test(`${title} ${snippet}`);
}

const JUNK =
  /(come chat|let.?s see|reaction|livestream|\blive\b|giveaway|\bvs\.?\s|best[- ]selling|tier list|\bhalo\b|quitting|hopium|watch now|full stream)/i;
const VIDEOID_TAIL = /\([a-z0-9_-]{8,}\)\s*$/i;

function isJunk(title: string): boolean {
  return JUNK.test(title) || VIDEOID_TAIL.test(title);
}

// ---------------------------------------------------------------------------
// Google News RSS: primary engine and spread counter.
// ---------------------------------------------------------------------------
const NEWS_QUERIES = ["GTA 6", "Grand Theft Auto VI", "GTA 6 leak", "GTA 6 trailer"];

function newsUrl(q: string): string {
  const query = encodeURIComponent(`${q} when:2d`);
  return `https://news.google.com/rss/search?q=${query}&hl=en-GB&gl=GB&ceid=GB:en`;
}

function splitOutlet(title: string): { title: string; outlet: string | null } {
  const idx = title.lastIndexOf(" - ");
  if (idx > 20) {
    return { title: title.slice(0, idx).trim(), outlet: title.slice(idx + 3).trim() };
  }
  return { title, outlet: null };
}

async function fetchGoogleNews(): Promise<RawItem[]> {
  const out: RawItem[] = [];
  await Promise.allSettled(
    NEWS_QUERIES.map(async (q) => {
      const res = await timedFetch(newsUrl(q));
      if (!res.ok) return;
      const xml = await res.text();
      for (const it of parseFeed(xml)) {
        const parsed = splitOutlet(it.title);
        if (!aboutGta6(parsed.title, it.summary) || isJunk(parsed.title)) continue;
        out.push({
          title: parsed.title,
          url: it.link,
          outlet: it.source || parsed.outlet || "Google News",
          publishedAt: it.publishedAt,
          snippet: it.summary,
          kind: "news",
        });
      }
    })
  );
  return out;
}

// ---------------------------------------------------------------------------
// Optional direct press feeds. Dead feeds are ignored.
// ---------------------------------------------------------------------------
const PRESS_FEEDS: { outlet: string; url: string }[] = [
  { outlet: "Eurogamer", url: "https://www.eurogamer.net/feed" },
  { outlet: "VG247", url: "https://www.vg247.com/feed" },
  { outlet: "PC Gamer", url: "https://www.pcgamer.com/rss/" },
  { outlet: "Rock Paper Shotgun", url: "https://www.rockpapershotgun.com/feed" },
];

async function fetchPress(): Promise<RawItem[]> {
  const out: RawItem[] = [];
  await Promise.allSettled(
    PRESS_FEEDS.map(async (f) => {
      const res = await timedFetch(f.url);
      if (!res.ok) return;
      const xml = await res.text();
      for (const it of parseFeed(xml)) {
        if (!aboutGta6(it.title, it.summary) || isJunk(it.title)) continue;
        out.push({
          title: it.title,
          url: it.link,
          outlet: f.outlet,
          publishedAt: it.publishedAt,
          snippet: it.summary,
          kind: "news",
        });
      }
    })
  );
  return out;
}

// ---------------------------------------------------------------------------
// Reddit: community pulse. The subreddit implies relevance, so only junk is
// filtered, not the GTA 6 gate.
// ---------------------------------------------------------------------------
const SUBS = ["GTA6", "GTAVI"];

async function fetchReddit(): Promise<RawItem[]> {
  const out: RawItem[] = [];
  const urls = SUBS.flatMap((sub) => [
    `https://www.reddit.com/r/${sub}/hot.json?limit=25`,
    `https://www.reddit.com/r/${sub}/new.json?limit=25`,
  ]);
  await Promise.allSettled(
    urls.map(async (url) => {
      const res = await timedFetch(url);
      if (!res.ok) return;
      const json: any = await res.json();
      const kids = json?.data?.children || [];
      for (const k of kids) {
        const d = k.data || {};
        const score = (d.score || 0) + (d.num_comments || 0);
        if (score < 60 || d.stickied || isJunk(d.title || "")) continue;
        out.push({
          title: d.title || "",
          url:
            d.url && !String(d.url).includes("reddit.com")
              ? d.url
              : `https://www.reddit.com${d.permalink}`,
          outlet: `Reddit \u2022 r/${d.subreddit}`,
          publishedAt: d.created_utc
            ? new Date(d.created_utc * 1000).toISOString()
            : null,
          snippet: String(d.selftext || "").slice(0, 400),
          kind: "reddit",
          engagement: score,
        });
      }
    })
  );
  return out;
}

// YouTube is intentionally not part of the core gather: it dragged in
// livestreams and reaction videos that swamped the desk. Kept here so it can be
// switched back on later behind a stricter filter if wanted.
async function fetchYouTube(): Promise<RawItem[]> {
  return [];
}
void fetchYouTube;

export const SOURCE_GROUPS = 3; // google news, press, reddit

export async function gatherRaw(): Promise<RawItem[]> {
  const results = await Promise.allSettled([
    fetchGoogleNews(),
    fetchPress(),
    fetchReddit(),
  ]);
  const all: RawItem[] = [];
  for (const r of results) if (r.status === "fulfilled") all.push(...r.value);
  return all.filter((i) => i.title && i.title.length > 8);
}
