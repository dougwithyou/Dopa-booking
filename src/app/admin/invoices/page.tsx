import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { formatCents, formatDate, formatTime } from '@/components/admin/lib/format';
import { badgeCls, btnPrimary, cardCls, tableWrapCls, tdCls, thCls } from '@/components/admin/lib/ui';
import { invoiceNumberLabel } from '@/lib/invoices/totals';
import type { AvailabilitySlot, Invoice } from '@/types/db';

export const dynamic = 'force-dynamic';

const STATUS_TONE = { draft: 'gray', sent: 'amber', paid: 'green', void: 'red' } as const;

export default async function InvoicesPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('studio_id', studioId)
    .order('number', { ascending: false });
  const invoices = (data as Invoice[] | null) ?? [];

  const slotIds = invoices.map((i) => i.slot_id).filter((v): v is string => Boolean(v));
  const { data: slotRows } = slotIds.length
    ? await supabase.from('availability_slots').select('*').in('id', slotIds)
    : { data: [] as AvailabilitySlot[] };
  const slots = new Map(((slotRows as AvailabilitySlot[] | null) ?? []).map((s) => [s.id, s]));

  const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + i.total_cents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">
            Bill clients directly for a session; they pay online from the link. Outstanding: {formatCents(outstanding)}
          </p>
        </div>
        <Link href="/admin/invoices/new" className={btnPrimary}>
          <Plus className="h-4 w-4" /> New invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className={cardCls}>
          <p className="text-sm text-gray-500">No invoices yet.</p>
        </div>
      ) : (
        <div className={tableWrapCls}>
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className={thCls}>#</th>
                <th className={thCls}>Client</th>
                <th className={thCls}>Session</th>
                <th className={thCls}>Total</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const slot = inv.slot_id ? slots.get(inv.slot_id) : null;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className={tdCls}>
                      <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-gray-900 hover:underline">
                        {invoiceNumberLabel(inv.number)}
                      </Link>
                    </td>
                    <td className={tdCls}>{inv.client_name || inv.client_email}</td>
                    <td className={tdCls}>
                      {inv.title}
                      {slot && (
                        <span className="text-gray-500">
                          {' '}
                          · {formatDate(slot.start_time)} {formatTime(slot.start_time)}
                        </span>
                      )}
                    </td>
                    <td className={tdCls}>{formatCents(inv.total_cents, inv.currency)}</td>
                    <td className={tdCls}>
                      <span className={badgeCls(STATUS_TONE[inv.status])}>{inv.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
