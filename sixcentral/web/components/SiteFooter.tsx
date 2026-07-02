import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <div className="brand">
              SIX<span className="c">CENTRAL</span>
            </div>
            <p className="footer__tag">
              Guides, news and tools for Grand Theft Auto VI. Built by fans who check their facts.
            </p>
          </div>
          <div className="footer__cols">
            <div className="footer__col">
              <h4>Explore</h4>
              <Link href="/guides">Guides</Link>
              <Link href="/news/everything-confirmed">News</Link>
              <Link href="/#rumour-mill">The Rumour Mill</Link>
              <Link href="/clips">Clips</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
            <div className="footer__col">
              <h4>Community</h4>
              <Link href="/#app">The app</Link>
              <Link href="/crew">The Come-Up</Link>
              <Link href="/contribute">Contribute</Link>
              <Link href="/#app">Clip of the Month</Link>
            </div>
          </div>
        </div>
        <div className="footer__nl">
          <h4>The launch list</h4>
          <NewsletterSignup source="footer" compact />
        </div>
        <p className="footer__legal">
          SixCentral is an independent fan resource and is not affiliated with, endorsed by, or
          sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and all related
          marks are trademarks of their respective owners. All artwork on this site is original.
          Some pages contain affiliate links; we may earn a commission on qualifying purchases.
        </p>
      </div>
    </footer>
  );
}
