"use client";

import { useEffect, useMemo, useState } from "react";

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

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  x_poll: "X poll",
  instagram: "Instagram",
  tiktok: "TikTok",
  discord: "Discord",
  facebook: "Facebook",
  reddit: "Reddit",
};

const PLATFORM_COLOUR: Record<string, string> = {
  x: C.cyan,
  x_poll: C.cyan,
  instagram: C.pink,
  tiktok: C.purple,
  discord: C.gold,
  facebook: C.purple,
  reddit: C.gold,
};

const SEND_LABEL: Record<string, string> = {
  x: "Post to X",
  x_poll: "Post to X",
  discord: "Post to Discord",
  instagram: "Post to Instagram",
  facebook: "Post to Facebook",
};

const CHAR_LIMIT: Record<string, number> = {
  x: 260,
  x_poll: 220,
  discord: 500,
};

interface Angle {
  title: string;
  rationale: string;
  heat: number;
  format: string;
  source_intel_id: string | null;
  source_title: string | null;
}

export default function SocialDesk({
  authHeader,
}: {
  authHeader: () => Promise<Record<string, string>>;
}) {
  const [angles, setAngles] = useState<Angle[]>([]);
  const [anglesBusy, setAnglesBusy] = useState(false);
  const [packBusy, setPackBusy] = useState<Record<number, boolean>>({});
  const [packOf, setPackOf] = useState<Record<number, string>>({});
  const [posts, setPosts] = useState<Record<string, any[]>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [errMsg, setErrMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function api(path: string, body: any) {
    const res = await fetch(path, {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || "request failed");
    return json;
  }

  async function loadHistory() {
    try {
      const json = await api("/api/admin/social-action", { action: "list" });
      setHistory(json.posts || []);
    } catch {
      /* history is non-essential on first load */
    }
  }

  async function findAngles() {
    setAnglesBusy(true);
    setErrMsg("");
    try {
      const json = await api("/api/admin/social-build", { op: "angles" });
      setAngles(json.angles || []);
      setPackOf({});
      setPackBusy({});
    } catch (e: any) {
      setErrMsg("Angle scan failed: " + String(e?.message || e));
    } finally {
      setAnglesBusy(false);
    }
  }

  async function writePack(i: number) {
    setPackBusy((b) => ({ ...b, [i]: true }));
    setErrMsg("");
    try {
      const json = await api("/api/admin/social-build", { op: "pack", angle: angles[i] });
      setPackOf((m) => ({ ...m, [i]: json.angle_id }));
      setPosts((p) => ({ ...p, [json.angle_id]: json.posts || [] }));
    } catch (e: any) {
      setErrMsg("Pack failed: " + String(e?.message || e));
    } finally {
      setPackBusy((b) => ({ ...b, [i]: false }));
    }
  }

  async function setStatus(post: any, status: "used" | "draft" | "binned") {
    try {
      await api("/api/admin/social-action", { action: status, id: post.id });
      const patch = (list: any[]) =>
        list
          .map((x) => (x.id === post.id ? { ...x, status } : x))
          .filter((x) => x.status !== "binned");
      setPosts((p) => ({ ...p, [post.angle_id]: patch(p[post.angle_id] || []) }));
      setHistory((h) => patch(h));
    } catch (e: any) {
      setErrMsg("Update failed: " + String(e?.message || e));
    }
  }

  async function sendPost(post: any) {
    setSending(post.id);
    setErrMsg("");
    try {
      const json = await api("/api/admin/social-post", { id: post.id });
      const patch = (list: any[]) =>
        list.map((x) =>
          x.id === post.id
            ? { ...x, posted_at: json.posted_at, post_url: json.post_url || null, status: "used" }
            : x
        );
      setPosts((p) => ({ ...p, [post.angle_id]: patch(p[post.angle_id] || []) }));
      setHistory((h) => patch(h));
    } catch (e: any) {
      setErrMsg("Post failed: " + String(e?.message || e));
    } finally {
      setSending(null);
    }
  }

  function copyText(p: any): string {
    let t = String(p.body || "");
    if (p.platform === "x_poll" && Array.isArray(p.poll_options) && p.poll_options.length) {
      t += "\n\n" + p.poll_options.map((o: string) => "- " + o).join("\n");
    }
    if (Array.isArray(p.hashtags) && p.hashtags.length) {
      t += "\n\n" + p.hashtags.map((h: string) => (h.startsWith("#") ? h : "#" + h)).join(" ");
    }
    return t;
  }

  function copyPost(p: any) {
    navigator.clipboard?.writeText(copyText(p)).then(
      () => {
        setCopied(p.id);
        setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 1500);
      },
      () => setErrMsg("Clipboard blocked by the browser")
    );
  }

  const inlineAngleIds = useMemo(() => new Set(Object.values(packOf)), [packOf]);

  const historyGroups = useMemo(() => {
    const groups: { angle_id: string; angle_title: string; posts: any[] }[] = [];
    const seen = new Map<string, number>();
    for (const p of history) {
      if (inlineAngleIds.has(p.angle_id)) continue;
      if (!seen.has(p.angle_id)) {
        seen.set(p.angle_id, groups.length);
        groups.push({ angle_id: p.angle_id, angle_title: p.angle_title, posts: [] });
      }
      groups[seen.get(p.angle_id)!].posts.push(p);
    }
    return groups;
  }, [history, inlineAngleIds]);

  function PostCard({ p }: { p: any }) {
    const limit = CHAR_LIMIT[p.platform];
    const over = limit ? String(p.body || "").length > limit : false;
    const postable = !!SEND_LABEL[p.platform];
    return (
      <div className="soc-post">
        <div className="soc-post-top">
          <span
            className="soc-plat"
            style={{
              color: PLATFORM_COLOUR[p.platform] || C.dim,
              borderColor: PLATFORM_COLOUR[p.platform] || C.line,
            }}
          >
            {PLATFORM_LABEL[p.platform] || p.platform}
          </span>
          {p.variant && <span className="soc-var">{String(p.variant).replace(/_/g, " ")}</span>}
          <span className={over ? "soc-chars over" : "soc-chars"}>
            {String(p.body || "").length}
            {limit ? `/${limit}` : ""}
          </span>
          {p.status === "used" && !p.posted_at && <span className="soc-used-tag">used</span>}
        </div>
        <p className="soc-body">{p.body}</p>
        {Array.isArray(p.poll_options) && p.poll_options.length > 0 && (
          <div className="soc-poll">
            {p.poll_options.map((o: string, oi: number) => (
              <span key={oi}>{o}</span>
            ))}
          </div>
        )}
        {Array.isArray(p.hashtags) && p.hashtags.length > 0 && (
          <div className="soc-tags">
            {p.hashtags.map((h: string) => (h.startsWith("#") ? h : "#" + h)).join(" ")}
          </div>
        )}
        <div className="soc-post-actions">
          {p.posted_at ? (
            p.post_url ? (
              <a className="soc-posted" href={p.post_url} target="_blank" rel="noreferrer">
                posted, view
              </a>
            ) : (
              <span className="soc-posted">posted</span>
            )
          ) : postable ? (
            <button className="soc-send" disabled={sending === p.id} onClick={() => sendPost(p)}>
              {sending === p.id ? "Posting…" : SEND_LABEL[p.platform]}
            </button>
          ) : null}
          <button className="soc-copy" onClick={() => copyPost(p)}>
            {copied === p.id ? "Copied" : "Copy"}
          </button>
          {!p.posted_at &&
            (p.status === "used" ? (
              <button className="soc-ghost" onClick={() => setStatus(p, "draft")}>
                Back to draft
              </button>
            ) : (
              <button className="soc-ghost" onClick={() => setStatus(p, "used")}>
                Mark used
              </button>
            ))}
          {!p.posted_at && (
            <button className="soc-bin" onClick={() => setStatus(p, "binned")}>
              Bin
            </button>
          )}
        </div>
      </div>
    );
  }

  function Pack({ list }: { list: any[] }) {
    const withImg = list.find((p) => p.image && p.image.url);
    const img = withImg ? withImg.image : null;
    return (
      <div className="soc-packwrap">
        {img && (
          <div className="soc-packimg">
            <img src={img.url} alt={img.alt || ""} />
            {img.credit && <span>{img.credit}</span>}
          </div>
        )}
        <div className="soc-pack">
          {list.map((p) => (
            <PostCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="soc-root">
      <style>{socialCss}</style>

      <div className="soc-intro">
        <div>
          <h2>Social Desk</h2>
          <p>
            The news side reports. This side starts the argument. Angles are scored for how hard
            they pull replies, packs come with an image and post straight to X, Instagram,
            Facebook and Discord.
          </p>
        </div>
        <button className="soc-find" disabled={anglesBusy} onClick={findAngles}>
          {anglesBusy ? "Scanning…" : angles.length ? "Fresh angles" : "Find angles"}
        </button>
      </div>

      {errMsg && <div className="soc-err">{errMsg}</div>}

      {angles.length === 0 && !anglesBusy && (
        <div className="soc-empty">
          Hit Find angles. It reads the open desk plus the evergreen debate bank and returns the
          eight most argumentative things to post about today.
        </div>
      )}

      <div className="soc-angles">
        {angles.map((a, i) => (
          <article className="soc-angle" key={i}>
            <div className="soc-angle-top">
              <span className="soc-heat" title={`Heat ${a.heat}/5`}>
                {"▲".repeat(Math.max(1, Math.min(5, a.heat || 1)))}
              </span>
              <span className="soc-format">{a.format}</span>
              {a.source_title ? (
                <span className="soc-src">desk story</span>
              ) : (
                <span className="soc-src ever">evergreen</span>
              )}
            </div>
            <h3>{a.title}</h3>
            <p className="soc-why">{a.rationale}</p>
            {a.source_title && <p className="soc-srcline">From: {a.source_title}</p>}
            <button className="soc-write" disabled={!!packBusy[i]} onClick={() => writePack(i)}>
              {packBusy[i] ? "Writing…" : packOf[i] ? "Rewrite pack" : "Write pack"}
            </button>
            {packOf[i] && posts[packOf[i]] && <Pack list={posts[packOf[i]]} />}
          </article>
        ))}
      </div>

      {historyGroups.length > 0 && (
        <div className="soc-history">
          <h2>Recent packs</h2>
          {historyGroups.map((g) => (
            <div className="soc-hgroup" key={g.angle_id}>
              <h3>{g.angle_title}</h3>
              <Pack list={g.posts} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const socialCss = `
.soc-root{display:block}
.soc-intro{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.soc-intro h2{font-family:'Anton',sans-serif;font-size:26px;margin:0;text-transform:uppercase;letter-spacing:.5px}
.soc-intro p{margin:4px 0 0;color:${C.dim};font-size:13px;max-width:60ch}
.soc-find{background:${C.pink};border:none;color:#fff;font-weight:700;border-radius:8px;padding:10px 18px;font-size:13px;cursor:pointer;white-space:nowrap}
.soc-find:disabled{opacity:.6;cursor:default}
.soc-err{background:${C.panel};border:1px solid ${C.pink};color:#ffd0e2;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:12px}
.soc-empty{background:${C.panel};border:1px solid ${C.line};border-radius:10px;padding:18px;color:${C.dim};font-size:14px}
.soc-angles{display:flex;flex-direction:column;gap:14px}
.soc-angle{background:${C.panel};border:1px solid ${C.line};border-left:4px solid ${C.pink};border-radius:12px;padding:18px}
.soc-angle-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.soc-heat{color:${C.pink};font-size:11px;letter-spacing:2px}
.soc-format{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.dim};border:1px solid ${C.line};padding:2px 8px;border-radius:5px;text-transform:uppercase;letter-spacing:.4px}
.soc-src{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.cyan};border:1px solid ${C.cyan};padding:2px 8px;border-radius:5px}
.soc-src.ever{color:${C.gold};border-color:${C.gold}}
.soc-angle h3{font-size:18px;margin:10px 0 4px;line-height:1.35}
.soc-why{font-size:13px;color:${C.dim};margin:0 0 6px;line-height:1.5}
.soc-srcline{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.dim};margin:0 0 10px}
.soc-write{background:transparent;border:1px solid ${C.pink};color:${C.pink};font-weight:700;border-radius:8px;padding:8px 15px;font-size:13px;cursor:pointer;margin-top:6px}
.soc-write:disabled{opacity:.6;cursor:default}
.soc-packwrap{margin-top:14px}
.soc-packimg{position:relative;border-radius:10px;overflow:hidden;border:1px solid ${C.line};margin-bottom:10px}
.soc-packimg img{width:100%;max-height:280px;object-fit:cover;display:block}
.soc-packimg span{position:absolute;right:8px;bottom:6px;font-family:'Spline Sans Mono',monospace;font-size:10px;color:rgba(255,255,255,.75);background:rgba(0,0,0,.45);padding:2px 7px;border-radius:4px}
.soc-pack{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:760px){.soc-pack{grid-template-columns:1fr}}
.soc-post{background:${C.bg};border:1px solid ${C.line};border-radius:10px;padding:13px 14px;display:flex;flex-direction:column}
.soc-post-top{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.soc-plat{font-family:'Spline Sans Mono',monospace;font-size:11px;border:1px solid;padding:2px 8px;border-radius:5px;text-transform:uppercase;letter-spacing:.4px}
.soc-var{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.dim}}
.soc-chars{font-family:'Spline Sans Mono',monospace;font-size:10px;color:${C.dim};margin-left:auto}
.soc-chars.over{color:${C.pink}}
.soc-used-tag{font-family:'Spline Sans Mono',monospace;font-size:10px;color:#04211f;background:${C.green};padding:2px 7px;border-radius:5px}
.soc-body{font-size:14px;line-height:1.55;color:#d6cfe4;margin:0 0 8px;white-space:pre-wrap}
.soc-poll{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
.soc-poll span{font-size:12px;color:${C.text};border:1px solid ${C.line};border-radius:999px;padding:4px 11px;background:${C.panel}}
.soc-tags{font-family:'Spline Sans Mono',monospace;font-size:11px;color:${C.cyan};margin:0 0 8px;line-height:1.6}
.soc-post-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
.soc-send{background:${C.green};border:none;color:#04211f;font-weight:700;border-radius:7px;padding:7px 13px;font-size:12px;cursor:pointer}
.soc-send:disabled{opacity:.6;cursor:default}
.soc-posted{font-family:'Spline Sans Mono',monospace;font-size:11px;color:#04211f;background:${C.green};padding:4px 10px;border-radius:5px;text-decoration:none}
.soc-copy{background:${C.cyan};border:none;color:#04211f;font-weight:700;border-radius:7px;padding:7px 13px;font-size:12px;cursor:pointer}
.soc-ghost{background:transparent;border:1px solid ${C.line};color:${C.dim};border-radius:7px;padding:7px 11px;font-size:12px;cursor:pointer}
.soc-bin{background:transparent;border:1px solid ${C.pink};color:${C.pink};border-radius:7px;padding:7px 11px;font-size:12px;cursor:pointer}
.soc-history{margin-top:30px;border-top:1px solid ${C.line};padding-top:18px}
.soc-history h2{font-family:'Anton',sans-serif;font-size:20px;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px}
.soc-hgroup{margin-bottom:18px}
.soc-hgroup h3{font-size:14px;color:${C.dim};margin:0 0 8px;font-weight:600}
`;
