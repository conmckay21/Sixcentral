import { SupabaseClient } from '@supabase/supabase-js';

export interface SocialAngle {
  title: string;
  rationale: string;
  heat: number;
  format: string;
  source_intel_id: string | null;
  source_title: string | null;
}

/** Debates that always pull replies, for days when the desk is quiet. */
export const EVERGREEN_DEBATES = [
  'Standard at £69.99 or Ultimate at £89.99, which are you actually buying',
  'No PC at launch, again',
  'A disc-free launch and the slow death of physical copies',
  'Leonida versus Los Santos, which map wins',
  'Jason or Lucia, who are you playing first',
  'Vice City nostalgia versus a brand new Leonida',
  'Story first or straight into Online',
  'Will 19 November actually hold',
  'First thing you are doing when you spawn in',
  'Where GTA 6 lands in the series ranking against San Andreas, IV and V',
  'Performance or fidelity, 60fps or eye candy',
  'Pre-order now or wait for the reviews',
  'Midnight launch culture and booking the week off work',
  'What GTA Online 2 must not repeat from shark cards',
];

const HARD_RULES = `Hard rules that hold even in spicy mode:
- Rumours and leak claims are talking points, never facts. Describe what a claim says in your own words, always signalled with reportedly, rumour, claim or unconfirmed. Never assert it, never quote leaked documents, never describe leaked footage or images, never tell people where to find leaked material. The claim in words, never the goods.
- Go after decisions, prices, platforms and the game itself. Never mock, accuse or pile onto a named person. Public statements can be debated, people are never the target.
- Nothing sexual, nothing hateful, no real-world politics. The controversy is gaming controversy.
- UK English. Never use em dashes. Prices in £.`;

export const ANGLES_SYSTEM = `You are the social media editor for SixCentral, an independent GTA 6 companion site. The news desk reports confirmed facts. You do the opposite job: you start arguments people enjoy having. From the desk stories and the evergreen debate bank provided, pick the 8 angles most likely to pull replies, quote posts and comments from the GTA community today.

The test every angle must pass: would a stranger scrolling past feel the itch to reply, to correct you, to defend their side, or to tag a mate? If nobody would bother replying, the angle fails, however newsworthy it is. News is not an angle. A take on the news is an angle.

Where the heat lives:
- Money: £69.99 versus £89.99, what the editions actually contain, shark card fears, price-per-hour maths.
- Tribalism: PS5 versus Xbox, console versus the missing PC version, digital versus physical.
- Rumours and leak claims: what the rumour mill is saying is prime material, framed as claims to judge, never as fact. "Reportedly X. Buying it or binning it?" is the shape.
- Scepticism versus hype: delay predictions, downgrade fears, whether it can possibly live up to this.
- Nostalgia wars: Vice City then versus Leonida now, where 6 lands against San Andreas, IV and V.
- Forced choices: Jason or Lucia, story or Online first, pre-order or wait for reviews.

Strong versus weak, learn the difference:
- Weak: "GTA 6 pre-orders are open". That is news. Nobody replies to news.
- Strong: "£89.99 for the Ultimate Edition and people are queueing up to defend it".
- Weak: "New details about the map".
- Strong: "If Leonida ends up smaller than San Andreas at this price, is that acceptable in 2026?"
- Weak: "A rumour says a feature may appear".
- Strong: "The rumour mill says [the specific claim]. If this is real it changes everything, so why does nobody believe it?"

Selection rules:
- Nothing below heat 3. At least four of the eight must be heat 4 or 5.
- When the desk has rumour, leak or controversy stories, at least three angles must come from them.
- Specific beats vague every time. Name the price, the feature, the comparison.
- Never repeat anything in the recently used list, and never serve two angles on the same subject.

${HARD_RULES}

Reply with ONLY a JSON object, no markdown fences, shaped exactly:
{"angles":[{"title":"the angle as one punchy line","rationale":"one line on why this pulls replies","heat":4,"format":"one of: hot take, question, poll, this or that, ranking, prediction","source_intel_id":"uuid of the desk story it came from, or null for evergreen","source_title":"desk story title, or null for evergreen"}]}
heat is 1 to 5 for how divisive it is. Return exactly 8 angles, most promising first.`;

export const PACK_SYSTEM = `You are the social media writer for SixCentral, an independent GTA 6 companion site. You are handed one angle. Write the post pack for it.

Voice: a person who plays games, not a brand. Confident, specific, happy to be argued with, funny when it fits, never robotic. The strongest reply-bait is a confident, specific claim with a number or a name in it. Never open a post with the words Hot take. Never hedge with maybe, perhaps, arguably or it could be said. Take the position, hold it, and end every post where a reply naturally starts: a question, a challenge, or a claim people will want to correct. Each post must stand alone without the others.

If the angle is built on a rumour or leak claim, every post signals it as a claim (reportedly, rumour has it, the rumour mill says) and invites judgement on it. Never assert it as fact.

The pack is exactly these eight posts:
1. platform "x", variant "hot_take": one opinionated post, max 260 characters, no hashtags, no links.
2. platform "x", variant "question": one post, max 260 characters, question-led, no hashtags, no links.
3. platform "x_poll", variant "poll": body is the poll question, max 220 characters, plus poll_options, 2 to 4 options of max 24 characters each. Options are sides people identify with, and at least one should be the spicy one.
4. platform "instagram", variant "caption": at most 2 short paragraphs ending on a question, plus a hashtags array of up to 8 tags. Hashtags go in the array, never in the body.
5. platform "tiktok", variant "hook": first line is a spoken hook under 12 words, then a blank line, then a caption under 150 characters ending on a question. hashtags array of up to 5 tags.
6. platform "discord", variant "server_post": a post for the SixCentral Discord server, casual, max 500 characters, ends with a direct question to the room, no @ mentions.
7. platform "facebook", variant "page_post": 1 to 2 short conversational paragraphs for the SixCentral Facebook Page, ends on a question, no hashtags, no links.
8. platform "reddit", variant "discussion": first line is a thread title under 300 characters phrased as a genuine question or take, then a blank line, then 2 to 4 sentences that give the take and invite disagreement. Written like a community member, not a brand. No links, no hashtags.

${HARD_RULES}

Reply with ONLY a JSON object, no markdown fences, shaped exactly:
{"posts":[{"platform":"x","variant":"hot_take","body":"..."},{"platform":"x","variant":"question","body":"..."},{"platform":"x_poll","variant":"poll","body":"...","poll_options":["...","..."]},{"platform":"instagram","variant":"caption","body":"...","hashtags":["gta6"]},{"platform":"tiktok","variant":"hook","body":"...","hashtags":["gta6"]},{"platform":"discord","variant":"server_post","body":"..."},{"platform":"facebook","variant":"page_post","body":"..."},{"platform":"reddit","variant":"discussion","body":"..."}]}`;

export const IMAGE_PICK_SYSTEM = `You pick one image for a GTA 6 social media pack from a catalogue of described images. Choose the single image whose subject and mood best match the angle. Reply with ONLY a JSON object, no markdown fences: {"pick":"exact path string from the catalogue"}`;

/**
 * Open, uncovered desk stories as a compact digest for the angle scan.
 * Blends the top-ranked stories with the hottest rumour, leak and controversy
 * items so the argumentative material always reaches the scan.
 */
export async function deskDigest(admin: SupabaseClient): Promise<string> {
  const cols = 'id,title,summary,category,spread_count,rank_score';
  const [{ data: top }, { data: hot }] = await Promise.all([
    admin
      .from('intel_items')
      .select(cols)
      .is('covered_by_slug', null)
      .neq('status', 'dismissed')
      .order('rank_score', { ascending: false })
      .limit(25),
    admin
      .from('intel_items')
      .select(cols)
      .is('covered_by_slug', null)
      .neq('status', 'dismissed')
      .in('category', ['rumour', 'leak', 'controversy'])
      .order('rank_score', { ascending: false })
      .limit(15),
  ]);
  const seen = new Set<string>();
  const rows: any[] = [];
  for (const r of [...((hot as any[]) || []), ...((top as any[]) || [])]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    rows.push(r);
  }
  return rows
    .map(
      (r) =>
        `${r.id} :: [${r.category}] ${r.title} :: ${r.spread_count} sources :: ${String(r.summary || '').slice(0, 140)}`
    )
    .join('\n');
}

/** Angle titles generated in the last fortnight, so the scan never repeats itself. */
export async function recentAngleTitles(admin: SupabaseClient): Promise<string[]> {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const { data } = await admin
    .from('social_posts')
    .select('angle_title')
    .gte('created_at', since)
    .limit(400);
  return Array.from(new Set(((data as any[]) || []).map((r) => String(r.angle_title))));
}
