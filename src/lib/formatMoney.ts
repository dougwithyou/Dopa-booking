/** Format integer cents as a locale-aware currency string, e.g. 4500 -> "$45.00". */
export function formatCents(cents: number, currency: string, locale: string): string {
  const formatter = new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  });
  return formatter.format(cents / 100);
}
