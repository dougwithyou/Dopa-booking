import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import type { Locale } from '@/types/db';
import {
  adminDb,
  confirmBooking,
  fetchBooking,
  nowIso,
  releaseHoldForSlot,
  type AdminDb,
} from '@/app/api/_lib/payments';

// Node runtime + no body parsing: `stripe.webhooks.constructEvent` must see the
// exact bytes Stripe signed, so the raw text is read straight off the request.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe
 *
 * Signature-verified Stripe webhook receiver.
 *
 * Connect note: events for charges made on a connected account arrive on the
 * platform endpoint with `event.account` set. Verification does not need the
 * account id — the platform's `STRIPE_WEBHOOK_SECRET` signs the delivery either
 * way. Which studio an event belongs to is resolved from the booking row
 * (`bookings.studio_id`), not from the event.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] signature verification failed', error);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const db = adminDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        await handleSessionCompleted(db, event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'checkout.session.expired': {
        await handleSessionExpired(db, event.data.object as Stripe.Checkout.Session);
        break;
      }
      default:
        // Everything else is ignored on purpose.
        break;
    }
  } catch (error) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // DB failure. Anything non-transient is logged for manual reconciliation.
    console.error('[stripe-webhook] handler failed', { type: event.type, id: event.id, error });
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

function metadataString(
  metadata: Stripe.Metadata | null | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id;
}

function localeFromMetadata(session: Stripe.Checkout.Session): Locale | undefined {
  const locale = metadataString(session.metadata, 'locale');
  return locale === 'en' || locale === 'es' ? locale : undefined;
}

async function handleSessionCompleted(
  db: AdminDb,
  session: Stripe.Checkout.Session
): Promise<void> {
  const type = metadataString(session.metadata, 'type');
  const bookingId =
    metadataString(session.metadata, 'bookingId') ?? session.client_reference_id ?? undefined;

  if (!type || !bookingId) {
    console.warn('[stripe-webhook] session without booking metadata', { sessionId: session.id });
    return;
  }

  // Delayed-notification payment methods complete the session while still
  // unpaid; wait for `async_payment_succeeded` in that case.
  if (session.payment_status === 'unpaid') {
    console.info('[stripe-webhook] session completed but unpaid — skipping', {
      sessionId: session.id,
    });
    return;
  }

  if (type === 'booking') {
    const result = await confirmBooking(db, {
      bookingId,
      paymentIntentId: paymentIntentId(session),
      checkoutSessionId: session.id,
      locale: localeFromMetadata(session),
    });
    console.info('[stripe-webhook] booking confirmed', {
      bookingId,
      alreadyConfirmed: result.alreadyConfirmed,
    });
    return;
  }

  if (type === 'upsell') {
    await markUpsellOrdersPaid(db, session, bookingId);
    return;
  }

  console.warn('[stripe-webhook] unknown metadata type', { type, sessionId: session.id });
}

async function markUpsellOrdersPaid(
  db: AdminDb,
  session: Stripe.Checkout.Session,
  bookingId: string
): Promise<void> {
  const patch = {
    status: 'paid' as const,
    stripe_payment_intent_id: paymentIntentId(session),
    stripe_checkout_session_id: session.id,
  };

  // Primary match: the rows we stamped with this session id at creation time.
  const { data: bySession, error: bySessionError } = await db
    .from('upsell_orders')
    .update(patch)
    .eq('stripe_checkout_session_id', session.id)
    .eq('status', 'pending')
    .select('id');
  if (bySessionError) throw bySessionError;

  if (Array.isArray(bySession) && bySession.length > 0) {
    console.info('[stripe-webhook] upsell orders paid', {
      bookingId,
      count: bySession.length,
    });
    return;
  }

  // Fallback: the explicit id list from metadata (session-id stamp may have
  // failed to write).
  const idList = metadataString(session.metadata, 'upsellOrderIds');
  if (idList) {
    const ids = idList.split(',').filter(Boolean);
    if (ids.length > 0) {
      const { data, error } = await db
        .from('upsell_orders')
        .update(patch)
        .in('id', ids)
        .eq('status', 'pending')
        .select('id');
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        console.info('[stripe-webhook] upsell orders paid via metadata ids', {
          bookingId,
          count: data.length,
        });
        return;
      }
    }
  }

  // Last resort: any still-pending order on the booking. Better to mark them
  // paid than to lose a paid order; logged loudly for reconciliation.
  const { data: byBooking, error: byBookingError } = await db
    .from('upsell_orders')
    .update(patch)
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .select('id');
  if (byBookingError) throw byBookingError;

  console.warn('[stripe-webhook] upsell orders resolved by booking id fallback', {
    bookingId,
    sessionId: session.id,
    count: Array.isArray(byBooking) ? byBooking.length : 0,
  });
}

/**
 * A Checkout Session that expired without payment leaves a `pending` booking
 * squatting on the slot (pending bookings make `slot_is_available()` false).
 * Cancel it and release the hold so the slot goes back on sale.
 */
async function handleSessionExpired(
  db: AdminDb,
  session: Stripe.Checkout.Session
): Promise<void> {
  const type = metadataString(session.metadata, 'type');
  const bookingId =
    metadataString(session.metadata, 'bookingId') ?? session.client_reference_id ?? undefined;
  if (!bookingId) return;

  if (type === 'upsell') {
    await db
      .from('upsell_orders')
      .update({ status: 'cancelled' })
      .eq('stripe_checkout_session_id', session.id)
      .eq('status', 'pending');
    return;
  }

  if (type !== 'booking') return;

  const booking = await fetchBooking(db, bookingId);
  if (!booking || booking.status !== 'pending') return;

  // Only cancel the booking this session actually belongs to.
  if (
    booking.stripe_checkout_session_id &&
    booking.stripe_checkout_session_id !== session.id
  ) {
    return;
  }

  await db
    .from('bookings')
    .update({
      status: 'cancelled',
      // Never clobber a note Doug wrote himself.
      ...(booking.admin_note ? {} : { admin_note: `Checkout session expired ${nowIso()}` }),
    })
    .eq('id', booking.id)
    .eq('status', 'pending');

  if (booking.slot_id) {
    await releaseHoldForSlot(db, booking.slot_id);
  }

  console.info('[stripe-webhook] pending booking cancelled after session expiry', {
    bookingId: booking.id,
  });
}
