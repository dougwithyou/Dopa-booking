'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Scroll-driven hero: the hero stays pinned (sticky) while the visitor
 * scrolls through an extra `pinFraction` of a screen; that scroll distance
 * drives a 0→1 `--hero-p` CSS variable the hero text uses to rise into
 * place (see .hero-reveal-* in globals.css). Once it reaches 1 the pin ends
 * and the page scrolls on normally. Written straight to the DOM inside a
 * rAF — no React re-render per scroll event.
 *
 * Reduced-motion visitors get no pin and fully visible text.
 */
export function HeroScrollReveal({ children, pinFraction = 0.7 }: { children: ReactNode; pinFraction?: number }) {
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      outer.style.setProperty('--hero-p', '1');
      outer.classList.add('hero-revealed');
      outer.style.height = 'auto';
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const pinDistance = outer.offsetHeight - window.innerHeight;
      const scrolled = -outer.getBoundingClientRect().top;
      const p = pinDistance > 0 ? Math.min(1, Math.max(0, scrolled / pinDistance)) : 1;
      outer.style.setProperty('--hero-p', p.toFixed(3));
      outer.classList.toggle('hero-revealed', p >= 0.9);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={outerRef}
      className="hero-reveal relative"
      style={{ height: `calc(max(100svh, 640px) + ${pinFraction * 100}svh)` }}
    >
      <div className="sticky top-0 h-[100svh] min-h-[640px] overflow-hidden">{children}</div>
    </div>
  );
}
