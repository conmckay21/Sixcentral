import { getAllArticles } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

export const revalidate = 300;

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const articles = await getAllArticles();
  const items = articles
    .map((a) => {
      const url = `${SITE_URL}/news/${a.slug}`;
      const date = new Date(a.publishedAt ?? a.updatedAt).toUTCString();
      return `<item><title>${esc(a.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${date}</pubDate><description>${esc(a.excerpt)}</description></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>SixCentral</title><link>${SITE_URL}</link><description>The GTA 6 companion. Verified before it is published.</description><language>en-gb</language>${items}</channel></rss>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
