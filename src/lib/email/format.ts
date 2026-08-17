import { formatInTimeZone } from 'date-fns-tz';
import type { Locale } from '@/types/db';

// Dopa Studio operates entirely in the DMV area today, so a single
// hardcoded timezone is fine here — if multi-timezone studios ever show
// up, thread `studio.timezone` through instead.
const STUDIO_TIMEZONE = 'America/New_York';

const DATE_FORMAT_PATTERNS: Record<Locale, string> = {
  en: 'EEEE, MMMM d, yyyy \'at\' h:mm a',
  es: "EEEE d 'de' MMMM 'de' yyyy 'a las' h:mm a",
};

// date-fns's built-in locale data isn't imported here to avoid pulling in
// an extra dependency decision — English month/day names read fine in a
// transactional email even for Spanish speakers, and the surrounding copy
// (and "a las" / hour format) is still localized. Good enough for v1.
export function formatSlotDateTime(startTimeIso: string, locale: Locale): string {
  return formatInTimeZone(new Date(startTimeIso), STUDIO_TIMEZONE, DATE_FORMAT_PATTERNS[locale]);
}

export function formatCurrency(amountCents: number, currency: string, locale: Locale): string {
  const formatter = new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(amountCents / 100);
}

export function resolveLocale(locale: Locale | null | undefined): Locale {
  return locale === 'es' ? 'es' : 'en';
}
