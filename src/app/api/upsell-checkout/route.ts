import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type Stripe from 'stripe';
import { connectedAccount, getStripe, siteUrl } from '@/lib/stripe';
import type { Locale, Product, UpsellOrder } from '@/types/db';
import {
  adminDb,
  fetchBooking,
  fetchStudio,
  jsonError,
  type AdminDb,
} from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DISTINCT_ITEMS = 10;
const MAX_QUANTITY = 20;

const UpsellSchema = z.object({
  bookingId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      })
    )
    .min(1)
    .max(MAX_DISTINCT_ITEMS * 2),
  locale: z.enum(['en', 'es']),
});

/**
 * POST /api/upsell-checkout
 *
 * Body: { bookingId, items: [{ productId, quantity }], locale }
 * 200:  { url }
 *
 * Creates one `pending` upsell_orders row per line item and a single Checkout
 * Session on the studio's connected account. The webhook marks the rows `paid`.
 */
export async function POST(request: NextRequest) {
  let payload: z.infer<typeof UpsellSchema>;
  try {
    payload = UpsellSchema.parse(await request.json());
  } catch (error) {
    return jsonError(400, 'invalid_request', {
      details: error instanceof z.ZodError ? error.flatten() : undefined,
    });
  }

  const db = adminDb();
  const locale: Locale = payload.locale;

  try {
    const booking = await fetchBooking(db, payload.bookingId);
    if (!booking) {
      return jsonError(404, 'booking_not_found');
    }
    if (booking.status !== 'confirmed') {
      return jsonError(409, 'booking_not_confirmed');
    }

    const studio = await fetchStudio(db, booking.studio_id);
    if (!studio) {
      return jsonError(404, 'studio_not_found');
    }
    if (!studio.stripe_account_id) {
      return jsonError(400, 'stripe_not_connected');
    }
    const stripeAccountId = studio.stripe_account_id;

    // Merge duplicate product ids so the client can't sneak past MAX_QUANTITY
    // by repeating a line.
    const quantities = new Map<string, number>();
    for (const item of payload.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    if (quantities.size > MAX_DISTINCT_ITEMS) {
      return jsonError(400, 'too_many_items');
    }
    for (const [productId, quantity] of quantities) {
      if (quantity > MAX_QUANTITY) {
        quantities.set(productId, MAX_QUANTITY);
      }
    }

    const products = await fetchActiveProducts(db, studio.id, [...quantities.keys()]);
    if (products.length !== quantities.size) {
      return jsonError(400, 'invalid_products');
    }

    const currencies = new Set(products.map((p) => (p.currency || 'usd').toLowerCase()));
    if (currencies.size > 1) {
      return jsonError(400, 'mixed_currency');
    }
    const currency = [...currencies][0] ?? 'usd';

    const lines = products.map((product) => {
      const quantity = quantities.get(product.id) ?? 1;
      return { product, quantity, amountCents: product.price_cents * quantity };
    });

    const total = lines.reduce((sum, line) => sum + line.amountCents, 0);
    if (total <= 0) {
      return jsonError(400, 'invalid_products');
    }

    // ---- pending upsell_orders rows ---------------------------------------
    const { data: insertedOrders, error: insertError } = await db
      .from('upsell_orders')
      .insert(
        lines.map((line) => ({
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

    const orders = (insertedOrders as UpsellOrder[] | null) ?? [];
    const orderIds = orders.map((order) => order.id);

    const upsellUrl = `${siteUrl()}/${locale}/booking/${booking.id}/upsell`;
    const confirmationUrl = `${siteUrl()}/${locale}/booking/${booking.id}/confirmation`;

    const metadata: Stripe.MetadataParam = {
      type: 'upsell',
      bookingId: booking.id,
      studioId: studio.id,
      locale,
    };
    // Stripe caps a metadata value at 500 chars — only include the id list when
    // it fits. The webhook matches on the checkout session id anyway.
    const joinedOrderIds = orderIds.join(',');
    if (joinedOrderIds.length <= 450) {
      metadata.upsellOrderIds = joinedOrderIds;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      locale,
      client_reference_id: booking.id,
      line_items: lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency,
          unit_amount: line.product.price_cents,
          product_data: {
            name: truncate(line.product.name, 250),
            ...(line.product.description
              ? { description: truncate(line.product.description, 250) }
              : {}),
          },
        },
      })),
      metadata,
      payment_intent_data: {
        metadata: { type: 'upsell', bookingId: booking.id },
      },
      success_url: `${confirmationUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: upsellUrl,
    };

    let session: Stripe.Checkout.Session;
    try {
      session = await getStripe().checkout.sessions.create(
        sessionParams,
        connectedAccount(stripeAccountId)
      );
    } catch (error) {
      if (orderIds.length > 0) {
        await db.from('upsell_orders').update({ status: 'cancelled' }).in('id', orderIds);
      }
      console.error('[upsell-checkout] Stripe session creation failed', error);
      return jsonError(502, 'stripe_session_failed');
    }

    if (!session.url) {
      if (orderIds.length > 0) {
        await db.from('upsell_orders').update({ status: 'cancelled' }).in('id', orderIds);
      }
      console.error('[upsell-checkout] Stripe session has no url', { sessionId: session.id });
      return jsonError(502, 'stripe_session_failed');
    }

    if (orderIds.length > 0) {
      const { error: stampError } = await db
        .from('upsell_orders')
        .update({ stripe_checkout_session_id: session.id })
        .in('id', orderIds);
      if (stampError) {
        console.error('[upsell-checkout] failed to store checkout session id', stampError);
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[upsell-checkout] POST failed', error);
    return jsonError(500, 'upsell_checkout_failed');
  }
}

async function fetchActiveProducts(
  db: AdminDb,
  studioId: string,
  productIds: string[]
): Promise<Product[]> {
  if (productIds.length === 0) return [];
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('studio_id', studioId)
    .eq('is_active', true)
    .in('id', productIds);
  if (error) throw error;
  return (data as Product[] | null) ?? [];
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
