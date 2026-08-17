import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

/** Local-day grouping key for an ISO timestamp (uses the browser's local timezone). */
export function dateKey(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function formatDateLabel(iso: string, locale: string): string {
  return format(new Date(iso), 'EEEE, MMM d', { locale: locale === 'es' ? es : enUS });
}

export function formatTimeLabel(iso: string): string {
  return format(new Date(iso), 'h:mm a');
}

export function formatDateTimeLabel(iso: string, locale: string): string {
  return `${formatDateLabel(iso, locale)} · ${formatTimeLabel(iso)}`;
}
