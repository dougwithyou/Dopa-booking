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

export function isDiscountUsable(code: DiscountCode, at: number = Date.now()): boolean {
  if (!code.is_active) return false;
  if (code.expires_at && Date.parse(code.expires_at) <= at) return false;
  if (code.max_uses !== null && code.times_used >= code.max_uses) return false;
  return true;
}

/** Apply a discount to a base amount in cents. Never returns a negative value. */
export function applyDiscount(baseCents: number, code: DiscountCode | null): number {
  if (!code) return Math.max(0, Math.round(baseCents));
  const base = Math.max(0, Math.round(baseCents));
  if (code.type === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(code.value)));
    return Math.max(0, base - Math.round((base * pct) / 100));
  }
  // 'fixed' — `value` is an amount in cents.
  const off = Math.max(0, Math.round(Number(code.value)));
  return Math.max(0, base - off);
}
