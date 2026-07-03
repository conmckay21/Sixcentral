'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Horizontal scroll-snap shell. Cards arrive as server-rendered children, so
 * dates and article text never re-render on the client: hydration-safe by design.
 */
export default function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      setCanPrev(el.scrollLeft > 8);
      setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="carousel" role="region" aria-label={label}>
      <div className="carousel__track" ref={track}>
        {children}
      </div>
      <button
        type="button"
        className="carousel__btn carousel__btn--prev"
        aria-label="Scroll back"
        onClick={() => nudge(-1)}
        disabled={!canPrev}
      >
        &#8249;
      </button>
      <button
        type="button"
        className="carousel__btn carousel__btn--next"
        aria-label="Scroll forward"
        onClick={() => nudge(1)}
        disabled={!canNext}
      >
        &#8250;
      </button>
    </div>
  );
}
