import 'server-only';
import { adminDb } from '@/app/api/_lib/payments';
import type { PixelEvent } from '@/components/landing/MetaPixel';

/**
 * Data for the Meta Pixel Purchase event on the post-payment pages (upsell
 * and confirmation), which can't read bookings under public RLS: the
 * pixel id of the booking's landing page (or the studio's default) and the
 * amount just paid (booking + extras bought in the same checkout). Only
 * these non-personal values leave the server.
 */
export async function purchasePixel(
  bookingId: string
): Promise<{ pixelId: string; events: PixelEvent[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return null;
  const db = adminDb();
  const { data: booking } = await db
    .from('bookings')
    .select('id, status, amount_cents, currency, landing_page_id, studio_id, stripe_checkout_session_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking || booking.status === 'cancelled') return null;

  const [{ data: page }, { data: studio }] = await Promise.all([
    booking.landing_page_id
      ? db.from('landing_pages').select('meta_pixel_id').eq('id', booking.landing_page_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from('studios').select('meta_pixel_id').eq('id', booking.studio_id).maybeSingle(),
  ]);
  const pixelId = page?.meta_pixel_id || studio?.meta_pixel_id || null;
  if (!pixelId) return null;

  let extrasCents = 0;
  if (booking.stripe_checkout_session_id) {
    const { data: extras } = await db
      .from('upsell_orders')
      .select('amount_cents')
      .eq('stripe_checkout_session_id', booking.stripe_checkout_session_id)
      .neq('status', 'cancelled');
    extrasCents = ((extras as { amount_cents: number }[] | null) ?? []).reduce((s, e) => s + e.amount_cents, 0);
  }

  return {
    pixelId,
    events: [
      {
        name: 'Purchase',
        params: {
          value: Number(((booking.amount_cents + extrasCents) / 100).toFixed(2)),
          currency: (booking.currency || 'usd').toUpperCase(),
          content_ids: [booking.id],
          content_type: 'product',
        },
        eventId: `purchase-${booking.id}`,
        onceKey: `purchase-${booking.id}`,
      },
    ],
  };
}
