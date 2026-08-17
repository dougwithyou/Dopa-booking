import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UpsellGrid } from '@/components/booking/UpsellGrid';
import type { AppLocale } from '@/i18n/routing';

/**
 * Post-payment upsell page. `bookings` has no public SELECT RLS policy, so
 * we deliberately don't try to read the booking row here (only
 * service-role code, owned by the payments agent, can do that) — this
 * page trusts the `bookingId` route param (set by the Checkout success_url)
 * and lets `/api/upsell-checkout` validate it server-side.
 *
 * v1 simplification: products are a flat active-products list for the
 * studio rather than being scoped through `landing_page_products` to the
 * specific session type the client booked, since the shared success_url
 * contract (`/{locale}/booking/{bookingId}/upsell?session_id=...`) doesn't
 * carry the landing page slug through. Fine for a single-studio v1 — see
 * final report for the follow-up.
 */
export default async function UpsellPage({
  params: { locale, bookingId },
}: {
  params: { locale: string; bookingId: string };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen bg-parchment px-[6vw] py-16">
      <UpsellGrid locale={locale as AppLocale} bookingId={bookingId} products={products ?? []} />
    </main>
  );
}
