import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDiscountCodes, getLocations, getProducts, getStudioId } from '@/components/admin/lib/data';
import LandingPageEditor from '@/components/admin/LandingPageEditor';

export const dynamic = 'force-dynamic';

export default async function EditLandingPagePage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);

  const { data: page } = await supabase.from('landing_pages').select('*').eq('id', params.id).single();
  if (!page) notFound();

  const [locations, products, discountCodes, { data: assignedLocations }, { data: assignedProducts }] = await Promise.all([
    getLocations(supabase, studioId),
    getProducts(supabase, studioId),
    getDiscountCodes(supabase, studioId),
    supabase.from('landing_page_locations').select('location_id').eq('landing_page_id', page.id),
    supabase.from('landing_page_products').select('product_id').eq('landing_page_id', page.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/landing-pages" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Landing pages
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Edit landing page</h1>
      </div>

      <LandingPageEditor
        page={page}
        locations={locations}
        products={products}
        discountCodes={discountCodes}
        initialLocationIds={(assignedLocations ?? []).map((r) => r.location_id)}
        initialProductIds={(assignedProducts ?? []).map((r) => r.product_id)}
      />
    </div>
  );
}
