"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Self-contained styling using the SixCentral palette so this page does not
// depend on any specific globals.css variable names.
const C = {
  bg: "#0B0810",
  panel: "#140F1C",
  line: "#2A2138",
  text: "#EDE9F2",
  dim: "#9A8FB0",
  pink: "#FF2E88",
  cyan: "#1FE5D6",
  green: "#35E27C",
  gold: "#FFC83D",
  purple: "#8A4FFF",
};

const CAT_COLOUR: Record<string, string> = {
  confirmed: C.green,
  rumour: C.gold,
  leak: C.purple,
  controversy: C.pink,
  debunk: C.cyan,
};

const CATEGORIES = ["confirmed", "rumour", "leak", "controversy", "debunk"];
const CALLS = ["run", "analysis", "hold", "debunk"];
const STATUSES = ["new", "reviewing", "drafting", "published", "dismissed"];
const TIER_LABEL: Record<number, string> = {
  1: "Official",
  2: "Reputable press",
  3: "Community / leaker",
  4: "Unverified",
};

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

type Phase = "loading" | "noenv" | "signedout" | "denied" | "ready" | "error";

export default function IntelPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [items, setItems] = useState<any[]>([]);
  const [lastRun, setLastRun] = useState<any | null>(null);
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");
  const [q, setQ] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showCovered, setShowCovered] = useState(false);

  const sb = getClient();

  useEffect(() => {
    (async () => {
      if (!sb) {
        setPhase("noenv");
        return;
      }
      try {
        const { data: userData } = await sb.auth.getUser();
        const user = userData?.user;
        if (!user) {
          setPhase("signedout");
          return;
        }
        const { data: profile } = await sb
          .from("profiles")
          .select("is_staff")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile?.is_staff) {
          setPhase("denied");
          return;
        }
        await loadData(sb);
        setPhase("ready");
      } catch (e: any) {
        setErrMsg(String(e?.message || e));
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData(client: SupabaseClient) {
    const { data: rows, error } = await client
      .from("intel_items")
      .select("*")
      .order("pinned", { ascending: false })
      .order("rank_score", { ascending: false })
      .limit(300);
    if (error) throw error;
    setItems(rows || []);
    const { data: run } = await client
      .from("intel_runs")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastRun(run || null);
  }

  async function patch(id: string, changes: Record<string, any>) {
    if (!sb) return;
    const before = items;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
    const { error } = await sb.from("intel_items").update(changes).eq("id", id);
    if (error) {
      setItems(before);
      setErrMsg("Save failed: " + error.message);
    }
  }

  function copyBrief(it: any) {
    const lines: string[] = [];
    lines.push(`[${String(it.category).toUpperCase()}] ${it.title}`);
    lines.push(
      `Strength ${Math.round(it.strength_score)}/100 | Rank ${it.rank_score} | ` +
        `${it.spread_count} source${it.spread_count === 1 ? "" : "s"} | ${TIER_LABEL[it.source_tier] || "Unverified"}` +
        (it.corroborated ? " | corroborated" : "")
    );
    lines.push("");
    lines.push(`What it is: ${it.summary || ""}`);
    const kp = Array.isArray(it.key_points) ? it.key_points : [];
    if (kp.length) {
      lines.push("Key points:");
      for (const p of kp) lines.push(`- ${p}`);
    }
    const srcs = Array.isArray(it.sources) ? it.sources : [];
    if (srcs.length) {
      lines.push("Sources:");
      for (const s of srcs)
        lines.push(`- ${s.outlet}${s.published_at ? ` (${fmtDate(s.published_at)})` : ""}: ${s.url}`);
    }
    lines.push("");
    lines.push(`Angle (SixCentral, confirmed over rumour): ${String(it.editorial_call).toUpperCase()}`);
    if (it.notes) lines.push(`Notes: ${it.notes}`);
    const text = lines.join("\n");
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(it.id);
        setTimeout(() => setCopied((c) => (c === it.id ? null : c)), 1500);
      },
      () => setErrMsg("Clipboard blocked by the browser")
    );
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (!showCovered && it.covered_by_slug) return false;
      if (cat !== "all" && it.category !== cat) return false;
      if (status === "open" && it.status === "dismissed") return false;
      if (status !== "open" && status !== "all" && it.status !== status) return false;
      if (needle) {
        const hay = `${it.title} ${it.summary} ${(it.key_points || []).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, cat, status, q, showCovered]);

  const coveredCount = items.filter((i) => i.covered_by_slug).length;

  return (
    <div className="intel-root">
      <style>{css}</style>

      <header className="intel-head">
        <div>
          <h1>Intel Desk</h1>
          <p className="sub">
            Confirmed over rumour. Ranked GTA signal for editorial decisions.
          </p>
        </div>
        {phase === "ready" && (
          <div className="run">
            <span className="run-dot" data-ok={lastRun?.ok ? "1" : "0"} />
            {lastRun ? (
              <span>
                Last scan {fmtDate(lastRun.ran_at)} {String(lastRun.ran_at || "").slice(11, 16)} UTC ·{" "}
                {lastRun.items_inserted}+ new · {items.length} tracked
              </span>
            ) : (
              <span>No scan logged yet</span>
            )}
          </div>
        )}
      </header>

      {phase === "loading" && <div className="note">Checking access…</div>}
      {phase === "noenv" && (
        <div className="note">
          Supabase keys are not set for the web app. Add NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload.
        </div>
      )}
      {phase === "signedout" && (
        <div className="note">Sign in with your staff account, then reload this page.</div>
      )}
      {phase === "denied" && (
        <div className="note">This desk is staff only. Your account is not flagged is_staff.</div>
      )}
      {phase === "error" && <div className="note err">Something went wrong: {errMsg}</div>}

      {phase === "ready" && (
        <>
          <div className="controls">
            <div className="chips">
              <button className={cat === "all" ? "chip on" : "chip"} onClick={() => setCat("all")}>
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={cat === c ? "chip on" : "chip"}
                  onClick={() => setCat(c)}
                  style={cat === c ? { borderColor: CAT_COLOUR[c], color: CAT_COLOUR[c] } : {}}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="right-controls">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="sel">
                <option value="open">Open (hide dismissed)</option>
                <option value="all">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                className="search"
                placeholder="Search stories…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                className={showCovered ? "toggle on" : "toggle"}
                onClick={() => setShowCovered((v) => !v)}
                title="Stories an existing article already covers"
              >
                {showCovered ? "Hide covered" : `Show covered (${coveredCount})`}
              </button>
            </div>
          </div>

          {errMsg && <div className="note err small">{errMsg}</div>}

          <div className="count">
            {filtered.length} of {items.length} stories
          </div>

          <div className="list">
            {filtered.map((it) => (
              <article className="card" key={it.id} style={{ borderLeftColor: CAT_COLOUR[it.category] || C.line }}>
                <div className="card-top">
                  <div className="badges">
                    <span className="cat" style={{ background: CAT_COLOUR[it.category] || C.line }}>
                      {it.category}
                    </span>
                    <span className="tier">{TIER_LABEL[it.source_tier] || "Unverified"}</span>
                    <span className="spread">{it.spread_count} src</span>
                    {it.corroborated && <span className="corr">corroborated</span>}
                    {it.pinned && <span className="pin-tag">pinned</span>}
                    {it.covered_by_slug && (
                      <a
                        className="covered-tag"
                        href={`/news/${it.covered_by_slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        covered
                      </a>
                    )}
                  </div>
                  <div className="scores">
                    <div className="rank">
                      <b>{it.rank_score}</b>
                      <small>rank</small>
                    </div>
                    <div className="strength">
                      <div className="bar">
                        <div style={{ width: `${Math.round(it.strength_score)}%`, background: CAT_COLOUR[it.category] || C.cyan }} />
                      </div>
                      <small>{Math.round(it.strength_score)}/100 strength</small>
                    </div>
                  </div>
                </div>

                <h2 className="title">{it.title}</h2>
                <div className="origin">
                  Origin: {it.origin || "unknown"} · {fmtDate(it.published_at)}
                </div>
                <p className="summary">{it.summary}</p>

                {Array.isArray(it.key_points) && it.key_points.length > 0 && (
                  <ul className="points">
                    {it.key_points.map((p: string, i: number) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}

                {Array.isArray(it.sources) && it.sources.length > 0 && (
                  <details className="sources">
                    <summary>{it.sources.length} sources</summary>
                    <ul>
                      {it.sources.map((s: any, i: number) => (
                        <li key={i}>
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.outlet}
                          </a>
                          {s.published_at ? <span className="sd"> {fmtDate(s.published_at)}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="row">
                  <label>
                    Category
                    <select value={it.category} onChange={(e) => patch(it.id, { category: e.target.value })}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Call
                    <select value={it.editorial_call} onChange={(e) => patch(it.id, { editorial_call: e.target.value })}>
                      {CALLS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select value={it.status} onChange={(e) => patch(it.id, { status: e.target.value })}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="ghost" onClick={() => patch(it.id, { pinned: !it.pinned })}>
                    {it.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button className="copy" onClick={() => copyBrief(it)}>
                    {copied === it.id ? "Copied" : "Copy brief"}
                  </button>
                </div>

                <textarea
                  className="notes"
                  placeholder="Your notes / angle for the article…"
                  defaultValue={it.notes || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (it.notes || "")) patch(it.id, { notes: e.target.value });
                  }}
                />
              </article>
            ))}
            {filtered.length === 0 && <div className="note">Nothing matches those filters.</div>}
          </div>
        </>
      )}
    </div>
  );
}

const css = `
.intel-root{max-width:1080px;margin:0 auto;padding:28px 20px 80px;color:${C.text};font-family:'Space Grotesk',system-ui,sans-serif}
.intel-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;border-bottom:1px solid ${C.line};padding-bottom:16px;margin-bottom:20px}
.intel-head h1{font-family:'Anton',sans-serif;font-size:38px;letter-spacing:.5px;margin:0;text-transform:uppercase}
.intel-head .sub{margin:4px 0 0;color:${C.dim};font-size:13px}
.run{font-family:'Spline Sans Mono',monospace;font-size:12px;color:${C.dim};display:flex;align-items:center;gap:8px}
.run-dot{width:9px;height:9px;border-radius:50%;background:${C.green}}
.run-dot[data-ok="0"]{background:${C.pink}}
.note{background:${C.panel};border:1px solid ${C.line};border-radius:10px;padding:18px;color:${C.dim};font-size:14px}
.note.err{border-color:${C.pink};color:#ffd0e2}
.note.small{padding:10px 14px;margin-bottom:12px;font-size:13px}
.controls{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{background:${C.panel};border:1px solid ${C.line};color:${C.dim};border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer;text-transform:capitalize}
.chip.on{color:${C.text};border-color:${C.text}}
.right-controls{display:flex;gap:8px}
.sel,.search{background:${C.panel};border:1px solid ${C.line};color:${C.text};border-radius:8px;padding:7px 10px;font-size:13px;font-family:inherit}
.search{min-width:180px}
.toggle{background:${C.panel};border:1px solid ${C.line};color:${C.dim};border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer;white-space:nowrap}
.toggle.on{color:${C.gold};border-color:${C.gold}}
.covered-tag{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.bg};background:${C.dim};padding:2px 8px;border-radius:5px;text-decoration:none}
.count{font-family:'Spline Sans Mono',monospace;font-size:12px;color:${C.dim};margin-bottom:12px}
.list{display:flex;flex-direction:column;gap:14px}
.card{background:${C.panel};border:1px solid ${C.line};border-left:4px solid ${C.line};border-radius:12px;padding:18px 18px 16px}
.card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.badges{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.cat{color:#0B0810;font-weight:700;font-size:11px;text-transform:uppercase;padding:3px 9px;border-radius:5px;letter-spacing:.4px}
.tier,.spread,.corr,.pin-tag{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.dim};border:1px solid ${C.line};padding:2px 8px;border-radius:5px}
.corr{color:${C.green};border-color:${C.green}}
.pin-tag{color:${C.gold};border-color:${C.gold}}
.scores{display:flex;gap:14px;align-items:center}
.rank{text-align:center;font-family:'Spline Sans Mono',monospace}
.rank b{font-size:22px;color:${C.text};display:block;line-height:1}
.rank small,.strength small{font-size:10px;color:${C.dim};text-transform:uppercase;letter-spacing:.5px}
.strength{width:130px}
.bar{height:7px;background:#241a30;border-radius:4px;overflow:hidden;margin-bottom:4px}
.bar>div{height:100%}
.title{font-size:19px;margin:12px 0 4px;line-height:1.3}
.origin{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.dim};margin-bottom:8px}
.summary{font-size:14px;line-height:1.55;color:#d6cfe4;margin:0 0 10px}
.points{margin:0 0 10px;padding-left:18px;font-size:13px;color:${C.dim};line-height:1.5}
.points li{margin-bottom:2px}
.sources{margin-bottom:12px}
.sources summary{cursor:pointer;font-size:12px;color:${C.cyan};font-family:'Spline Sans Mono',monospace}
.sources ul{margin:8px 0 0;padding-left:16px;font-size:13px;line-height:1.6}
.sources a{color:${C.cyan};text-decoration:none}
.sources a:hover{text-decoration:underline}
.sd{color:${C.dim};font-family:'Spline Sans Mono',monospace;font-size:11px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px}
.row label{display:flex;flex-direction:column;gap:3px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:${C.dim}}
.row select{background:${C.bg};border:1px solid ${C.line};color:${C.text};border-radius:7px;padding:6px 8px;font-size:13px;font-family:inherit}
.ghost{background:transparent;border:1px solid ${C.line};color:${C.dim};border-radius:7px;padding:7px 12px;font-size:13px;cursor:pointer}
.copy{background:${C.cyan};border:none;color:#04211f;font-weight:700;border-radius:7px;padding:8px 14px;font-size:13px;cursor:pointer;margin-left:auto}
.notes{width:100%;background:${C.bg};border:1px solid ${C.line};color:${C.text};border-radius:8px;padding:9px 11px;font-size:13px;font-family:inherit;resize:vertical;min-height:44px}
`;
