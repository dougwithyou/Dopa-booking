import type { ReactNode } from 'react';
import { Photo } from './Photo';
import { HeroSlideshow } from './HeroSlideshow';
import { HeroScrollReveal } from './HeroScrollReveal';
import { HeroDuoContrast } from './HeroDuoContrast';

export function Hero({
  eyebrow,
  headline,
  subheadline,
  ctaPrimaryHref,
  ctaPrimaryLabel,
  ctaSecondaryHref,
  ctaSecondaryLabel,
  imageUrl,
  slideshowUrls = [],
  scrollCueLabel,
}: {
  eyebrow: string | null;
  headline: ReactNode;
  subheadline: string | null;
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref: string;
  ctaSecondaryLabel: string;
  imageUrl: string | null;
  /** When 2+ photos are given, the hero cycles through them instead of showing imageUrl alone. */
  slideshowUrls?: string[];
  scrollCueLabel: string;
}) {
  return (
    <HeroScrollReveal>
    <section className="relative h-full w-full overflow-hidden">
      <HeroDuoContrast />
      {slideshowUrls.length > 1 ? (
        <HeroSlideshow urls={slideshowUrls} className="absolute inset-0 h-full w-full" />
      ) : (
        <Photo src={imageUrl} alt="" seed={0} className="absolute inset-0 h-full w-full" priority sizes="100vw" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,15,12,0.15) 0%, rgba(20,15,12,0.05) 35%, rgba(20,15,12,0.85) 100%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 z-[2] px-[6vw] pb-16 text-parchment">
        {eyebrow && (
          <span className="mb-[18px] hero-reveal-1 block font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
            {eyebrow}
          </span>
        )}
        <h1 className="hero-reveal-2 max-w-[14ch] font-display text-[clamp(40px,7.2vw,92px)] font-black leading-[1.02] tracking-[-0.01em]">
          {headline}
        </h1>
        {subheadline && (
          <p className="hero-reveal-3 mt-5 max-w-[44ch] font-body text-[15px] font-light leading-[1.7] text-[#e6ddcd]">
            {subheadline}
          </p>
        )}
        <div className="hero-reveal-4 mt-8 flex flex-wrap items-center gap-5">
          <a
            href={ctaPrimaryHref}
            className="inline-flex items-center gap-2.5 bg-clay px-[30px] py-4 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-[background,transform] duration-300 hover:-translate-y-0.5 hover:bg-wine"
          >
            {ctaPrimaryLabel}
          </a>
          <a
            href={ctaSecondaryHref}
            className="inline-flex items-center gap-2.5 border border-parchment/50 px-[30px] py-4 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors duration-300 hover:border-parchment hover:bg-parchment/10"
          >
            {ctaSecondaryLabel}
          </a>
        </div>
      </div>

      <div
        className="hero-scroll-cue absolute bottom-[26px] right-[6vw] z-[2] flex items-center gap-2.5 font-body text-[10px] uppercase tracking-[0.2em] text-[#e6ddcd] opacity-75 after:block after:h-[46px] after:w-px after:bg-[#e6ddcd]"
        style={{ writingMode: 'vertical-rl' }}
      >
        {scrollCueLabel}
      </div>
    </section>
    </HeroScrollReveal>
  );
}
