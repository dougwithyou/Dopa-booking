'use client';

import { pad2, useCountdown } from '@/lib/countdown';

export const PROMO_BANNER_HEIGHT = 44;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Slim fixed bar above the top mark advertising the active discount: value,
 * code, a compact countdown (days/hours/minutes past 24h, hh:mm:ss under)
 * and a Book now button. Hidden once the countdown runs out.
 */
export function PromoBanner({
  offLabel,
  codeLabel,
  code,
  endsInLabel,
  expiresAt,
  ctaHref,
  ctaLabel,
}: {
  offLabel: string;
  codeLabel: string;
  code: string;
  endsInLabel: string;
  expiresAt: string | null;
  ctaHref: string;
  ctaLabel: string;
}) {
  const { days, hours, minutes, seconds, totalMs } = useCountdown(expiresAt);
  if (expiresAt && totalMs <= 0) return null;

  const remaining =
    totalMs >= DAY_MS
      ? `${days}d ${pad2(hours)}h ${pad2(minutes)}m`
      : `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[55] flex items-center justify-center gap-3 overflow-hidden bg-wine px-[4vw] font-body text-parchment sm:gap-5"
      style={{ height: PROMO_BANNER_HEIGHT }}
    >
      <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-gold sm:inline">
        {offLabel}
      </span>
      <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.12em]">
        <span className="hidden text-parchment/70 sm:inline">{codeLabel} </span>
        <span className="font-display text-[13px] font-black tracking-[0.06em]">{code}</span>
      </span>
      {expiresAt && (
        <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.12em]">
          <span className="hidden text-parchment/70 md:inline">{endsInLabel} </span>
          <span className="font-semibold tabular-nums">{remaining}</span>
        </span>
      )}
      <a
        href={ctaHref}
        className="whitespace-nowrap bg-gold px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-parchment"
      >
        {ctaLabel}
      </a>
    </div>
  );
}
