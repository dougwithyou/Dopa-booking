import { cookies } from 'next/headers';
import { VISITOR_COOKIE } from '@/lib/analytics/visitor';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { adminDb, applyDiscount, resolveDiscountCode } from '@/app/api/_lib/payments';
import { BookingFlow, type CheckoutOffer } from '@/components/booking/BookingFlow';
import { MetaPixel } from '@/components/landing/MetaPixel';
import type { AppLocale } from '@/i18n/routing';
import type { LandingPage, Location, Product } from '@/types/db';

export default async function BookPage({
  params: { locale, slug },
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams: { promo?: string };
}) {
  const supabase = await createServerSupabaseClient();

  const { data: page } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!page) {
    notFound();
  }

  const { data: rels } = await supabase
    .from('landing_page_locations')
    .select('location_id')
    .eq('landing_page_id', page.id);

  const locationIds = (rels ?? []).map((r) => r.location_id);

  let locations: Location[] = [];
  if (locationIds.length > 0) {
    const { data } = await supabase.from('locations').select('*').in('id', locationIds).eq('is_active', true);
    locations = data ?? [];
  }

  const promo = searchParams?.promo ?? null;

  // Funnel stat: someone opened the booking flow ("Book now" click).
  try {
    await supabase.from('page_views').insert({
      landing_page_id: page.id,
      promo_param: promo,
      locale,
      event: 'book_click',
      visitor_id: cookies().get(VISITOR_COOKIE)?.value ?? null,
    });
  } catch {
    // non-critical
  }

  const offer = await loadCheckoutOffer(page as LandingPage, promo);
  const { data: studio } = await supabase.from('studios').select('meta_pixel_id').eq('id', page.studio_id).maybeSingle();
  const pixelId = page.meta_pixel_id || studio?.meta_pixel_id || null;

  return (
    <>
      <MetaPixel
        pixelId={pixelId}
        events={[
          {
            name: 'InitiateCheckout',
            params: {
              value: Number((offer.sessionCents / 100).toFixed(2)),
              currency: offer.currency.toUpperCase(),
              content_ids: [page.id],
              content_type: 'product',
            },
          },
        ]}
      />
      <BookingFlow
      locale={locale as AppLocale}
      slug={slug}
      landingPageId={page.id}
      locations={locations}
      initialPromo={promo}
      offer={offer}
      />
    </>
  );
}

/**
 * What the checkout step shows in its ticket: the session price after any
 * discount (resolved exactly as /api/checkout will charge it — discount
 * codes aren't publicly readable, hence the service-role client) and the
 * extras on offer. Extras are the page's linked products; a page with none
 * linked offers every active product, matching the post-payment upsell page.
 */
async function loadCheckoutOffer(page: LandingPage, promo: string | null): Promise<CheckoutOffer> {
  const db = adminDb();
  const currency = (page.currency || 'usd').toLowerCase();
  const baseCents = page.base_price_cents ?? 0;

  let sessionCents = baseCents;
  let discount: CheckoutOffer['discount'] = null;
  try {
    const code = await resolveDiscountCode(db, { studioId: page.studio_id, promoParam: promo, landingPage: page });
    sessionCents = applyDiscount(baseCents, code);
    if (code) discount = { code: code.code, type: code.type, value: code.value, currency: code.currency };
  } catch (error) {
    console.error('[book] failed to resolve discount for ticket preview', error);
  }

  const { data: linked } = await db.from('landing_page_products').select('product_id').eq('landing_page_id', page.id);
  const linkedIds = ((linked as { product_id: string }[] | null) ?? []).map((r) => r.product_id);

  let query = db
    .from('products')
    .select('*')
    .eq('studio_id', page.studio_id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (linkedIds.length > 0) query = query.in('id', linkedIds);
  const { data: productRows } = await query;

  // One Stripe session = one currency, so only same-currency extras can join.
  const products = ((productRows as Product[] | null) ?? []).filter(
    (p) => p.price_cents > 0 && (p.currency || 'usd').toLowerCase() === currency
  );

  return {
    baseCents,
    sessionCents,
    currency,
    products,
    discount,
    people: {
      included_people: page.included_people,
      extra_person_price_cents: page.extra_person_price_cents,
      max_people: page.max_people,
    },
  };
}
