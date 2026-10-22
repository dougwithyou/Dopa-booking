import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type Stripe from 'stripe';
import { APP_METADATA_KEY, APP_METADATA_VALUE, getStripe, siteUrl, studioStripeOptions } from '@/lib/stripe';
import type { Booking, Client, DiscountCode, LandingPage, Locale, Product, Studio, UpsellOrder } from '@/types/db';
import { productCopy } from '@/lib/products/copy';
import {
  adminDb,
  applyDiscount,
  confirmBooking,
  fetchHold,
  fetchLandingPage,
  isHoldLive,
  jsonError,
  resolveDiscountByCode,
  resolveDiscountCode,
  resolveSlotChain,
  upsertClient,
  type AdminDb,
} from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// `landing_pages.currency` is NOT NULL in the schema; this is only a
// belt-and-braces default for a hand-edited row.
const DEFAULT_CURRENCY = 'usd';

// Stripe's minimum Checkout Session lifetime (30 minutes).
const CHECKOUT_SESSION_TTL_SECONDS = 30 * 60;

// Same caps as /api/upsell-checkout.
const MAX_DISTINCT_ITEMS = 10;
const MAX_QUANTITY = 20;

const CheckoutSchema = z.object({
  holdId: z.string().uuid(),
  landingPageId: z.string().uuid(),
  promoParam: z.string().trim().max(120).nullish(),
  // Set when the client edited the discount on the checkout step: a code
  // they typed, or `noDiscount` after removing the auto-applied one.
  discountCode: z.string().trim().min(1).max(64).nullish(),
  noDiscount: z.boolean().optional(),
  locale: z.enum(['en', 'es']),
  // Optional extras picked on the checkout step, charged in the same session.
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      })
    )
    .max(MAX_DISTINCT_ITEMS * 2)
    .optional(),
});

/**
 * POST /api/checkout
 *
 * Body: { holdId, landingPageId, promoParam?, discountCode?, noDiscount?, locale, items?: [{ productId, quantity }] }
 * 200:  { url }                         — Stripe Checkout Session URL
 * 409:  { error: 'hold_expired' }       — hold released or past expires_at
 * 409:  { error: 'slot_unavailable' }   — slot got booked by someone else
 * 400:  { error: 'stripe_not_connected' } — studio has no connected account
 * 400:  { error: 'invalid_products' | 'too_many_items' | 'mixed_currency' }
 * 400:  { error: 'invalid_discount_code' } — typed code unknown/expired/used up
 *
 * Creates a `pending` booking (which makes `slot_is_available()` return false,
 * locking the slot for the duration of checkout) and then a Checkout Session
 * *on the studio's connected account*. The webhook flips the booking to
 * `confirmed` and releases the hold.
 *
 * Extras (`items`) become `pending` upsell_orders rows stamped with the same
 * Checkout Session and are added as extra line items; the webhook marks them
 * `paid` together with the booking (or `cancelled` if the session expires).
 */
export async function POST(request: NextRequest) {
  let payload: z.infer<typeof CheckoutSchema>;
  try {
    payload = CheckoutSchema.parse(await request.json());
  } catch (error) {
    return jsonError(400, 'invalid_request', {
      details: error instanceof z.ZodError ? error.flatten() : undefined,
    });
  }

  const db = adminDb();
  const locale: Locale = payload.locale;

  try {
    // ---- Hold must still be live -----------------------------------------
    const hold = await fetchHold(db, payload.holdId);
    if (!hold || !isHoldLive(hold)) {
      return jsonError(409, 'hold_expired');
    }

    const chain = await resolveSlotChain(db, hold.slot_id);
    if (!chain) {
      return jsonError(409, 'slot_unavailable');
    }
    const { slot, location, studio } = chain;

    if (slot.is_blocked) {
      return jsonError(409, 'slot_unavailable');
    }

    const landingPage = await fetchLandingPage(db, payload.landingPageId);
    if (!landingPage || landingPage.studio_id !== studio.id) {
      return jsonError(404, 'landing_page_not_found');
    }

    const stripeTarget = studioStripeOptions(studio.stripe_account_id);
    if (!stripeTarget) {
      return jsonError(400, 'stripe_not_connected');
    }

    if (!hold.client_email) {
      // Holds are always created with an email by POST /api/holds; a hold
      // without one can't be turned into a booking.
      return jsonError(409, 'hold_expired');
    }

    // ---- Pricing ----------------------------------------------------------
    const basePriceCents = landingPage.base_price_cents ?? 0;
    if (basePriceCents <= 0) {
      return jsonError(400, 'price_not_configured');
    }

    let discountCode: DiscountCode | null;
    if (payload.noDiscount) {
      discountCode = null;
    } else if (payload.discountCode) {
      discountCode = await resolveDiscountByCode(db, {
        studioId: studio.id,
        code: payload.discountCode,
        landingPageId: landingPage.id,
      });
      if (!discountCode) return jsonError(400, 'invalid_discount_code');
    } else {
      discountCode = await resolveDiscountCode(db, {
        studioId: studio.id,
        promoParam: payload.promoParam,
        landingPage,
      });
    }
    const amountCents = applyDiscount(basePriceCents, discountCode);
    const currency = (landingPage.currency || DEFAULT_CURRENCY).toLowerCase();

    // ---- Extras -------------------------------------------------------------
    const extras = await resolveExtras(db, studio.id, currency, payload.items ?? []);
    if ('error' in extras) {
      return jsonError(400, extras.error);
    }
    const extrasTotalCents = extras.lines.reduce((sum, line) => sum + line.amountCents, 0);

    // ---- Client (CRM) -----------------------------------------------------
    const client: Client = await upsertClient(db, {
      studioId: studio.id,
      email: hold.client_email,
      name: hold.client_name,
      phone: hold.client_phone,
    });

    // ---- Booking row ------------------------------------------------------
    // If a pending booking already exists for this slot from the same page and
    // client, this is a retry (user hit back, then re-submitted) — reuse it
    // instead of double-booking. Anything else on the slot means we lost.
    const existing = await findExistingBooking(db, slot.id);
    if (existing && (existing.status === 'confirmed' || existing.client_id !== client.id)) {
      return jsonError(409, 'slot_unavailable');
    }
    if (existing && existing.landing_page_id !== landingPage.id) {
      return jsonError(409, 'slot_unavailable');
    }

    const bookingPatch: Partial<Booking> = {
      studio_id: studio.id,
      landing_page_id: landingPage.id,
      location_id: location.id,
      slot_id: slot.id,
      client_id: client.id,
      status: 'pending',
      amount_cents: amountCents,
      currency,
      discount_code_id: discountCode?.id ?? null,
      payment_method: 'stripe',
      source_promo_param: payload.promoParam?.trim() || null,
      created_by_admin: false,
    };

    let booking: Booking;
    if (existing) {
      const { data, error } = await db
        .from('bookings')
        .update(bookingPatch)
        .eq('id', existing.id)
        .eq('status', 'pending')
        .select('*')
        .single();
      if (error) throw error;
      booking = data as Booking;
    } else {
      const { data, error } = await db.from('bookings').insert(bookingPatch).select('*').single();
      if (error) throw error;
      booking = data as Booking;

      // Insert-then-verify: if another pending/confirmed booking snuck in for
      // this slot, keep the oldest and cancel ours.
      if (await lostBookingRace(db, booking)) {
        await db.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
        return jsonError(409, 'slot_unavailable');
      }
    }

    // Clients who already added extras skip the post-payment upsell page.
    const successUrlBase =
      extras.lines.length > 0
        ? `${siteUrl()}/${locale}/booking/${booking.id}/confirmation`
        : `${siteUrl()}/${locale}/booking/${booking.id}/upsell`;
    const cancelUrl = `${siteUrl()}/${locale}/l/${landingPage.slug}`;

    // ---- Fully-discounted session: nothing to charge ----------------------
    // Stripe rejects a zero-amount Checkout Session, so a 100%-off code
    // confirms the booking straight away and sends the client to the same
    // success page the webhook would have taken them to.
    if (amountCents + extrasTotalCents <= 0) {
      await confirmBooking(db, { bookingId: booking.id, locale });
      return NextResponse.json({ url: successUrlBase });
    }

    // ---- pending upsell_orders for the extras -------------------------------
    let orderIds: string[] = [];
    if (extras.lines.length > 0) {
      const { data: insertedOrders, error: insertError } = await db
        .from('upsell_orders')
        .insert(
          extras.lines.map((line) => ({
            booking_id: booking.id,
            product_id: line.product.id,
            quantity: line.quantity,
            amount_cents: line.amountCents,
            currency,
            status: 'pending' as const,
          }))
        )
        .select('*');
      if (insertError) throw insertError;
      orderIds = ((insertedOrders as UpsellOrder[] | null) ?? []).map((order) => order.id);
    }

    const metadata: Stripe.MetadataParam = {
      type: 'booking',
      bookingId: booking.id,
      studioId: studio.id,
      locale,
      [APP_METADATA_KEY]: APP_METADATA_VALUE,
    };
    // Stripe caps a metadata value at 500 chars; the webhook matches on the
    // session id first anyway.
    const joinedOrderIds = orderIds.join(',');
    if (joinedOrderIds && joinedOrderIds.length <= 450) {
      metadata.upsellOrderIds = joinedOrderIds;
    }

    // A 100%-off session with paid extras: Stripe can't take a zero-amount
    // line, so only the extras are charged.
    const sessionLine: Stripe.Checkout.SessionCreateParams.LineItem[] =
      amountCents > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency,
                unit_amount: amountCents,
                product_data: {
                  name: sessionLineItemName(landingPage, locale),
                  description: sessionLineItemDescription(location.name, slot.start_time, studio, locale),
                },
              },
            },
          ]
        : [];

    // ---- Stripe Checkout Session (on the connected account) ---------------
    const stripe = getStripe();
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      locale,
      client_reference_id: booking.id,
      customer_email: client.email,
      line_items: [
        ...sessionLine,
        ...extras.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency,
            unit_amount: line.product.price_cents,
            product_data: {
              name: truncate(productCopy(line.product, locale).name, 250),
              ...descriptionParam(productCopy(line.product, locale).description),
            },
          },
        })),
      ],
      metadata,
      payment_intent_data: {
        metadata: {
          type: 'booking',
          bookingId: booking.id,
        },
      },
      success_url: `${successUrlBase}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      // Stripe's default session lifetime is 24h; a `pending` booking blocks
      // the slot for that whole window if the customer walks away. 30 minutes
      // is Stripe's minimum and is comfortably longer than a 15-minute hold —
      // `checkout.session.expired` then frees the slot.
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_SECONDS,
    };

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(
        sessionParams,
        stripeTarget.options
      );
    } catch (error) {
      // Don't leave a pending booking squatting on the slot if Stripe rejected us.
      if (orderIds.length > 0) {
        await db.from('upsell_orders').update({ status: 'cancelled' }).in('id', orderIds);
      }
      await db
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id)
        .eq('status', 'pending');
      console.error('[checkout] Stripe session creation failed', error);
      return jsonError(502, 'stripe_session_failed');
    }

    if (orderIds.length > 0) {
      const { error: orderStampError } = await db
        .from('upsell_orders')
        .update({ stripe_checkout_session_id: session.id })
        .in('id', orderIds);
      if (orderStampError) {
        console.error('[checkout] failed to stamp upsell orders with session id', orderStampError);
      }
    }

    if (!session.url) {
      console.error('[checkout] Stripe session has no url', { sessionId: session.id });
      return jsonError(502, 'stripe_session_failed');
    }

    const { error: stampError } = await db
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id);
    if (stampError) {
      // The session exists; log and continue — the webhook resolves the booking
      // by metadata.bookingId, not by this column.
      console.error('[checkout] failed to store checkout session id', stampError);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[checkout] POST failed', error);
    return jsonError(500, 'checkout_failed');
  }
}

async function findExistingBooking(db: AdminDb, slotId: string): Promise<Booking | null> {
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('slot_id', slotId)
    .in('status', ['pending', 'confirmed'])
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return ((data as Booking[] | null) ?? [])[0] ?? null;
}

/** Oldest pending/confirmed booking wins the slot; uuid tie-break. */
async function lostBookingRace(db: AdminDb, booking: Booking): Promise<boolean> {
  if (!booking.slot_id) return false;

  const { data, error } = await db
    .from('bookings')
    .select('id, created_at')
    .eq('slot_id', booking.slot_id)
    .in('status', ['pending', 'confirmed'])
    .neq('id', booking.id);
  if (error) throw error;

  const competitors = (data as { id: string; created_at: string }[] | null) ?? [];
  const mine = Date.parse(booking.created_at);

  return competitors.some((other) => {
    const theirs = Date.parse(other.created_at);
    if (theirs < mine) return true;
    if (theirs > mine) return false;
    return other.id < booking.id;
  });
}

function sessionLineItemName(landingPage: LandingPage, locale: Locale): string {
  const headline = locale === 'es' ? landingPage.headline_es : landingPage.headline_en;
  const fallback = locale === 'es' ? 'Sesión de fotos' : 'Photo session';
  const name = (headline || '').trim() || fallback;
  return name.length > 250 ? `${name.slice(0, 247)}...` : name;
}

function sessionLineItemDescription(
  locationName: string,
  startTime: string,
  studio: Studio,
  locale: Locale
): string {
  let when = startTime;
  try {
    when = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: studio.timezone || 'America/New_York',
    }).format(new Date(startTime));
  } catch {
    when = new Date(startTime).toISOString();
  }
  const description = `${locationName} — ${when}`;
  return description.length > 250 ? `${description.slice(0, 247)}...` : description;
}

type ExtraLine = { product: Product; quantity: number; amountCents: number };

/**
 * Validates the extras picked on the checkout step: merges duplicate ids,
 * caps quantities, and requires active products of this studio priced in
 * the booking's currency (one Checkout Session = one currency).
 */
async function resolveExtras(
  db: AdminDb,
  studioId: string,
  currency: string,
  items: { productId: string; quantity: number }[]
): Promise<{ lines: ExtraLine[] } | { error: 'invalid_products' | 'too_many_items' | 'mixed_currency' }> {
  if (items.length === 0) return { lines: [] };

  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, Math.min(MAX_QUANTITY, (quantities.get(item.productId) ?? 0) + item.quantity));
  }
  if (quantities.size > MAX_DISTINCT_ITEMS) return { error: 'too_many_items' };

  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('studio_id', studioId)
    .eq('is_active', true)
    .in('id', [...quantities.keys()]);
  if (error) throw error;
  const products = (data as Product[] | null) ?? [];
  if (products.length !== quantities.size || products.some((p) => p.price_cents <= 0)) {
    return { error: 'invalid_products' };
  }
  if (products.some((p) => (p.currency || DEFAULT_CURRENCY).toLowerCase() !== currency)) {
    return { error: 'mixed_currency' };
  }

  return {
    lines: products.map((product) => {
      const quantity = quantities.get(product.id) ?? 1;
      return { product, quantity, amountCents: product.price_cents * quantity };
    }),
  };
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function descriptionParam(description: string | null): { description?: string } {
  return description ? { description: truncate(description, 250) } : {};
}
