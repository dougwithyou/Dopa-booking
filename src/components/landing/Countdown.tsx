'use client';

import { pad2, useCountdown } from '@/lib/countdown';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Discount countdown on the landing page closer. With a day or more left it
 * shows days / hours / minutes (seconds ticking that far out is noise);
 * under 24 hours it switches to hours / minutes / seconds for urgency.
 */
export function Countdown({
  expiresAt,
  daysLabel,
  hoursLabel,
  minutesLabel,
  secondsLabel,
}: {
  expiresAt: string;
  daysLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  secondsLabel: string;
}) {
  const { days, hours, minutes, seconds, totalMs } = useCountdown(expiresAt);
  const units =
    totalMs >= DAY_MS
      ? [
          { value: days, label: daysLabel },
          { value: hours, label: hoursLabel },
          { value: minutes, label: minutesLabel },
        ]
      : [
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
