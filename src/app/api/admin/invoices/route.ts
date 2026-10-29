import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { cleanItems, invoiceNumberLabel, invoiceTotalCents, subtotalCents } from '@/lib/invoices/totals';
import { adminDb, nextInvoiceNumber, reserveSlotForInvoice, sendInvoice } from '@/lib/invoices/server';
import { jsonError, upsertClient } from '@/app/api/_lib/payments';
import type { Invoice } from '@/types/db';
import { InvoiceFieldsSchema } from './_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = InvoiceFieldsSchema.extend({
  slotId: z.string().uuid().nullish(),
  send: z.boolean().default(false),
});

/**
 * POST /api/admin/invoices — create an invoice (admin only; middleware
 * skips /api/*, so getStudioId() is the auth check). With a slot, a
 * pending booking reserves it right away. Optionally emails it.
 * 200: { id }   409: { error: 'slot_unavailable' }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  let studioId: string;
  try {
    studioId = await getStudioId(supabase);
  } catch {
    return jsonError(401, 'unauthorized');
  }

  let payload: z.infer<typeof CreateSchema>;
  try {
    payload = CreateSchema.parse(await request.json());
  } catch {
    return jsonError(400, 'invalid_request');
  }

  const items = cleanItems(payload.items);
  if (items.length === 0) return jsonError(400, 'invalid_request');
  const total = invoiceTotalCents(items, payload.discountCents);

  const db = adminDb();
  try {
    const client = await upsertClient(db, {
      studioId,
      email: payload.clientEmail,
      name: payload.clientName,
      phone: payload.clientPhone,
    });

    // Retry on a number collision (two invoices created at once).
    let invoice: Invoice | null = null;
    for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
      const number = await nextInvoiceNumber(db, studioId);
      const { data, error } = await db
        .from('invoices')
        .insert({
          studio_id: studioId,
          number,
          client_id: client.id,
          client_name: payload.clientName?.trim() || client.name,
          client_email: payload.clientEmail.trim().toLowerCase(),
          client_phone: payload.clientPhone?.trim() || client.phone,
          title: payload.title,
          notes: payload.notes?.trim() || null,
          items,
          discount_cents: Math.min(payload.discountCents, subtotalCents(items)),
          total_cents: total,
          currency: 'usd',
          status: 'draft',
          due_date: payload.dueDate ?? null,
          locale: payload.locale,
        })
        .select('*')
        .single();
      if (error && error.code !== '23505') throw error;
      invoice = (data as Invoice | null) ?? null;
    }
    if (!invoice) throw new Error('could not allocate an invoice number');

    if (payload.slotId) {
      const reserved = await reserveSlotForInvoice(db, {
        studioId,
        slotId: payload.slotId,
        clientId: client.id,
        amountCents: total,
        currency: invoice.currency,
        invoiceId: invoice.id,
        note: `Invoice ${invoiceNumberLabel(invoice.number)}`,
      });
      if ('error' in reserved) {
        await db.from('invoices').delete().eq('id', invoice.id);
        return jsonError(409, 'slot_unavailable');
      }
      const { data } = await db
        .from('invoices')
        .update({ booking_id: reserved.booking.id, slot_id: payload.slotId, location_id: reserved.booking.location_id })
        .eq('id', invoice.id)
        .select('*')
        .single();
      invoice = (data as Invoice | null) ?? invoice;
    }

    if (payload.send) await sendInvoice(db, invoice);
    return NextResponse.json({ id: invoice.id });
  } catch (error) {
    console.error('[admin/invoices] create failed', error);
    return jsonError(500, 'create_failed');
  }
}
