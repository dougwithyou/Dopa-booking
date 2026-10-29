import 'server-only';
import { z } from 'zod';
import { MAX_INVOICE_ITEMS } from '@/lib/invoices/totals';

export const ItemSchema = z.object({
  description: z.string().trim().max(300),
  quantity: z.number().int().min(1).max(999),
  unit_cents: z.number().int().min(0).max(100_000_000),
});

/** Fields shared by create and update. */
export const InvoiceFieldsSchema = z.object({
  clientName: z.string().trim().max(200).nullish(),
  clientEmail: z.string().trim().email().max(320),
  clientPhone: z.string().trim().max(50).nullish(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).nullish(),
  items: z.array(ItemSchema).min(1).max(MAX_INVOICE_ITEMS),
  discountCents: z.number().int().min(0).max(100_000_000).default(0),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  locale: z.enum(['en', 'es']).default('es'),
});
