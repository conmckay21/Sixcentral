import { gatherRaw, RawItem, SOURCE_GROUPS } from "./sources";

export type Category = "confirmed" | "rumour" | "leak" | "controversy" | "debunk";

export interface IntelRow {
  fingerprint: string;
  title: string;
  summary: string;
  key_points: string[];
  origin: string;
  source_tier: number;
  spread_count: number;
  sources: { outlet: string; url: string; published_at: string | null }[];
  corroborated: boolean;
  strength_score: number;
  rank_score: number;
  auto_category: Category;
  editorial_call: string;
  published_at: string | null;
}

// How many stories the desk keeps per scan. Above this, the long tail of
// single-source tier-3 chatter is dropped.
const MAX_STORIES = 40;

const STOP = new Set([
  "the","a","an","and","or","of","to","in","on","for","is","are","was","were",
  "be","by","with","as","at","it","its","this","that","from","has","have","will",
  "could","would","new","gta","grand","theft","auto","vi","six","rockstar","games",
  "game","just","says","said","after","your","you","how","why","what","when","who",
  "get","gets","are","now","out","one","two","all","not","but","its","his","her",
]);

// Distinctive words in a headline, used both to cluster and to name a story.
function sigSet(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
  );
}

const TIER1 = ["rockstar", "take-two", "take two", "newswire"];
const TIER2 = [
  "ign","eurogamer","gamesradar","pc gamer","pcgamer","video games chronicle","vgc",
  "bloomberg","the verge","kotaku","polygon","gamespot","variety","insider gaming",
  "dexerto","engadget","gta boom","gtaboom","rock paper shotgun","vg247","techtimes",
  "comicbook","beebom","gamingbible","gamesindustry","push square","tweaktown",
];

function tierFor(outlet: string, kind: string, engagement = 0): number {
  const o = outlet.toLowerCase();
  if (TIER1.some((k) => o.includes(k))) return 1;
  if (TIER2.some((k) => o.includes(k))) return 2;
  if (kind === "reddit") return engagement > 300 ? 3 : 4;
  return 3;
}

function categorise(text: string, tier: number): Category {
  const t = text.toLowerCase();
  if (
    /debunk|not confirm|isn.?t real|is not real|sarcas|\bfake\b|\bhoax\b|myth|clarif/.test(t) &&
    !/leak|datamine/.test(t)
  )
    return "debunk";
  if (/leak|datamine|datamined|teapot|kurtaj|dataminer/.test(t)) return "leak";
  if (
    /backlash|criticis|outrage|boycott|refund|\bdisc\b|scalp|petition|controvers|lawsuit|melenchon|disappoint|expensive|anti-consumer|preservation|unfair/.test(
      t
    )
  )
    return "controversy";
  if (tier === 1 || /confirm|official|announce|pre-?order|release date|reaffirm/.test(t))
    return "confirmed";
  return "rumour";
}

function callFor(cat: Category, tier: number): string {
  if (cat === "debunk") return "debunk";
  if (cat === "controversy") return "run";
  if (cat === "confirmed") return "run";
  if (cat === "leak") return "hold";
  return tier <= 2 ? "analysis" : "hold";
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

interface Cluster {
  key: Set<string>;
  items: RawItem[];
}

// Greedy clustering: an item joins a cluster when it shares at least two
// distinctive words and at least half of the smaller word set. The cluster key
// stays fixed to its first headline so clusters do not slowly absorb everything.
function cluster(items: RawItem[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const item of items) {
    const st = sigSet(item.title);
    let best: Cluster | null = null;
    let bestShared = 0;
    for (const c of clusters) {
      let shared = 0;
      for (const t of st) if (c.key.has(t)) shared++;
      const minSize = Math.min(st.size, c.key.size) || 1;
      if (shared >= 2 && shared >= Math.ceil(minSize * 0.5) && shared > bestShared) {
        best = c;
        bestShared = shared;
      }
    }
    if (best) best.items.push(item);
    else clusters.push({ key: st, items: [item] });
  }
  return clusters;
}

export async function runScan(): Promise<{
  rows: IntelRow[];
  rawCount: number;
  sourcesPolled: number;
}> {
  const raw = await gatherRaw();
  const clusters = cluster(raw);

  const rows: IntelRow[] = [];
  for (const group of clusters) {
    const byOutlet = new Map<string, RawItem>();
    for (const g of group.items) if (!byOutlet.has(g.outlet)) byOutlet.set(g.outlet, g);
    const distinct = Array.from(byOutlet.values());
    const spread = distinct.length;

    const newsFirst = distinct
      .filter((d) => d.kind === "news")
      .sort((a, b) => a.title.length - b.title.length);
    const lead = newsFirst[0] || distinct[0];

    const tier = Math.min(
      ...distinct.map((d) => tierFor(d.outlet, d.kind, d.engagement))
    );

    // Quality gate: keep corroborated stories or reputable/official single
    // sources. Drops the single-source tier-3/4 tail that was the noise.
    if (spread < 2 && tier > 2) continue;

    const dates = distinct
      .map((d) => d.publishedAt)
      .filter(Boolean)
      .sort() as string[];
    const published = dates[0] || null;

    const text = `${lead.title} ${distinct.map((d) => d.snippet).join(" ")}`;
    const cat = categorise(text, tier);
    const corroborated = tier === 1 || (tier <= 2 && spread >= 3);

    const tierBase: Record<number, number> = { 1: 45, 2: 32, 3: 18, 4: 8 };
    const strength = clamp(
      (tierBase[tier] || 8) + (corroborated ? 20 : 0) + Math.min(spread, 10) * 1.5
    );
    const hoursOld = published
      ? Math.max(0, (Date.now() - Date.parse(published)) / 36e5)
      : 48;
    const recency = clamp(100 - hoursOld * 1.2);
    const spreadScore = clamp(Math.min(spread, 15) * 6);
    const catBoost =
      cat === "debunk" ? 8 : cat === "controversy" ? 6 : cat === "confirmed" ? 4 : cat === "leak" ? 2 : 0;
    const rank =
      Math.round((strength * 0.35 + spreadScore * 0.3 + recency * 0.25 + catBoost) * 10) / 10;

    const keyPoints = Array.from(new Set(distinct.map((d) => d.title))).slice(0, 8);
    const outletsLine = distinct.map((d) => d.outlet).slice(0, 8).join(", ");
    const summary =
      `Carried by ${spread} source${spread === 1 ? "" : "s"} (${outletsLine}). ` +
      (lead.snippet ? lead.snippet : "See sources for detail.");

    // Fingerprint from the two most distinctive words keeps the same story
    // stable across daily runs without being so strict that variants split.
    const keyWords = Array.from(sigSet(lead.title)).sort((a, b) => b.length - a.length).slice(0, 3).sort();
    const fingerprint = keyWords.join("-") || lead.title.toLowerCase().slice(0, 24);

    rows.push({
      fingerprint,
      title: lead.title.slice(0, 240),
      summary: summary.slice(0, 1200),
      key_points: keyPoints,
      origin: lead.outlet,
      source_tier: tier,
      spread_count: spread,
      sources: distinct
        .map((d) => ({ outlet: d.outlet, url: d.url, published_at: d.publishedAt }))
        .slice(0, 20),
      corroborated,
      strength_score: strength,
      rank_score: rank,
      auto_category: cat,
      editorial_call: callFor(cat, tier),
      published_at: published,
    });
  }

  // De-dupe any fingerprint collisions, keep the higher-ranked, then cap.
  const byFp = new Map<string, IntelRow>();
  for (const r of rows) {
    const prev = byFp.get(r.fingerprint);
    if (!prev || r.rank_score > prev.rank_score) byFp.set(r.fingerprint, r);
  }
  const deduped = Array.from(byFp.values()).sort((a, b) => b.rank_score - a.rank_score);
  const capped = deduped.slice(0, MAX_STORIES);

  return { rows: capped, rawCount: raw.length, sourcesPolled: SOURCE_GROUPS };
}
