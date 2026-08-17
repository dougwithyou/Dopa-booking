import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedBookings, getStudioId, landingPageLabel } from '@/components/admin/lib/data';
import { badgeCls, cardCls, tableWrapCls, tdCls, thCls } from '@/components/admin/lib/ui';
import { formatCents, formatDate, formatTime } from '@/components/admin/lib/format';
import ClientNotesForm from '@/components/admin/ClientNotesForm';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: { clientId: string } }) {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);

  const { data: client } = await supabase.from('clients').select('*').eq('id', params.clientId).single();
  if (!client) notFound();

  const allBookings = await fetchEnrichedBookings(supabase, studioId);
  const bookings = allBookings.filter((b) => b.client_id === client.id);
  const lifetimeCents = bookings.filter((b) => b.status === 'confirmed').reduce((s, b) => s + b.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/crm" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> CRM
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">{client.name || client.email}</h1>
        <p className="text-sm text-gray-500">
          {client.email} {client.phone ? `· ${client.phone}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardCls}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Lifetime value</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{formatCents(lifetimeCents)}</div>
        </div>
        <div className={cardCls}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Total bookings</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{bookings.length}</div>
        </div>
        <div className={cardCls}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Client since</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{formatDate(client.created_at)}</div>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Notes</h2>
        <ClientNotesForm clientId={client.id} initialNotes={client.notes ?? ''} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Booking history</h2>
        <div className={tableWrapCls}>
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Session type</th>
                <th className={thCls}>Location</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className={tdCls}>
                    <Link href={`/admin/bookings/${b.id}/edit`} className="hover:underline">
                      {b.slot ? `${formatDate(b.slot.start_time)} · ${formatTime(b.slot.start_time)}` : formatDate(b.created_at)}
                    </Link>
                  </td>
                  <td className={tdCls}>{landingPageLabel(b.landing_page)}</td>
                  <td className={tdCls}>{b.location?.name || '—'}</td>
                  <td className={tdCls}>
                    <span className={badgeCls(b.status === 'confirmed' ? 'green' : b.status === 'pending' ? 'amber' : 'gray')}>
                      {b.status}
                    </span>
                  </td>
                  <td className={tdCls}>{formatCents(b.amount_cents, b.currency)}</td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td className={tdCls} colSpan={5}>
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
