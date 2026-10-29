import 'server-only';
import { siteUrl } from '@/lib/stripe';
import type { Booking, Invoice, PaymentMethod } from '@/types/db';
import { adminDb, fetchLocation, fetchSlot, nowIso, type AdminDb } from '@/app/api/_lib/payments';

export function invoicePayUrl(invoice: Pick<Invoice, 'token' | 'locale'>): string {
  return `${siteUrl()}/${invoice.locale}/invoice/${invoice.token}`;
}

export async function fetchInvoice(db: AdminDb, id: string): Promise<Invoice | null> {
  const { data } = await db.from('invoices').select('*').eq('id', id).maybeSingle();
  return (data as Invoice | null) ?? null;
}

export async function fetchInvoiceByToken(db: AdminDb, token: string): Promise<Invoice | null> {
  if (!/^[0-9a-f]{20,64}$/i.test(token)) return null;
  const { data } = await db.from('invoices').select('*').eq('token', token).maybeSingle();
  return (data as Invoice | null) ?? null;
}

export async function nextInvoiceNumber(db: AdminDb, studioId: string): Promise<number> {
  const { data } = await db
    .from('invoices')
    .select('number')
    .eq('studio_id', studioId)
    .order('number', { ascending: false })
    .limit(1);
  return (((data as { number: number }[] | null) ?? [])[0]?.number ?? 0) + 1;
}

export type ReserveResult = { booking: Booking } | { error: 'slot_unavailable' };

/**
 * Takes a slot for an invoice: a `pending` booking (pending bookings make
 * slot_is_available() false, so landing pages show the time as taken)
 * that the payment later confirms. Insert-then-verify: if another
 * pending/confirmed booking for the slot is older, ours is cancelled.
 */
export async function reserveSlotForInvoice(
  db: AdminDb,
  params: {
    studioId: string;
    slotId: string;
    clientId: string;
    amountCents: number;
    currency: string;
    invoiceId: string;
    note: string;
  }
): Promise<ReserveResult> {
  const slot = await fetchSlot(db, params.slotId);
  if (!slot || slot.is_blocked) return { error: 'slot_unavailable' };
  const location = await fetchLocation(db, slot.location_id);
  if (!location || location.studio_id !== params.studioId) return { error: 'slot_unavailable' };

  const { data: free } = await db.rpc('slot_is_available', { p_slot_id: slot.id });
  if (free === false) return { error: 'slot_unavailable' };

  const { data, error } = await db
    .from('bookings')
    .insert({
      studio_id: params.studioId,
      location_id: slot.location_id,
      slot_id: slot.id,
      client_id: params.clientId,
      status: 'pending',
      amount_cents: params.amountCents,
      currency: params.currency,
      payment_method: 'stripe',
      created_by_admin: true,
      invoice_id: params.invoiceId,
      admin_note: params.note,
    })
    .select('*')
    .single();
  if (error) throw error;
  const booking = data as Booking;

  const { data: others } = await db
    .from('bookings')
    .select('id, created_at')
    .eq('slot_id', slot.id)
    .in('status', ['pending', 'confirmed'])
    .neq('id', booking.id);
  const mine = Date.parse(booking.created_at);
  const lost = ((others as { id: string; created_at: string }[] | null) ?? []).some((o) => {
    const theirs = Date.parse(o.created_at);
    return theirs < mine || (theirs === mine && o.id < booking.id);
  });
  if (lost) {
    await db.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    return { error: 'slot_unavailable' };
  }
  return { booking };
}

/**
 * Marks an invoice paid (Stripe webhook or manual "mark as paid"),
 * confirms its booking and sends the receipt + admin notification.
 * Idempotent: a second call for an already-paid invoice does nothing.
 */
export async function markInvoicePaid(
  db: AdminDb,
  invoiceId: string,
  payment: { method: PaymentMethod; paymentIntentId?: string | null; checkoutSessionId?: string | null }
): Promise<{ alreadyPaid: boolean }> {
  const paidAt = nowIso();
  const { data, error } = await db
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: paidAt,
      ...(payment.paymentIntentId ? { stripe_payment_intent_id: payment.paymentIntentId } : {}),
      ...(payment.checkoutSessionId ? { stripe_checkout_session_id: payment.checkoutSessionId } : {}),
    })
    .eq('id', invoiceId)
    .in('status', ['draft', 'sent'])
    .select('*');
  if (error) throw error;
  const invoice = ((data as Invoice[] | null) ?? [])[0];
  if (!invoice) return { alreadyPaid: true };

  if (invoice.booking_id) {
    await db
      .from('bookings')
      .update({
        status: 'confirmed',
        paid_at: paidAt,
        payment_method: payment.method,
        ...(payment.paymentIntentId ? { stripe_payment_intent_id: payment.paymentIntentId } : {}),
        ...(payment.checkoutSessionId ? { stripe_checkout_session_id: payment.checkoutSessionId } : {}),
      })
      .eq('id', invoice.booking_id)
      .neq('status', 'cancelled');
  }

  try {
    const slot = invoice.slot_id ? await fetchSlot(db, invoice.slot_id) : null;
    const location = invoice.location_id ? await fetchLocation(db, invoice.location_id) : null;
    const { sendInvoicePaidEmails } = await import('@/lib/email');
    await sendInvoicePaidEmails({ invoice, location, slot });
  } catch (err) {
    console.error('[invoices] paid emails failed', { invoiceId, err });
  }
  return { alreadyPaid: false };
}

/** Voids an unpaid invoice and cancels its booking, freeing the slot. */
export async function voidInvoice(db: AdminDb, invoice: Invoice): Promise<void> {
  await db.from('invoices').update({ status: 'void' }).eq('id', invoice.id).in('status', ['draft', 'sent']);
  if (invoice.booking_id) {
    await db
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: nowIso() })
      .eq('id', invoice.booking_id)
      .eq('status', 'pending');
  }
}

/** Emails the invoice to the client and marks it sent. */
export async function sendInvoice(db: AdminDb, invoice: Invoice): Promise<void> {
  const slot = invoice.slot_id ? await fetchSlot(db, invoice.slot_id) : null;
  const location = invoice.location_id ? await fetchLocation(db, invoice.location_id) : null;
  const { sendInvoiceEmail } = await import('@/lib/email');
  await sendInvoiceEmail({ invoice, location, slot, payUrl: invoicePayUrl(invoice) });
  await db
    .from('invoices')
    .update({ sent_at: nowIso(), ...(invoice.status === 'draft' ? { status: 'sent' } : {}) })
    .eq('id', invoice.id);
}

export { adminDb };
