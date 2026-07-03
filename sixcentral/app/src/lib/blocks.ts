import { supabase } from '@/lib/supabase';

/** Everyone the signed-in user has blocked. RLS scopes the query to own rows. */
export async function fetchBlockedIds(): Promise<Set<string>> {
  const { data } = await supabase.from('user_blocks').select('blocked');
  return new Set((data ?? []).map((r) => r.blocked as string));
}

export async function blockUser(blocked: string): Promise<{ error: string | null }> {
  const { data } = await supabase.auth.getSession();
  const me = data.session?.user.id;
  if (!me) return { error: 'signin' };
  const { error } = await supabase.from('user_blocks').insert({ blocker: me, blocked });
  return { error: error?.message ?? null };
}

export async function unblockUser(blocked: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const me = data.session?.user.id;
  if (!me) return;
  await supabase.from('user_blocks').delete().eq('blocker', me).eq('blocked', blocked);
}

export async function reportClip(clipId: string, reason: 'not_gta' | 'offensive' | 'spam' | 'other'): Promise<{ error: string | null }> {
  const { data } = await supabase.auth.getSession();
  const me = data.session?.user.id;
  if (!me) return { error: 'signin' };
  const { error } = await supabase.from('clip_reports').insert({ clip_id: clipId, reporter: me, reason });
  if (error && error.code === '23505') return { error: null }; // already reported: same outcome for the user
  return { error: error?.message ?? null };
}
