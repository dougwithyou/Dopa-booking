import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedBookings, fetchEnrichedUpsellOrders, getLandingPages, getStudioId } from '@/components/admin/lib/data';
import {
  bookingsByHourOfDay,
  bookingsByLocation,
  conversionByLandingPage,
  monthlyRevenue,
  revenueBySessionType,
} from '@/components/admin/lib/stats';
import StatCard from '@/components/admin/StatCard';
import RevenueChart from '@/components/admin/charts/RevenueChart';
import SessionTypeChart from '@/components/admin/charts/SessionTypeChart';
import LocationChart from '@/components/admin/charts/LocationChart';
import HourChart from '@/components/admin/charts/HourChart';
import { cardCls, tableWrapCls, tdCls, thCls } from '@/components/admin/lib/ui';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);

  const [bookings, landingPages, upsellOrders] = await Promise.all([
    fetchEnrichedBookings(supabase, studioId),
    getLandingPages(supabase, studioId),
    fetchEnrichedUpsellOrders(supabase, studioId),
  ]);

  const landingPageIds = landingPages.map((lp) => lp.id);
  const { data: pageViews } = landingPageIds.length
    ? await supabase.from('page_views').select('landing_page_id').in('landing_page_id', landingPageIds)
    : { data: [] as { landing_page_id: string }[] };

  const viewsByPage: Record<string, number> = {};
  for (const pv of pageViews ?? []) {
    viewsByPage[pv.landing_page_id] = (viewsByPage[pv.landing_page_id] ?? 0) + 1;
  }

  const totalViews = Object.values(viewsByPage).reduce((s, n) => s + n, 0);
  const totalConfirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const overallRate = totalViews > 0 ? (totalConfirmed / totalViews) * 100 : 0;

  const conversion = conversionByLandingPage(bookings, viewsByPage, landingPages);
  const revenue = monthlyRevenue(bookings, 12, upsellOrders);
  const bySessionType = revenueBySessionType(bookings);
  const byLocation = bookingsByLocation(bookings);
  const byHour = bookingsByHourOfDay(bookings);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Stats &amp; analytics</h1>
        <p className="text-sm text-gray-500">Deeper trends across revenue, locations, and conversion.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Page views (tracked pages)" value={String(totalViews)} />
        <StatCard label="Confirmed bookings" value={String(totalConfirmed)} />
        <StatCard label="Overall conversion rate" value={`${overallRate.toFixed(1)}%`} />
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Monthly revenue (12 months)</h2>
        <RevenueChart data={revenue} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Revenue by session type</h2>
          {bySessionType.length === 0 ? (
            <p className="text-sm text-gray-500">No confirmed bookings yet.</p>
          ) : (
            <SessionTypeChart data={bySessionType} />
          )}
        </div>

        <div className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Most-requested locations</h2>
          {byLocation.length === 0 ? (
            <p className="text-sm text-gray-500">No bookings yet.</p>
          ) : (
            <LocationChart data={byLocation} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Most-requested time of day</h2>
          {byHour.length === 0 ? (
            <p className="text-sm text-gray-500">No bookings with a scheduled slot yet.</p>
          ) : (
            <HourChart data={byHour} />
          )}
        </div>

        <div className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Conversion by landing page</h2>
          {conversion.length === 0 ? (
            <p className="text-sm text-gray-500">No page views recorded yet.</p>
          ) : (
            <div className={tableWrapCls}>
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className={thCls}>Page</th>
                    <th className={thCls}>Views</th>
                    <th className={thCls}>Bookings</th>
                    <th className={thCls}>Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {conversion.map((c) => (
                    <tr key={c.landing_page_id}>
                      <td className={tdCls}>{c.label}</td>
                      <td className={tdCls}>{c.views}</td>
                      <td className={tdCls}>{c.bookings}</td>
                      <td className={tdCls}>{c.rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
