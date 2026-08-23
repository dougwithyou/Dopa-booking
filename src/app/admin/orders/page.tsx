import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId, fetchEnrichedUpsellOrders } from '@/components/admin/lib/data';
import OrdersManager from '@/components/admin/OrdersManager';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const orders = await fetchEnrichedUpsellOrders(supabase, studioId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Paid product upsells (photobooks, prints, etc.) waiting to be delivered.</p>
      </div>
      <OrdersManager initialOrders={orders} />
    </div>
  );
}
