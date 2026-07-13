import type { Metadata } from 'next';
import './globals.css';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: {
    default: 'SixCentral | GTA 6 guides, news & tools (UK)',
    template: '%s · SixCentral',
  },
  description:
    'The UK companion for Grand Theft Auto VI. Verified guides, real news and an interactive tracker, built by fans who check their facts.',
  metadataBase: new URL('https://sixcentral.co.uk'),
  itunes: { appId: '6787364671' },
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
    <html lang="en-GB">
      <body>
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
