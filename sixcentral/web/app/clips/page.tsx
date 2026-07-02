import type { Metadata } from 'next';
import ClipsSection from '@/components/ClipsSection';

export const metadata: Metadata = {
  title: 'GTA 6 clips and trailers',
  description:
    'Watch the official GTA 6 trailers and the best community clips. Submit yours, get featured, earn Respect. Clip of the Month starts at launch.',
  alternates: { canonical: '/clips' },
};

const TRAILERS = [
  {
    id: 'QdBZY2fkU-0',
    name: 'Grand Theft Auto VI Trailer 1',
    date: '2023-12-04',
    blurb:
      'The one that broke the internet. December 2023, Lucia revealed, Vice City confirmed, and a 24 hour YouTube record smashed on the way.',
  },
  {
    id: 'VQRLujxTm3c',
    name: 'Grand Theft Auto VI Trailer 2',
    date: '2025-05-06',
    blurb:
      'May 2025. Jason and Lucia, the score gone wrong, and over 475 million views in its first day across platforms. Rockstar called it the biggest video launch in the history of the internet.',
  },
];

export default function ClipsPage() {
  const videoSchema = TRAILERS.map((t) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: t.name,
    description: t.blurb,
    thumbnailUrl: `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`,
    uploadDate: t.date,
    embedUrl: `https://www.youtube-nocookie.com/embed/${t.id}`,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
      <section className="hero">
        <div className="wrap">
          <div className="kicker">Clips</div>
          <h1>
            Watch it. <span className="c">Then top it.</span>
          </h1>
          <p>
            The official trailers live here, and so will the best community clips the moment the
            game does. Submit yours, get featured, bank Respect. Clip of the Month starts day one.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>
              The official <span className="c">trailers</span>
            </h2>
          </div>
          <div className="grid grid--2">
            {TRAILERS.map((t) => (
              <div key={t.id} className="trailer-card">
                <div className="ytwrap">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${t.id}`}
                    title={t.name}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="trailer-card__t">{t.name}</div>
                <p className="trailer-card__d">{t.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ClipsSection />
    </>
  );
}
