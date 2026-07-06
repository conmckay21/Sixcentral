import { NextResponse } from "next/server";
import { runScan } from "../../../lib/intel/engine";
import { saveItems, logRun } from "../../../lib/intel/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby plan caps this at 10s; Pro honours 60.

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set => allow (dev only). Set it in prod.
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const started = Date.now();
  try {
    const { rows, rawCount, sourcesPolled } = await runScan();
    const { inserted, updated } = await saveItems(rows);
    const duration = Date.now() - started;
    await logRun({
      ok: true,
      raw_count: rawCount,
      items_inserted: inserted,
      items_updated: updated,
      sources_polled: sourcesPolled,
      duration_ms: duration,
    });
    return NextResponse.json({
      ok: true,
      clusters: rows.length,
      rawCount,
      inserted,
      updated,
      duration_ms: duration,
    });
  } catch (e: any) {
    const duration = Date.now() - started;
    try {
      await logRun({
        ok: false,
        raw_count: 0,
        items_inserted: 0,
        items_updated: 0,
        sources_polled: 0,
        duration_ms: duration,
        error: String(e?.message || e),
      });
    } catch {
      /* logging is best-effort */
    }
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
