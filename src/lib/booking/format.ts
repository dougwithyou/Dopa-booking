import { formatStudio, studioDateKey } from '@/lib/time';

// All booking-flow times are shown in the studio's timezone (see
// src/lib/time.ts), whatever timezone the visitor's device is set to.

/** Studio-local day grouping key for an ISO timestamp. */
export function dateKey(iso: string): string {
  return studioDateKey(iso);
}

export function formatDateLabel(iso: string, locale: string): string {
  return formatStudio(iso, 'EEEE, MMM d', locale);
}

export function formatTimeLabel(iso: string): string {
  return formatStudio(iso, 'h:mm a');
}

export function formatDateTimeLabel(iso: string, locale: string): string {
  return `${formatDateLabel(iso, locale)} · ${formatTimeLabel(iso)}`;
}
