import { createClient } from "@supabase/supabase-js";
import { IntelRow } from "./engine";

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

export interface SaveResult {
  inserted: number;
  updated: number;
}

export async function saveItems(rows: IntelRow[]): Promise<SaveResult> {
  const sb = admin();
  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    const { data: existing } = await sb
      .from("intel_items")
      .select("id")
      .eq("fingerprint", r.fingerprint)
      .maybeSingle();

    if (existing) {
      await sb.from("intel_items").update(machineFields(r)).eq("id", existing.id);
      updated++;
    } else {
      await sb.from("intel_items").insert({
        fingerprint: r.fingerprint,
        ...machineFields(r),
        category: r.auto_category,
        editorial_call: r.editorial_call,
        status: "new",
        pinned: false,
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
