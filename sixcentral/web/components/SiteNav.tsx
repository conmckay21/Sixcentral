import Link from 'next/link';

export default function SiteNav() {
  return (
    <nav className="nav">
      <div className="wrap nav__inner">
        <Link href="/" className="brand">
          SIX<span className="c">CENTRAL</span>
        </Link>
        <div className="nav__links">
          <Link href="/guides">Guides</Link>
          <Link href="/crew">Crew</Link>
          <Link href="/clips">Clips</Link>
          <Link href="/news/everything-confirmed">News</Link>
          <Link href="/account" className="nav__cta">
            Account
          </Link>
        </div>
      </div>
    </nav>
  );
}
