import Link from 'next/link';
import { DISCORD_INVITE } from '@/lib/site';

export default function SiteNav() {
  return (
    <nav className="nav">
      <div className="wrap nav__inner">
        <Link href="/" className="brand">
          SIX<span className="c">CENTRAL</span>
        </Link>
        <div className="nav__links">
          <Link href="/guides">Guides</Link>
          <Link href="/news/everything-confirmed">News</Link>
          {DISCORD_INVITE && (
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
              Discord
            </a>
          )}
          <Link href="/#app" className="nav__cta">
            Get the app
          </Link>
        </div>
      </div>
    </nav>
  );
}
