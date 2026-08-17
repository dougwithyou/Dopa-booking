import type { ReactNode } from 'react';
import { Photo } from './Photo';

export function Hero({
  eyebrow,
  headline,
  subheadline,
  ctaPrimaryHref,
  ctaPrimaryLabel,
  ctaSecondaryHref,
  ctaSecondaryLabel,
  imageUrl,
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
  scrollCueLabel: string;
}) {
  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <Photo src={imageUrl} alt="" seed={0} className="absolute inset-0 h-full w-full" priority sizes="100vw" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,15,12,0.15) 0%, rgba(20,15,12,0.05) 35%, rgba(20,15,12,0.85) 100%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 z-[2] px-[6vw] pb-16 text-parchment">
        {eyebrow && (
          <span className="mb-[18px] block animate-[rise_0.9s_0.2s_ease_forwards] font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold opacity-0">
            {eyebrow}
          </span>
        )}
        <h1 className="max-w-[14ch] animate-[rise_0.9s_0.4s_ease_forwards] font-display text-[clamp(40px,7.2vw,92px)] font-black leading-[1.02] tracking-[-0.01em] opacity-0">
          {headline}
        </h1>
        {subheadline && (
          <p className="mt-5 max-w-[44ch] animate-[rise_0.9s_0.6s_ease_forwards] font-body text-[15px] font-light leading-[1.7] text-[#e6ddcd] opacity-0">
            {subheadline}
          </p>
        )}
        <div className="mt-8 flex animate-[rise_0.9s_0.8s_ease_forwards] flex-wrap items-center gap-5 opacity-0">
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
        className="absolute bottom-[26px] right-[6vw] z-[2] flex items-center gap-2.5 font-body text-[10px] uppercase tracking-[0.2em] text-[#e6ddcd] opacity-75 after:block after:h-[46px] after:w-px after:bg-[#e6ddcd]"
        style={{ writingMode: 'vertical-rl' }}
      >
        {scrollCueLabel}
      </div>
    </section>
  );
}
