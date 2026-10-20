import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { connectedAccount, getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import type { UpsellOrder } from '@/types/db';
import {
  adminDb,
  fetchBooking,
  fetchClient,
  fetchLandingPage,
  fetchLocation,
  fetchSlot,
  fetchStudio,
  nowIso,
  releaseHoldForSlot,
} from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/bookings/[id]/cancel
 *
 * Same auth boundary as the other /api/admin routes: middleware skips
 * /api/*, so getStudioId() (signed-in studio admin) is the whole check, plus
 * the booking must belong to that studio.
 *
 * Body: { refund: boolean, notify: boolean, locale: 'en' | 'es' }
 *   refund — refund every Stripe payment on the booking: the booking's own
 *            payment (which includes checkout-step extras) and any separate
 *            post-payment upsell purchases. Full refunds only.
 *   notify — email the client (in `locale`) that the booking was cancelled.
 * 200: { ok: true, refundedCents, emailed }
 * 400: { error: 'invalid_request' | 'no_stripe_payment' | 'stripe_not_connected' }
 * 401: { error: 'unauthorized' }   404: { error: 'not_found' }
 * 409: { error: 'already_cancelled' }
 * 502: { error: 'refund_failed' } — nothing was cancelled; safe to retry
 */
const CancelSchema = z.object({
  refund: z.boolean(),
  notify: z.boolean(),
  locale: z.enum(['en', 'es']),
});

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  let studioId: string;
  try {
    studioId = await getStudioId(supabase);
  } catch {
    return jsonError(401, 'unauthorized');
  }

  let payload: z.infer<typeof CancelSchema>;
  try {
    payload = CancelSchema.parse(await request.json());
  } catch {
    return jsonError(400, 'invalid_request');
  }

  const db = adminDb();
  const booking = await fetchBooking(db, params.id);
  if (!booking || booking.studio_id !== studioId) return jsonError(404, 'not_found');
  if (booking.status === 'cancelled') return jsonError(409, 'already_cancelled');

  const { data: orderRows, error: ordersError } = await db
    .from('upsell_orders')
    .select('*')
    .eq('booking_id', booking.id)
    .eq('status', 'paid');
  if (ordersError) {
    console.error('[admin/cancel] failed to load upsell orders', ordersError);
    return jsonError(500, 'cancel_failed');
  }
  const paidOrders = (orderRows as UpsellOrder[] | null) ?? [];

  // ---- Refund (before touching the booking, so a failure changes nothing) --
  let refundedCents = 0;
  let firstRefundId: string | null = null;
  if (payload.refund) {
    const paymentIntents = new Set<string>();
    if (booking.payment_method === 'stripe' && booking.paid_at && booking.stripe_payment_intent_id) {
      paymentIntents.add(booking.stripe_payment_intent_id);
    }
    for (const order of paidOrders) {
      if (order.stripe_payment_intent_id) paymentIntents.add(order.stripe_payment_intent_id);
    }
    if (paymentIntents.size === 0) return jsonError(400, 'no_stripe_payment');

    const studio = await fetchStudio(db, booking.studio_id);
    if (!studio?.stripe_account_id) return jsonError(400, 'stripe_not_connected');

    const stripe = getStripe();
    for (const paymentIntent of paymentIntents) {
      try {
        const refund = await stripe.refunds.create(
          { payment_intent: paymentIntent, reason: 'requested_by_customer', metadata: { bookingId: booking.id } },
          // Idempotent per payment: a retry after a partial failure won't refund twice.
          { ...connectedAccount(studio.stripe_account_id), idempotencyKey: `cancel-refund-${paymentIntent}` }
        );
        refundedCents += refund.amount;
        firstRefundId ??= refund.id;
      } catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'charge_already_refunded') {
          continue;
        }
        console.error('[admin/cancel] Stripe refund failed', { bookingId: booking.id, paymentIntent, error });
        return jsonError(502, 'refund_failed');
      }
    }
  }

  // ---- Cancel ---------------------------------------------------------------
  const now = nowIso();
  const { error: updateError } = await db
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      ...(payload.refund
        ? { refunded_at: now, refund_amount_cents: refundedCents, stripe_refund_id: firstRefundId }
        : {}),
    })
    .eq('id', booking.id);
  if (updateError) {
    console.error('[admin/cancel] failed to cancel booking', updateError);
    return jsonError(500, 'cancel_failed');
  }

  if (payload.refund && paidOrders.length > 0) {
    await db
      .from('upsell_orders')
      .update({ status: 'cancelled', refunded_at: now })
      .in('id', paidOrders.map((o) => o.id));
  }
  // Drop any still-pending extras from an abandoned checkout.
  await db.from('upsell_orders').update({ status: 'cancelled' }).eq('booking_id', booking.id).eq('status', 'pending');

  if (booking.slot_id) {
    try {
      await releaseHoldForSlot(db, booking.slot_id);
    } catch (error) {
      console.error('[admin/cancel] failed to release hold', error);
    }
  }

  // ---- Email ------------------------------------------------------------------
  let emailed = false;
  if (payload.notify && booking.client_id) {
    const client = await fetchClient(db, booking.client_id);
    if (client) {
      try {
        const { sendBookingCancellation } = await import('@/lib/email');
        await sendBookingCancellation({
          client,
          landingPage: booking.landing_page_id ? await fetchLandingPage(db, booking.landing_page_id) : null,
          location: booking.location_id ? await fetchLocation(db, booking.location_id) : null,
          slot: booking.slot_id ? await fetchSlot(db, booking.slot_id) : null,
          locale: payload.locale,
          refund: payload.refund ? { amountCents: refundedCents, currency: booking.currency } : null,
        });
        emailed = true;
      } catch (error) {
        console.error('[admin/cancel] cancellation email failed', error);
      }
    }
  }

  return NextResponse.json({ ok: true, refundedCents, emailed });
}
