import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BookingFlow } from '@/components/booking/BookingFlow';
import type { AppLocale } from '@/i18n/routing';
import type { Location } from '@/types/db';

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
    .select('id, studio_id')
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

  return (
    <BookingFlow
      locale={locale as AppLocale}
      slug={slug}
      landingPageId={page.id}
      locations={locations}
      initialPromo={searchParams?.promo ?? null}
    />
  );
}
