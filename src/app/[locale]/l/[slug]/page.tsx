import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { LandingPageView } from '@/components/landing/LandingPageView';
import type { AppLocale } from '@/i18n/routing';
import type { DiscountCode, LandingPage } from '@/types/db';

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function getLandingPage(slug: string) {
  const supabase = await createServerSupabaseClient();
  const { data: page } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return { supabase, page };
}

/**
 * Resolves the discount code that should auto-apply on this page: a
 * `?promo=` search param takes priority (matched against
 * `discount_codes.promo_param`, scoped to this page's studio); otherwise
 * falls back to the page's own `discount_code_id`. RLS already restricts
 * reads to active, non-expired codes, so no extra filtering is needed here.
 */
async function resolveDiscount(
  supabase: SupabaseServerClient,
  page: LandingPage,
  promoParam: string | undefined
): Promise<DiscountCode | null> {
  if (promoParam) {
    const { data } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('studio_id', page.studio_id)
      .eq('promo_param', promoParam)
      .maybeSingle();
    if (data) return data;
  }
  if (page.discount_code_id) {
    const { data } = await supabase.from('discount_codes').select('*').eq('id', page.discount_code_id).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function generateMetadata({
  params: { slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const { page } = await getLandingPage(slug);
  if (!page) return {};
  const title = page.headline_en || page.headline_es || 'Dopa Studio';
  return { title: title.replace(/\*\*/g, '') };
}

export default async function LandingSlugPage({
  params: { locale, slug },
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams: { promo?: string };
}) {
  const { supabase, page } = await getLandingPage(slug);

  if (!page) {
    notFound();
  }

  const [{ data: studio }, discount] = await Promise.all([
    supabase.from('studios').select('name, meta_pixel_id').eq('id', page.studio_id).maybeSingle(),
    resolveDiscount(supabase, page, searchParams?.promo),
  ]);

  // Conversion-tracking beacon — best-effort, doesn't block the render.
  try {
    await supabase.from('page_views').insert({
      landing_page_id: page.id,
      promo_param: searchParams?.promo ?? null,
      locale,
    });
  } catch {
    // non-critical
  }

  const bookHref = searchParams?.promo
    ? `/${locale}/l/${slug}/book?promo=${encodeURIComponent(searchParams.promo)}`
    : `/${locale}/l/${slug}/book`;

  return (
    <LandingPageView
      page={page}
      locale={locale as AppLocale}
      studioName={studio?.name ?? 'Dopa Studio'}
      metaPixelId={page.meta_pixel_id ?? studio?.meta_pixel_id ?? null}
      discount={discount}
      bookHref={bookHref}
    />
  );
}
