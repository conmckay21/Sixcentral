import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminClient, staffUserId } from '@/lib/draft';

/** Push a change straight to every cached surface the article appears on. */
function refreshSurfaces(slug: string) {
  revalidatePath('/');
  revalidatePath('/news');
  revalidatePath(`/news/${slug}`);
  revalidatePath('/sitemap.xml');
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const admin = adminClient();
  const staff = await staffUserId(req, admin);
  if (!staff) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  let p: { slug?: string; action?: string; intel_id?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const { slug, action, intel_id } = p;
  if (!slug || !action) return NextResponse.json({ error: 'missing slug or action' }, { status: 400 });

  if (action === 'publish') {
    const { error } = await admin
      .from('articles')
      .update({ published: true, updated_at: new Date().toISOString() })
      .eq('slug', slug);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // covered_by_slug is what the desk filters on, not status. Set both, or the
    // story stays in the open list forever with a published article behind it.
    if (intel_id) {
      await admin
        .from('intel_items')
        .update({ status: 'published', covered_by_slug: slug })
        .eq('id', intel_id);
    }
    refreshSurfaces(slug);
    return NextResponse.json({ ok: true, published: true, url: `/news/${slug}` });
  }

  if (action === 'discard') {
    // only ever delete an unpublished draft
    await admin.from('articles').delete().eq('slug', slug).eq('published', false);
    if (intel_id) {
      await admin.from('intel_items').update({ draft_slug: null }).eq('id', intel_id);
      // Only clear the cover we set ourselves, never one the scan matched.
      await admin
        .from('intel_items')
        .update({ covered_by_slug: null })
        .eq('id', intel_id)
        .eq('covered_by_slug', slug);
    }
    refreshSurfaces(slug);
    return NextResponse.json({ ok: true, discarded: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
