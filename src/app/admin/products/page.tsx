import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getProducts, getStudioId } from '@/components/admin/lib/data';
import ProductsManager from '@/components/admin/ProductsManager';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const products = await getProducts(supabase, studioId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500">Photobooks, prints, and other upsells offered after checkout.</p>
      </div>
      <ProductsManager studioId={studioId} initialProducts={products} />
    </div>
  );
}
