import Link from 'next/link';
import { CalendarClock, DollarSign, Ticket, TrendingUp } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedBookings, getStudioId } from '@/components/admin/lib/data';
import {
  bookingsThisMonthCount,
  monthlyRevenue,
  revenueBySessionType,
  revenueThisMonth,
  topClients,
  upcomingSessionsCount,
} from '@/components/admin/lib/stats';
import { formatCents, formatDate } from '@/components/admin/lib/format';
import StatCard from '@/components/admin/StatCard';
import RevenueChart from '@/components/admin/charts/RevenueChart';
import SessionTypeChart from '@/components/admin/charts/SessionTypeChart';
import { cardCls } from '@/components/admin/lib/ui';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const bookings = await fetchEnrichedBookings(supabase, studioId);

  const revenue = monthlyRevenue(bookings, 12);
  const clients = topClients(bookings, 5);
  const bySessionType = revenueBySessionType(bookings);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">A snapshot of how the studio is doing right now.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={formatCents(revenueThisMonth(bookings))} icon={DollarSign} />
        <StatCard label="Bookings this month" value={String(bookingsThisMonthCount(bookings))} icon={Ticket} />
        <StatCard label="Upcoming sessions" value={String(upcomingSessionsCount(bookings))} icon={CalendarClock} />
        <StatCard
          label="Lifetime revenue"
          value={formatCents(bookings.filter((b) => b.status === 'confirmed').reduce((s, b) => s + b.amount_cents, 0))}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${cardCls} lg:col-span-2`}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Monthly revenue</h2>
          <RevenueChart data={revenue} />
        </div>

        <div className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top clients</h2>
            <Link href="/admin/crm" className="text-xs font-medium text-gray-500 hover:text-gray-900">
              View CRM
            </Link>
          </div>
          {clients.length === 0 ? (
            <p className="text-sm text-gray-500">No confirmed bookings yet.</p>
          ) : (
            <ul className="space-y-3">
              {clients.map((c) => (
                <li key={c.client_id}>
                  <Link
                    href={`/admin/crm/${c.client_id}`}
                    className="flex items-center justify-between gap-2 hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.bookingCount} booking{c.bookingCount === 1 ? '' : 's'} · last {formatDate(c.lastDate)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-gray-900">{formatCents(c.totalCents)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Most profitable session types</h2>
          <Link href="/admin/stats" className="text-xs font-medium text-gray-500 hover:text-gray-900">
            Full stats
          </Link>
        </div>
        {bySessionType.length === 0 ? (
          <p className="text-sm text-gray-500">No confirmed bookings yet.</p>
        ) : (
          <SessionTypeChart data={bySessionType} />
        )}
      </div>
    </div>
  );
}
