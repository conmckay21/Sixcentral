import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANON_RE = /^[0-9a-f-]{16,64}$/i;

async function counts(admin: ReturnType<typeof adminClient>, slug: string) {
  const { data } = await admin.from('articles').select('up_count, down_count').eq('slug', slug).maybeSingle();
  return { up: data?.up_count ?? 0, down: data?.down_count ?? 0 };
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  if (!slug) return NextResponse.json({ error: 'missing slug' }, { status: 400 });
  const admin = adminClient();
  return NextResponse.json(await counts(admin, slug));
}

export async function POST(req: Request) {
  const admin = adminClient();
  let body: { slug?: string; value?: number; anonId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const slug = body.slug ?? '';
  const value = body.value;
  if (!slug || ![1, -1, 0].includes(value as number)) {
    return NextResponse.json({ error: 'bad input' }, { status: 400 });
  }

  const { data: article } = await admin
    .from('articles')
    .select('slug')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (!article) return NextResponse.json({ error: 'unknown article' }, { status: 404 });

  // Signed-in identity wins when a valid token is supplied; anon id otherwise.
  let profileId: string | null = null;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const { data } = await admin.auth.getUser(auth.slice(7));
    profileId = data.user?.id ?? null;
  }
  const anonId = !profileId && body.anonId && ANON_RE.test(body.anonId) ? body.anonId : null;
  if (!profileId && !anonId) return NextResponse.json({ error: 'no identity' }, { status: 400 });

  const ident = profileId
    ? { col: 'profile_id' as const, val: profileId }
    : { col: 'anon_id' as const, val: anonId as string };

  const { data: existing } = await admin
    .from('article_reactions')
    .select('id, value')
    .eq('article_slug', slug)
    .eq(ident.col, ident.val)
    .maybeSingle();

  if (value === 0) {
    if (existing) await admin.from('article_reactions').delete().eq('id', existing.id);
  } else if (existing) {
    if (existing.value !== value) {
      await admin
        .from('article_reactions')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
  } else {
    await admin.from('article_reactions').insert({
      article_slug: slug,
      profile_id: profileId,
      anon_id: anonId,
      value,
    });
  }

  return NextResponse.json({ ...(await counts(admin, slug)), mine: value });
}
