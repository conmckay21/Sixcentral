// Minimal, dependency-free RSS/Atom parser. Handles the feed shapes we poll
// (Google News RSS + standard gaming-press RSS/Atom). Not a general XML parser,
// deliberately kept tiny so the web app gains zero new dependencies.

export interface FeedItem {
  title: string;
  link: string;
  publishedAt: string | null; // ISO
  source: string | null; // outlet, when the feed declares one (Google News does)
  summary: string; // plain-text snippet
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return decodeEntities(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1] : null;
}

function pickAttr(block: string, tag: string, attr: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function toIso(d: string | null): string | null {
  if (!d) return null;
  const t = Date.parse(d.trim());
  return isNaN(t) ? null : new Date(t).toISOString();
}

export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const re = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi;
  const blocks = xml.match(re) || [];
  for (const b of blocks) {
    const rawTitle = pick(b, "title") || "";
    const title = stripTags(rawTitle);
    if (!title) continue;
    let link = "";
    if (isAtom) {
      link = pickAttr(b, "link", "href") || "";
    } else {
      link = (pick(b, "link") || "").trim();
    }
    const pub =
      pick(b, "pubDate") ||
      pick(b, "published") ||
      pick(b, "updated") ||
      pick(b, "dc:date");
    const source = stripTags(pick(b, "source") || "") || null;
    const desc =
      pick(b, "description") || pick(b, "summary") || pick(b, "content") || "";
    items.push({
      title,
      link: decodeEntities(link).trim(),
      publishedAt: toIso(pub),
      source,
      summary: stripTags(desc).slice(0, 400),
    });
  }
  return items;
}
