'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

const TICK_MS = 5000;

/**
 * Horizontal scroll-snap shell. Cards arrive as server-rendered children, so
 * dates and article text never re-render on the client: hydration-safe by design.
 * Auto-advances one card at a time and wraps; pauses on hover, touch, focus and
 * hidden tabs; disabled for prefers-reduced-motion users.
 */
export default function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const region = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
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

  useEffect(() => {
    const box = region.current;
    const el = track.current;
    if (!box || !el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const step = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const gap = parseFloat(getComputedStyle(el).columnGap || '14') || 14;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 8;
      if (atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: first.offsetWidth + gap, behavior: 'smooth' });
    };

    const id = setInterval(() => {
      if (paused.current || document.hidden) return;
      step();
    }, TICK_MS);

    const pause = () => {
      paused.current = true;
    };
    const resume = () => {
      paused.current = false;
    };
    box.addEventListener('pointerenter', pause);
    box.addEventListener('pointerleave', resume);
    box.addEventListener('touchstart', pause, { passive: true });
    box.addEventListener('touchend', resume, { passive: true });
    box.addEventListener('focusin', pause);
    box.addEventListener('focusout', resume);

    return () => {
      clearInterval(id);
      box.removeEventListener('pointerenter', pause);
      box.removeEventListener('pointerleave', resume);
      box.removeEventListener('touchstart', pause);
      box.removeEventListener('touchend', resume);
      box.removeEventListener('focusin', pause);
      box.removeEventListener('focusout', resume);
    };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="carousel" role="region" aria-label={label} ref={region}>
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
