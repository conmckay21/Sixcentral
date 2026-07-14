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
- Leaked and datamined material: the existence of leaks and the debate around leaking can be a topic, the contents of leaks can never be. Never build a post on what a leak claims to show, never reference specific leaked details, never point people towards leaked material.
- Rumours are framed as open questions or clearly attributed claims, never stated as fact. SixCentral never asserts something unconfirmed.
- Go after decisions, prices, platforms and the game itself. Never mock, accuse or pile onto a named person. Public statements can be debated, people are never the target.
- Nothing sexual, nothing hateful, no real-world politics. The controversy is gaming controversy.
- UK English. Never use em dashes. Prices in £.`;

export const ANGLES_SYSTEM = `You are the social media editor for SixCentral, an independent GTA 6 companion site. The news desk reports confirmed facts. You do the opposite job: you start conversations. From the desk stories and the evergreen debate bank provided, pick the 8 angles most likely to pull replies, quote posts and comments from the GTA community today.

What makes a strong angle:
- A genuine split the community already argues about: price, editions, platforms, the map, the protagonists, old versus new, hype versus caution.
- It invites the reader to take a side. "Is £89.99 for the Ultimate Edition taking the mick?" beats "Ultimate Edition contents detailed".
- Specific beats vague. Name the price, the feature, the comparison.
- Fresh desk stories with heat beat evergreens, but a strong evergreen beats a weak story. Mix both when the desk is quiet.
- Never repeat anything in the recently used list, and do not serve two angles about the same subject.

${HARD_RULES}

Reply with ONLY a JSON object, no markdown fences, shaped exactly:
{"angles":[{"title":"the angle as one punchy line","rationale":"one line on why this pulls replies","heat":3,"format":"one of: hot take, question, poll, this or that, ranking, prediction","source_intel_id":"uuid of the desk story it came from, or null for evergreen","source_title":"desk story title, or null for evergreen"}]}
heat is 1 to 5 for how divisive it is. Return exactly 8 angles, most promising first.`;

export const PACK_SYSTEM = `You are the social media writer for SixCentral, an independent GTA 6 companion site. You are handed one angle. Write the post pack for it.

Voice: a person who plays games, not a brand. Punchy, confident, happy to take a side, funny when it fits, never robotic. Every post is built to be replied to: end on a question, a challenge, or a take people will want to correct. Each post must stand alone without the others.

The pack is exactly these six posts:
1. platform "x", variant "hot_take": one opinionated post, max 260 characters, no hashtags, no links.
2. platform "x", variant "question": one post, max 260 characters, question-led, no hashtags.
3. platform "x_poll", variant "poll": body is the poll question, max 220 characters, plus poll_options, 2 to 4 options of max 24 characters each.
4. platform "instagram", variant "caption": at most 2 short paragraphs ending on a question, plus a hashtags array of up to 8 tags. Hashtags go in the array, never in the body.
5. platform "tiktok", variant "hook": first line is a spoken hook under 12 words, then a blank line, then a caption under 150 characters ending on a question. hashtags array of up to 5 tags.
6. platform "discord", variant "server_post": a post for the SixCentral Discord server, casual, max 500 characters, ends with a direct question to the room, no @ mentions.

${HARD_RULES}

Reply with ONLY a JSON object, no markdown fences, shaped exactly:
{"posts":[{"platform":"x","variant":"hot_take","body":"..."},{"platform":"x","variant":"question","body":"..."},{"platform":"x_poll","variant":"poll","body":"...","poll_options":["...","..."]},{"platform":"instagram","variant":"caption","body":"...","hashtags":["gta6"]},{"platform":"tiktok","variant":"hook","body":"...","hashtags":["gta6"]},{"platform":"discord","variant":"server_post","body":"..."}]}`;

/** Open, uncovered desk stories as a compact digest for the angle scan. */
export async function deskDigest(admin: SupabaseClient): Promise<string> {
  const { data } = await admin
    .from('intel_items')
    .select('id,title,summary,category,spread_count,rank_score,status,covered_by_slug')
    .is('covered_by_slug', null)
    .neq('status', 'dismissed')
    .order('rank_score', { ascending: false })
    .limit(40);
  const rows = (data as any[]) || [];
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
