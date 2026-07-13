import type { Metadata } from 'next';
import { Anton, Space_Grotesk, Spline_Sans_Mono } from 'next/font/google';
import { SITE_URL, APP_STORE_URL } from '@/lib/site';
import './globals.css';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' });
const spline = Spline_Sans_Mono({ subsets: ['latin'], variable: '--font-spline', display: 'swap' });

const ORG_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SixCentral',
    url: SITE_URL,
    logo: `${SITE_URL}/app/app-icon.png`,
    sameAs: ['https://discord.gg/8xsC3tymm', APP_STORE_URL],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SixCentral',
    url: SITE_URL,
  },
];

export const metadata: Metadata = {
  title: {
    default: 'SixCentral | GTA 6 guides, news & tools (UK)',
    template: '%s · SixCentral',
  },
  description:
    'The UK companion for Grand Theft Auto VI. Verified guides, real news and an interactive tracker, built by fans who check their facts.',
  metadataBase: new URL('https://sixcentral.co.uk'),
  itunes: { appId: '6787364671' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  twitter: { card: 'summary_large_image' },
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  openGraph: {
    title: 'SixCentral | GTA 6 guides, news & tools',
    description: 'The UK companion for Grand Theft Auto VI.',
    siteName: 'SixCentral',
    locale: 'en_GB',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${anton.variable} ${grotesk.variable} ${spline.variable}`}>
      <body>
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }}
        />
      </body>
    </html>
  );
}
