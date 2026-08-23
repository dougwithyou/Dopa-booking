'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { EnrichedUpsellOrder } from './lib/data';
import { formatCents, formatDateTime } from './lib/format';
import { badgeCls, tableWrapCls, thCls, tdCls, btnGhost } from './lib/ui';

export default function OrdersManager({ initialOrders }: { initialOrders: EnrichedUpsellOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<'pending' | 'delivered' | 'all'>('pending');
  const router = useRouter();

  const visible = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'delivered') return orders.filter((o) => o.fulfilled_at);
    return orders.filter((o) => !o.fulfilled_at);
  }, [orders, filter]);

  async function toggleFulfilled(order: EnrichedUpsellOrder) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('upsell_orders')
      .update({ fulfilled_at: order.fulfilled_at ? null : new Date().toISOString() })
      .eq('id', order.id)
      .select('*')
      .single();
    if (!error && data) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, fulfilled_at: data.fulfilled_at } : o)));
      router.refresh();
    }
  }

  const pendingCount = orders.filter((o) => !o.fulfilled_at).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['pending', 'delivered', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? 'rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white'
                : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50'
            }
          >
            {f === 'pending' ? `To deliver (${pendingCount})` : f === 'delivered' ? 'Delivered' : 'All'}
          </button>
        ))}
      </div>

      <div className={tableWrapCls}>
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className={thCls}>Purchased</th>
              <th className={thCls}>Client</th>
              <th className={thCls}>Product</th>
              <th className={thCls}>Qty</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Status</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((o) => (
              <tr key={o.id}>
                <td className={tdCls}>{formatDateTime(o.created_at)}</td>
                <td className={tdCls}>
                  <div className="font-medium text-gray-900">{o.client?.name || o.client?.email || '—'}</div>
                  {o.client?.email && <div className="text-xs text-gray-500">{o.client.email}</div>}
                </td>
                <td className={tdCls}>{o.product?.name ?? '—'}</td>
                <td className={tdCls}>{o.quantity}</td>
                <td className={tdCls}>{formatCents(o.amount_cents, o.currency)}</td>
                <td className={tdCls}>
                  <span className={badgeCls(o.fulfilled_at ? 'green' : 'amber')}>
                    {o.fulfilled_at ? 'Delivered' : 'To deliver'}
                  </span>
                </td>
                <td className={tdCls}>
                  <button className={btnGhost} onClick={() => toggleFulfilled(o)}>
                    {o.fulfilled_at ? (
                      <>
                        <Package className="h-3.5 w-3.5" /> Mark not delivered
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark delivered
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={7}>
                  {filter === 'pending' ? 'Nothing waiting on delivery.' : 'No orders here.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
