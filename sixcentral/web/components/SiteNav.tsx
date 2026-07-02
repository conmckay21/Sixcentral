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
          <Link href="/news/everything-confirmed">News</Link>
          <Link href="/guides/leonida-map-regions">Map</Link>
          <Link href="/#app" className="nav__cta">
            Get the app
          </Link>
        </div>
      </div>
    </nav>
  );
}
