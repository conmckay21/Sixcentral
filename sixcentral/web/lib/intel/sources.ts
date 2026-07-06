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
// Google News RSS: the primary engine. Its <source> attribution lets us count
// how many distinct outlets carry the same story (the spread metric).
// ---------------------------------------------------------------------------
const NEWS_QUERIES = [
  "GTA 6",
  "Grand Theft Auto VI",
  "GTA 6 leak",
  "GTA 6 trailer 3",
  "Rockstar Games GTA 6",
];

function newsUrl(q: string): string {
  const query = encodeURIComponent(`${q} when:2d`); // last 2 days keeps it fresh + fast
  return `https://news.google.com/rss/search?q=${query}&hl=en-GB&gl=GB&ceid=GB:en`;
}

function splitOutlet(title: string): { title: string; outlet: string | null } {
  // Google News titles arrive as "Headline - Outlet"
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
// Optional direct press feeds (bonus attribution). Any dead feed is ignored.
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
        const hay = `${it.title} ${it.summary}`.toLowerCase();
        if (!hay.includes("gta") && !hay.includes("grand theft auto")) continue;
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
// Reddit (community pulse). Keyless JSON is fine for one pull a day.
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
        if (score < 40 || d.stickied) continue;
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

// ---------------------------------------------------------------------------
// YouTube (optional). Skipped cleanly when YOUTUBE_API_KEY is not set.
// ---------------------------------------------------------------------------
const YT_QUERIES = ["GTA 6 leak", "GTA 6 trailer 3", "GTA 6 news"];

async function fetchYouTube(): Promise<RawItem[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const after = new Date(Date.now() - 2 * 864e5).toISOString();
  const out: RawItem[] = [];
  await Promise.allSettled(
    YT_QUERIES.map(async (q) => {
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
        `&order=date&maxResults=10&publishedAfter=${after}` +
        `&q=${encodeURIComponent(q)}&key=${key}`;
      const res = await timedFetch(url);
      if (!res.ok) return;
      const json: any = await res.json();
      for (const it of json.items || []) {
        const s = it.snippet || {};
        const vid = it.id?.videoId;
        if (!vid) continue;
        out.push({
          title: s.title || "",
          url: `https://www.youtube.com/watch?v=${vid}`,
          outlet: `YouTube \u2022 ${s.channelTitle || "channel"}`,
          publishedAt: s.publishedAt || null,
          snippet: String(s.description || "").slice(0, 400),
          kind: "youtube",
        });
      }
    })
  );
  return out;
}

export const SOURCE_GROUPS = 4; // google news, press, reddit, youtube

export async function gatherRaw(): Promise<RawItem[]> {
  const results = await Promise.allSettled([
    fetchGoogleNews(),
    fetchPress(),
    fetchReddit(),
    fetchYouTube(),
  ]);
  const all: RawItem[] = [];
  for (const r of results) if (r.status === "fulfilled") all.push(...r.value);
  return all.filter((i) => i.title && i.title.length > 8);
}
