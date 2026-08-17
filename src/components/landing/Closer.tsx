import type { ReactNode } from 'react';
import { Countdown } from './Countdown';

export function Closer({
  sectionId,
  eyebrow,
  heading,
  body,
  ticket,
  ctaHref,
  ctaLabel,
}: {
  sectionId: string;
  eyebrow: string;
  heading: ReactNode;
  body: string | null;
  ticket: {
    code: string;
    label: string;
    expiresAt: string | null;
    hoursLabel: string;
    minutesLabel: string;
    secondsLabel: string;
  } | null;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <section id={sectionId} className="closer relative bg-clay px-[6vw] py-[120px] text-center text-[#f8f1e4] max-[600px]:py-20">
      <span className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f8e6cf]">{eyebrow}</span>
      <h2 className="mx-auto mt-4 max-w-[16ch] font-display text-[clamp(32px,5vw,58px)] font-black leading-[1.1]">
        {heading}
      </h2>
      {body && <p className="mx-auto mb-10 mt-[18px] max-w-[48ch] font-body text-sm font-light text-[#f6e9d8]">{body}</p>}

      {ticket && (
        <div className="relative mx-auto max-w-[420px] rounded-sm bg-parchment px-[26px] pb-[34px] pt-[30px] text-ink">
          <span className="absolute left-[-11px] top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-full bg-clay" />
          <span className="absolute right-[-11px] top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-full bg-clay" />
          <div className="font-display text-[30px] font-black tracking-[0.02em] text-wine">{ticket.code}</div>
          <div className="mt-1.5 font-body text-[10px] uppercase tracking-[0.18em] text-moss">{ticket.label}</div>
          <div className="my-5 border-t border-dashed border-[var(--line)]" />
          {ticket.expiresAt && (
            <Countdown
              expiresAt={ticket.expiresAt}
              hoursLabel={ticket.hoursLabel}
              minutesLabel={ticket.minutesLabel}
              secondsLabel={ticket.secondsLabel}
            />
          )}
        </div>
      )}

      <a
        href={ctaHref}
        className="mt-[34px] inline-flex items-center gap-2.5 bg-ink px-[30px] py-4 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-[background,transform] duration-300 hover:-translate-y-0.5 hover:bg-wine"
      >
        {ctaLabel}
      </a>
    </section>
  );
}
