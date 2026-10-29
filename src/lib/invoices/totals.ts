import type { InvoiceItem } from '@/types/db';

export const MAX_INVOICE_ITEMS = 30;

/** "#0042" */
export function invoiceNumberLabel(number: number): string {
  return `#${String(number).padStart(4, '0')}`;
}

export function lineTotalCents(item: InvoiceItem): number {
  return Math.max(0, Math.round(item.quantity)) * Math.max(0, Math.round(item.unit_cents));
}

export function subtotalCents(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0);
}

/** Subtotal minus discount, never negative. */
export function invoiceTotalCents(items: InvoiceItem[], discountCents: number): number {
  return Math.max(0, subtotalCents(items) - Math.max(0, Math.round(discountCents)));
}

/** Drops empty lines and normalizes numbers. */
export function cleanItems(items: InvoiceItem[]): InvoiceItem[] {
  return items
    .map((item) => ({
      description: item.description.trim(),
      quantity: Math.max(1, Math.round(item.quantity) || 1),
      unit_cents: Math.max(0, Math.round(item.unit_cents) || 0),
    }))
    .filter((item) => item.description !== '');
}
