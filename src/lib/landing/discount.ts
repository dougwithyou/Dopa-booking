import type { DiscountCode } from '@/types/db';

/** "15%" or "$20" — used on the closer section's ticket. */
export function formatDiscountValue(
  code: Pick<DiscountCode, 'type' | 'value' | 'currency'>
): string {
  if (code.type === 'percent') {
    return `${code.value}%`;
  }
  const amount = code.value / 100;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (code.currency || 'usd').toUpperCase(),
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
  return formatter.format(amount);
}
