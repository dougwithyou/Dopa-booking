import { Photo } from './Photo';
import { Reveal } from './Reveal';

export function About({
  eyebrow,
  heading,
  body,
  signature,
  imageUrl,
}: {
  eyebrow: string;
  heading: string;
  body: string[];
  signature: string;
  imageUrl: string | null;
}) {
  return (
    <section className="grid grid-cols-1 items-center gap-9 bg-parchment-dim px-[6vw] py-[120px] max-[600px]:py-20 min-[821px]:grid-cols-[0.9fr_1.1fr] min-[821px]:gap-[70px]">
      <Reveal className="aspect-[4/5] overflow-hidden">
        <Photo src={imageUrl} alt={heading} seed={3} className="h-full w-full" />
      </Reveal>
      <Reveal>
        <span className="block font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
          {eyebrow}
        </span>
        <h2 className="my-3.5 font-display text-[clamp(28px,3.6vw,42px)] font-black leading-[1.1] text-ink">
          {heading}
        </h2>
        <div className="space-y-4">
          {body.map((paragraph, i) => (
            <p key={i} className="max-w-[46ch] font-body text-[15px] font-light leading-[1.85] text-[#3a322a]">
              {paragraph}
            </p>
          ))}
        </div>
        {signature && (
          <div className="mt-[26px] font-display text-sm font-extrabold uppercase tracking-[0.06em] text-clay">
            {signature}
          </div>
        )}
      </Reveal>
    </section>
  );
}
