import { NextResponse } from 'next/server';
import { adminClient, staffUserId } from '@/lib/draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload = {
  op?: 'sets' | 'list' | 'upsert' | 'delete';
  set_slug?: string;
  idx?: number;
  label?: string;
  notes?: string | null;
  verified?: boolean;
  lat?: number | null;
  lng?: number | null;
};

export async function POST(req: Request) {
  const admin = adminClient();
  const staff = await staffUserId(req, admin);
  if (!staff) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  let p: Payload;
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  if (p.op === 'sets') {
    const { data, error } = await admin
      .from('collectible_sets')
      .select('slug,name,total,cadence')
      .eq('game_slug', 'gta-online')
      .order('sort', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: counts } = await admin.from('collectible_items').select('set_slug');
    const bySet: Record<string, number> = {};
    for (const row of counts ?? []) bySet[row.set_slug] = (bySet[row.set_slug] ?? 0) + 1;
    return NextResponse.json({
      sets: (data ?? []).map((s) => ({ ...s, items: bySet[s.slug] ?? 0 })),
    });
  }

  if (!p.set_slug) return NextResponse.json({ error: 'missing set_slug' }, { status: 400 });

  if (p.op === 'list') {
    const { data, error } = await admin
      .from('collectible_items')
      .select('idx,label,notes,verified,lat,lng')
      .eq('set_slug', p.set_slug)
      .order('idx', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  if (p.op === 'upsert') {
    if (!p.idx || !p.label?.trim())
      return NextResponse.json({ error: 'missing idx or label' }, { status: 400 });
    const { error } = await admin.from('collectible_items').upsert(
      {
        set_slug: p.set_slug,
        idx: p.idx,
        label: p.label.trim(),
        notes: p.notes?.trim() || null,
        verified: !!p.verified,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
      },
      { onConflict: 'set_slug,idx' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (p.op === 'delete') {
    if (!p.idx) return NextResponse.json({ error: 'missing idx' }, { status: 400 });
    const { error } = await admin
      .from('collectible_items')
      .delete()
      .eq('set_slug', p.set_slug)
      .eq('idx', p.idx);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown op' }, { status: 400 });
}
