import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDiscountCodes, getLandingPages, getStudioId } from '@/components/admin/lib/data';
import DiscountCodesManager from '@/components/admin/DiscountCodesManager';

export const dynamic = 'force-dynamic';

export default async function DiscountCodesPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const [codes, landingPages] = await Promise.all([
    getDiscountCodes(supabase, studioId),
    getLandingPages(supabase, studioId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Discount codes</h1>
        <p className="text-sm text-gray-500">Promo codes clients can apply at checkout, or auto-apply on a page.</p>
      </div>
      <DiscountCodesManager studioId={studioId} initialCodes={codes} landingPages={landingPages} />
    </div>
  );
}
