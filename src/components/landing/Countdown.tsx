'use client';

import { pad2, useCountdown } from '@/lib/countdown';

export function Countdown({
  expiresAt,
  hoursLabel,
  minutesLabel,
  secondsLabel,
}: {
  expiresAt: string;
  hoursLabel: string;
  minutesLabel: string;
  secondsLabel: string;
}) {
  const { hours, minutes, seconds } = useCountdown(expiresAt);
  return (
    <div className="flex justify-center gap-[18px]">
      <div className="text-center">
        <div className="font-body text-[26px] font-semibold tabular-nums text-ink">{pad2(hours)}</div>
        <div className="mt-0.5 font-body text-[9px] uppercase tracking-[0.14em] text-[#6b6055]">{hoursLabel}</div>
      </div>
      <div className="text-center">
        <div className="font-body text-[26px] font-semibold tabular-nums text-ink">{pad2(minutes)}</div>
        <div className="mt-0.5 font-body text-[9px] uppercase tracking-[0.14em] text-[#6b6055]">{minutesLabel}</div>
      </div>
      <div className="text-center">
        <div className="font-body text-[26px] font-semibold tabular-nums text-ink">{pad2(seconds)}</div>
        <div className="mt-0.5 font-body text-[9px] uppercase tracking-[0.14em] text-[#6b6055]">{secondsLabel}</div>
      </div>
    </div>
  );
}
