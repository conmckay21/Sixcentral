import { NextResponse } from 'next/server';
import { adminClient, staffUserId } from '@/lib/draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const admin = adminClient();
  const staff = await staffUserId(req, admin);
  if (!staff) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  let p: { action?: string; id?: string; angle_id?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  if (p.action === 'list') {
    const { data, error } = await admin
      .from('social_posts')
      .select('*')
      .neq('status', 'binned')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: data || [] });
  }

  if (p.action === 'used' || p.action === 'draft' || p.action === 'binned') {
    if (!p.id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
    const changes: Record<string, any> = { status: p.action };
    changes.used_at = p.action === 'used' ? new Date().toISOString() : null;
    const { error } = await admin.from('social_posts').update(changes).eq('id', p.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (p.action === 'bin_pack') {
    if (!p.angle_id) return NextResponse.json({ error: 'missing angle_id' }, { status: 400 });
    const { error } = await admin
      .from('social_posts')
      .update({ status: 'binned' })
      .eq('angle_id', p.angle_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
