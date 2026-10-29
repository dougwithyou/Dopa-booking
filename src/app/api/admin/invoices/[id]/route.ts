import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { cleanItems, invoiceTotalCents, subtotalCents } from '@/lib/invoices/totals';
import { adminDb, fetchInvoice, markInvoicePaid, sendInvoice, voidInvoice } from '@/lib/invoices/server';
import { jsonError } from '@/app/api/_lib/payments';
import { InvoiceFieldsSchema } from '../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update'), fields: InvoiceFieldsSchema }),
  z.object({ action: z.literal('send') }),
  z.object({ action: z.literal('mark_paid'), method: z.enum(['cash', 'other', 'stripe']) }),
  z.object({ action: z.literal('void') }),
]);

/**
 * POST /api/admin/invoices/[id] — { action: 'update' | 'send' | 'mark_paid' | 'void' }.
 * Paid and void invoices can't be edited, re-sent or voided (refund a
 * paid one from its booking instead).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  let studioId: string;
  try {
    studioId = await getStudioId(supabase);
  } catch {
    return jsonError(401, 'unauthorized');
  }

  let payload: z.infer<typeof ActionSchema>;
  try {
    payload = ActionSchema.parse(await request.json());
  } catch {
    return jsonError(400, 'invalid_request');
  }

  const db = adminDb();
  const invoice = await fetchInvoice(db, params.id);
  if (!invoice || invoice.studio_id !== studioId) return jsonError(404, 'not_found');
  if (invoice.status === 'paid' || invoice.status === 'void') return jsonError(409, `invoice_${invoice.status}`);

  try {
    switch (payload.action) {
      case 'update': {
        const f = payload.fields;
        const items = cleanItems(f.items);
        if (items.length === 0) return jsonError(400, 'invalid_request');
        const total = invoiceTotalCents(items, f.discountCents);
        await db
          .from('invoices')
          .update({
            client_name: f.clientName?.trim() || null,
            client_email: f.clientEmail.trim().toLowerCase(),
            client_phone: f.clientPhone?.trim() || null,
            title: f.title,
            notes: f.notes?.trim() || null,
            items,
            discount_cents: Math.min(f.discountCents, subtotalCents(items)),
            total_cents: total,
            due_date: f.dueDate ?? null,
            locale: f.locale,
          })
          .eq('id', invoice.id);
        if (invoice.booking_id) {
          await db.from('bookings').update({ amount_cents: total }).eq('id', invoice.booking_id);
        }
        break;
      }
      case 'send':
        await sendInvoice(db, invoice);
        break;
      case 'mark_paid':
        await markInvoicePaid(db, invoice.id, { method: payload.method });
        break;
      case 'void':
        await voidInvoice(db, invoice);
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/invoices] action failed', { action: payload.action, error });
    return jsonError(500, 'action_failed');
  }
}
