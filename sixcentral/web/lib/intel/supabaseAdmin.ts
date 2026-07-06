import { createClient } from "@supabase/supabase-js";
import { IntelRow } from "./engine";
import { MOCK_ARTICLES } from "@/content/mock";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Only machine-owned columns. category / editorial_call / status / notes /
// pinned are set once on insert and never overwritten, so your edits survive.
const machineFields = (r: IntelRow) => ({
  title: r.title,
  summary: r.summary,
  key_points: r.key_points,
  origin: r.origin,
  source_tier: r.source_tier,
  spread_count: r.spread_count,
  sources: r.sources,
  corroborated: r.corroborated,
  strength_score: r.strength_score,
  rank_score: r.rank_score,
  auto_category: r.auto_category,
  published_at: r.published_at,
  last_seen_at: new Date().toISOString(),
});

// --- article dedup ---------------------------------------------------------
// A published article "covers" a story when they share enough distinctive
// words. Generic roundup words are stripped, so a living roundup with a vague
// title (for example "Everything confirmed so far") does not suppress the desk.
const GENERIC = new Set([
  "the","a","an","and","or","of","to","in","on","for","is","are","was","be","by",
  "with","as","at","it","this","that","from","has","have","will","new","our","so",
  "far","what","you","your","should","which","vs","where","list","running","living",
  "roundup","guide","buying","big","read","official","officially","everything",
  "confirmed","gta","grand","theft","auto","vi","6","rockstar","games","game","uk",
]);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !GENERIC.has(w))
  );
}

interface ArticleTok {
  slug: string;
  toks: Set<string>;
}

async function publishedArticles(sb: ReturnType<typeof admin>): Promise<ArticleTok[]> {
  // The real published articles live in the site content (MOCK_ARTICLES), not the
  // articles table, so dedup against those. The DB table is also checked so this
  // keeps working if content is migrated into Supabase later.
  const toks: ArticleTok[] = MOCK_ARTICLES.map((a) => ({
    slug: a.slug,
    toks: words(`${a.title} ${a.kicker ?? ""} ${a.excerpt ?? ""}`),
  }));
  try {
    const { data } = await sb
      .from("articles")
      .select("slug, title, kicker, excerpt")
      .eq("published", true);
    for (const a of (data as any[]) || []) {
      if (!toks.some((t) => t.slug === a.slug)) {
        toks.push({
          slug: a.slug,
          toks: words(`${a.title || ""} ${a.kicker || ""} ${a.excerpt || ""}`),
        });
      }
    }
  } catch {
    // DB table is optional; site content is the source of truth for now.
  }
  return toks;
}

function coveredBy(row: IntelRow, arts: ArticleTok[]): string | null {
  const rt = words(row.title);
  if (rt.size === 0) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const a of arts) {
    if (a.toks.size < 2) continue; // skip vague roundup titles
    let inter = 0;
    for (const w of rt) if (a.toks.has(w)) inter++;
    const score = inter / rt.size;
    if (inter >= 2 && score >= 0.5 && score > bestScore) {
      best = a.slug;
      bestScore = score;
    }
  }
  return best;
}

export interface SaveResult {
  inserted: number;
  updated: number;
}

export async function saveItems(rows: IntelRow[]): Promise<SaveResult> {
  const sb = admin();
  const arts = await publishedArticles(sb);
  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    const match = coveredBy(r, arts);
    const { data: existing } = await sb
      .from("intel_items")
      .select("id, covered_by_slug")
      .eq("fingerprint", r.fingerprint)
      .maybeSingle();

    if (existing) {
      const fields: Record<string, any> = machineFields(r);
      // fill forward only, never clobber a decision you have already made
      if (!existing.covered_by_slug && match) fields.covered_by_slug = match;
      await sb.from("intel_items").update(fields).eq("id", existing.id);
      updated++;
    } else {
      await sb.from("intel_items").insert({
        fingerprint: r.fingerprint,
        ...machineFields(r),
        category: r.auto_category,
        editorial_call: r.editorial_call,
        status: "new",
        pinned: false,
        covered_by_slug: match,
      });
      inserted++;
    }
  }
  return { inserted, updated };
}

export async function logRun(p: {
  ok: boolean;
  raw_count: number;
  items_inserted: number;
  items_updated: number;
  sources_polled: number;
  duration_ms: number;
  error?: string | null;
}): Promise<void> {
  const sb = admin();
  await sb.from("intel_runs").insert({
    ok: p.ok,
    raw_count: p.raw_count,
    items_inserted: p.items_inserted,
    items_updated: p.items_updated,
    sources_polled: p.sources_polled,
    duration_ms: p.duration_ms,
    error: p.error ?? null,
  });
}
