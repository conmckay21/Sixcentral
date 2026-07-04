import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * A clip is feed-ready only when YouTube will actually serve it. Fresh uploads
 * spend a few minutes processing, during which embeds say "Video unavailable";
 * the mod queue asks here before letting an approval through.
 */
export async function GET(req: Request) {
  const v = new URL(req.url).searchParams.get('v');
  if (!v || !/^[\w-]{6,20}$/.test(v)) {
    return NextResponse.json({ ok: false, playable: false, error: 'bad id' }, { status: 400 });
  }
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v}`)}&format=json`,
      { cache: 'no-store' }
    );
    return NextResponse.json({ ok: true, playable: r.ok });
  } catch {
    return NextResponse.json({ ok: true, playable: false });
  }
}
