'use client';

import { useRef, useState } from 'react';
import type { HeroImage } from '@/lib/types';

/**
 * Credited image carousel for official screenshots. Scroll-snap track
 * (native swipe on touch) with buttons for pointer users; every slide
 * carries its credit chip and a caption from the alt text.
 */
export default function MediaCarousel({ images, title }: { images: HeroImage[]; title?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  function go(dir: number) {
    const t = track.current;
    if (!t) return;
    t.scrollBy({ left: dir * t.clientWidth, behavior: 'smooth' });
  }
  function onScroll() {
    const t = track.current;
    if (!t) return;
    setIdx(Math.min(images.length - 1, Math.round(t.scrollLeft / t.clientWidth)));
  }

  if (!images.length) return null;

  return (
    <div className="carousel">
      <div className="carousel__head">
        {title && <div className="kicker">{title}</div>}
        <span className="carousel__count">
          {idx + 1} / {images.length}
        </span>
      </div>
      <div className="carousel__frame">
        <div className="carousel__track" ref={track} onScroll={onScroll}>
          {images.map((im, i) => (
            <figure className="carousel__slide" key={im.src}>
              <div className="carousel__imgwrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.src} alt={im.alt} loading={i === 0 ? 'eager' : 'lazy'} />
                <span className="media-credit">Image: {im.credit}</span>
              </div>
              <figcaption>{im.alt}</figcaption>
            </figure>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button className="carousel__btn carousel__btn--l" aria-label="Previous image" onClick={() => go(-1)}>
              &#8249;
            </button>
            <button className="carousel__btn carousel__btn--r" aria-label="Next image" onClick={() => go(1)}>
              &#8250;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
