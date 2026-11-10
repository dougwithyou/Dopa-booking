import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { enUS, es } from 'date-fns/locale';

/**
 * The studio's timezone. Every session time is shown — and every slot the
 * admin creates is interpreted — in this zone, never in the viewer's device
 * or server timezone (Vercel runs in UTC; clients may be traveling or have
 * their phone set to another zone). Same zone the emails already use.
 */
export const STUDIO_TZ = 'America/New_York';

type DateLike = string | number | Date;

/** Formats an instant in the studio timezone with a date-fns pattern. */
export function formatStudio(value: DateLike, pattern: string, locale: string = 'en'): string {
  return formatInTimeZone(value, STUDIO_TZ, pattern, { locale: locale === 'es' ? es : enUS });
}

/** Studio-local calendar day of an instant, e.g. "2026-11-14". */
export function studioDateKey(value: DateLike): string {
  return formatInTimeZone(value, STUDIO_TZ, 'yyyy-MM-dd');
}

/** Today's date in the studio timezone, e.g. "2026-11-10". */
export function studioTodayKey(): string {
  return studioDateKey(Date.now());
}

/** Hour of day (0-23) of an instant, in the studio timezone. */
export function studioHour(value: DateLike): number {
  return Number(formatInTimeZone(value, STUDIO_TZ, 'H'));
}

/** A studio wall-clock date ("2026-11-14") + time ("14:00") → ISO instant. */
export function studioDateTimeToIso(dateStr: string, timeStr: string): string {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, STUDIO_TZ).toISOString();
}
