'use client';

import { useEffect, useState } from 'react';

export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function computeParts(targetMs: number): CountdownParts {
  const diff = Math.max(0, targetMs - Date.now());
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    totalMs: diff,
  };
}

/**
 * Ticks once per second toward `targetIso`, clamped at zero. Fires
 * `onExpire` once, the first time it reaches zero. Shared by the landing
 * page's discount countdown and the booking flow's hold countdown.
 */
export function useCountdown(targetIso: string | null, onExpire?: () => void): CountdownParts {
  const targetMs = targetIso ? new Date(targetIso).getTime() : Date.now();
  const [parts, setParts] = useState<CountdownParts>(() => computeParts(targetMs));

  useEffect(() => {
    if (!targetIso) return;
    let expired = false;
    const tick = () => {
      const next = computeParts(targetMs);
      setParts(next);
      if (next.totalMs <= 0 && !expired) {
        expired = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso]);

  return parts;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
