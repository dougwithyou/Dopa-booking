import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

export interface TestimonialItem {
  quote: string;
  author: string;
}

export function Testimonials({
  eyebrow,
  heading,
  items,
}: {
  eyebrow: string;
  heading: ReactNode;
  items: TestimonialItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="testimonials bg-ink px-[6vw] py-[120px] text-parchment max-[600px]:py-20">
      <Reveal className="mb-14 max-w-[640px]">
        <span className="mb-3.5 block font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
          {eyebrow}
        </span>
        <h2 className="font-display text-[clamp(30px,4vw,48px)] font-black leading-[1.1]">{heading}</h2>
      </Reveal>

      <Reveal>
        <div className="mt-5 grid grid-cols-1 gap-10 max-[760px]:gap-10 sm:grid-cols-2 sm:gap-[60px]">
          {items.map((item, i) => (
            <div key={i} className="border-t border-parchment/20 pt-6">
              <p className="font-display text-[clamp(18px,2vw,23px)] font-extrabold leading-[1.5] tracking-[-0.005em]">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-[18px] font-body text-[11px] uppercase tracking-[0.12em] text-gold">
                — {item.author}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
