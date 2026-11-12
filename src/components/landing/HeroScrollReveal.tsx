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
export function HeroScrollReveal({ children, pinFraction = 0.35 }: { children: ReactNode; pinFraction?: number }) {
  const outerRef = useRef<HTMLDivElement>(null);

  // Size the hero to the screen the visitor actually sees. Viewport units
  // fall short on phones: iOS Safari's floating toolbars let the page show
  // behind them, so 100svh left a strip of page background under the hero.
  // Measure once, then only grow (toolbars collapsing) or re-measure on a
  // width change (rotation) — shrinking on every toolbar move would jitter.
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    let width = window.innerWidth;
    let height = 0;
    const measure = () => {
      const visible = Math.max(window.innerHeight, document.documentElement.clientHeight);
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        height = 0;
      }
      if (visible > height) {
        height = visible;
        outer.style.setProperty('--hero-h', `${visible}px`);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
      // --hero-h: measured visible height (set above); 100dvh until then.
      style={{ height: `calc(max(var(--hero-h, 100dvh), 640px) * ${1 + pinFraction})` }}
    >
      <div className="sticky top-0 h-[var(--hero-h,100dvh)] min-h-[640px] overflow-hidden">{children}</div>
    </div>
  );
}
