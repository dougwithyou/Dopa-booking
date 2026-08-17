import type { Locale } from '@/types/db';

/**
 * Resolve a bilingual `_en`/`_es` column pair for the active locale.
 * Falls back to the other locale when the primary is null/empty, and
 * finally to an empty string. This is what lets an admin leave one
 * language blank without breaking the page.
 */
export function pickText(
  locale: Locale,
  en: string | null | undefined,
  es: string | null | undefined
): string {
  const primary = locale === 'en' ? en : es;
  const fallback = locale === 'en' ? es : en;
  if (primary && primary.trim() !== '') return primary;
  if (fallback && fallback.trim() !== '') return fallback;
  return '';
}

/** Same as `pickText`, but returns `null` instead of `''` when nothing is set. */
export function pickOptional(
  locale: Locale,
  en: string | null | undefined,
  es: string | null | undefined
): string | null {
  const value = pickText(locale, en, es);
  return value === '' ? null : value;
}
