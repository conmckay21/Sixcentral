import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing supabase service env');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Verifies the caller is a signed-in staff member from their access token. */
export async function staffUserId(req: Request, admin: SupabaseClient): Promise<string | null> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  const user = data?.user;
  if (!user) return null;
  const { data: p } = await admin.from('profiles').select('is_staff').eq('id', user.id).maybeSingle();
  return p && (p as any).is_staff ? user.id : null;
}

export async function claude(system: string, content: any, maxTokens = 1600): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('missing ANTHROPIC_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
}

export function stripJson(text: string): string {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'article'
  );
}

/** Finds a free slug, reusing the story's existing draft slug when present. */
export async function uniqueSlug(admin: SupabaseClient, base: string, keep?: string): Promise<string> {
  let slug = base;
  for (let i = 0; i < 25; i++) {
    if (keep && slug === keep) return slug;
    const { data } = await admin.from('articles').select('slug').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    if (keep && (data as any).slug === keep) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

export function credibilityFor(tier: number, corroborated: boolean): number {
  if (tier === 1) return 5;
  if (tier === 2) return corroborated ? 4 : 3;
  if (tier === 3) return 2;
  return 1;
}

const GRADIENTS: Record<string, string> = {
  confirmed: 'linear-gradient(135deg,#35E27C,#1FE5D6)',
  controversy: 'linear-gradient(135deg,#FF2E88,#8A4FFF)',
  debunk: 'linear-gradient(135deg,#1FE5D6,#8A4FFF)',
  leak: 'linear-gradient(135deg,#8A4FFF,#FF2E88)',
  rumour: 'linear-gradient(135deg,#FFC83D,#FF2E88)',
};
export function gradientFor(cat: string): string {
  return GRADIENTS[cat] || 'linear-gradient(135deg,#8A4FFF,#1FE5D6)';
}
