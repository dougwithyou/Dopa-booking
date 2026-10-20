'use client';

import { DAY_MS, formatUntilDate, pad2, useCountdown } from '@/lib/countdown';

/**
 * Discount expiry on the landing page closer. More than a day out it just
 * says until when ("Hasta 15-Nov"); inside the last 24 hours it becomes a
 * live hours / minutes / seconds countdown for urgency.
 */
export function Countdown({
  expiresAt,
  locale,
  untilLabel,
  hoursLabel,
  minutesLabel,
  secondsLabel,
}: {
  expiresAt: string;
  locale: string;
  untilLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  secondsLabel: string;
}) {
  const { hours, minutes, seconds, totalMs } = useCountdown(expiresAt);

  if (totalMs >= DAY_MS) {
    return (
      <div className="text-center font-body text-[13px] font-semibold uppercase tracking-[0.18em] text-ink">
        {untilLabel} {formatUntilDate(expiresAt, locale)}
      </div>
    );
  }

  const units = [
    { value: hours, label: hoursLabel },
    { value: minutes, label: minutesLabel },
    { value: seconds, label: secondsLabel },
  ];
  return (
    <div className="flex justify-center gap-[18px]">
      {units.map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="font-body text-[26px] font-semibold tabular-nums text-ink">{pad2(unit.value)}</div>
          <div className="mt-0.5 font-body text-[9px] uppercase tracking-[0.14em] text-[#6b6055]">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}
