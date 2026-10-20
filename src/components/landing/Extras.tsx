import type { ReactNode } from 'react';
import { Photo } from './Photo';
import { Reveal } from './Reveal';

export interface ExtraShowcaseItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

/**
 * Showcase of the page's upsell extras — photo, name and description only,
 * no prices or buttons. Clients add them on the checkout step.
 */
export function Extras({
  eyebrow,
  heading,
  note,
  items,
}: {
  eyebrow: string;
  heading: ReactNode;
  note: string;
  items: ExtraShowcaseItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="bg-parchment px-[6vw] py-[120px] max-[600px]:py-20">
      <Reveal className="mb-12 max-w-[640px]">
        <span className="mb-3.5 block font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
          {eyebrow}
        </span>
        <h2 className="font-display text-[clamp(30px,4vw,48px)] font-black leading-[1.1] text-ink">{heading}</h2>
        <p className="mt-4 max-w-[46ch] font-body text-[15px] font-light leading-[1.7] text-[#3a322a]">{note}</p>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <article key={item.id}>
              <Photo
                src={item.imageUrl}
                alt={item.name}
                seed={i + 5}
                className="aspect-[4/3] w-full"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <h3 className="mt-5 font-display text-lg font-extrabold text-ink">{item.name}</h3>
              {item.description && (
                <p className="mt-2 font-body text-sm font-light leading-[1.7] text-[#3a322a]">{item.description}</p>
              )}
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
