'use client';

import { DAY_MS, pad2, useCountdown } from '@/lib/countdown';

/**
 * Discount countdown on the landing page closer ticket. Only shown in the
 * final 24 hours (hours / minutes / seconds, for urgency); before that the
 * ticket shows just the code. Renders its own divider so the ticket has no
 * dangling rule when the countdown is hidden.
 */
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
  const { hours, minutes, seconds, totalMs } = useCountdown(expiresAt);
  if (totalMs <= 0 || totalMs >= DAY_MS) return null;

  const units = [
    { value: hours, label: hoursLabel },
    { value: minutes, label: minutesLabel },
    { value: seconds, label: secondsLabel },
  ];
  return (
    <>
      <div className="my-5 border-t border-dashed border-[var(--line)]" />
      <div className="flex justify-center gap-[18px]">
        {units.map((unit) => (
          <div key={unit.label} className="text-center">
            <div className="font-body text-[26px] font-semibold tabular-nums text-ink">{pad2(unit.value)}</div>
            <div className="mt-0.5 font-body text-[9px] uppercase tracking-[0.14em] text-[#6b6055]">{unit.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
