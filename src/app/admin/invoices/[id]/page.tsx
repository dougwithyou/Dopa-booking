import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { formatCents, formatDate, formatDateTime, formatTime } from '@/components/admin/lib/format';
import { badgeCls, cardCls } from '@/components/admin/lib/ui';
import InvoiceForm from '@/components/admin/InvoiceForm';
import InvoiceActions from '@/components/admin/InvoiceActions';
import { invoiceNumberLabel, lineTotalCents } from '@/lib/invoices/totals';
import { invoicePayUrl } from '@/lib/invoices/server';
import type { AvailabilitySlot, Invoice, Location } from '@/types/db';

export const dynamic = 'force-dynamic';

const STATUS_TONE = { draft: 'gray', sent: 'amber', paid: 'green', void: 'red' } as const;

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const { data } = await supabase.from('invoices').select('*').eq('id', params.id).eq('studio_id', studioId).maybeSingle();
  const invoice = data as Invoice | null;
  if (!invoice) notFound();

  const [{ data: slot }, { data: location }] = await Promise.all([
    invoice.slot_id
      ? supabase.from('availability_slots').select('*').eq('id', invoice.slot_id).maybeSingle()
      : Promise.resolve({ data: null }),
    invoice.location_id
      ? supabase.from('locations').select('*').eq('id', invoice.location_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const s = slot as AvailabilitySlot | null;
  const loc = location as Location | null;
  const slotLabel = s ? `${formatDate(s.start_time)} · ${formatTime(s.start_time)}${loc ? ` — ${loc.name}` : ''}` : null;
  const editable = invoice.status === 'draft' || invoice.status === 'sent';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/invoices" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Invoice {invoiceNumberLabel(invoice.number)}</h1>
          <span className={badgeCls(STATUS_TONE[invoice.status])}>{invoice.status}</span>
          <span className="text-lg font-semibold text-gray-900">{formatCents(invoice.total_cents, invoice.currency)}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {invoice.client_name || invoice.client_email}
          {invoice.sent_at && ` · emailed ${formatDateTime(invoice.sent_at)}`}
          {invoice.paid_at && ` · paid ${formatDateTime(invoice.paid_at)}`}
        </p>
      </div>

      <div className={`${cardCls} max-w-3xl space-y-3`}>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          payUrl={invoicePayUrl(invoice)}
          sentAt={invoice.sent_at}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href={invoicePayUrl(invoice)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900">
            <ExternalLink className="h-3.5 w-3.5" /> View client page
          </a>
          {invoice.booking_id && (
            <Link href={`/admin/bookings/${invoice.booking_id}/edit`} className="text-gray-600 hover:text-gray-900">
              Open booking{slotLabel ? ` (${slotLabel})` : ''}
            </Link>
          )}
        </div>
        {invoice.status === 'paid' && (
          <p className="text-xs text-gray-500">
            To refund a paid invoice, open its booking and use &ldquo;Cancel booking&rdquo; → refund.
          </p>
        )}
      </div>

      {editable ? (
        <InvoiceForm clients={[]} locations={[]} invoice={invoice} slotLabel={slotLabel} />
      ) : (
        <div className={`${cardCls} max-w-3xl space-y-2 text-sm`}>
          <div className="font-medium text-gray-900">{invoice.title}</div>
          {slotLabel && <div className="text-gray-600">{slotLabel}</div>}
          <ul className="divide-y divide-gray-100">
            {invoice.items.map((item, i) => (
              <li key={i} className="flex justify-between py-1.5">
                <span>
                  {item.description}
                  {item.quantity > 1 && <span className="text-gray-500"> × {item.quantity}</span>}
                </span>
                <span className="tabular-nums">{formatCents(lineTotalCents(item), invoice.currency)}</span>
              </li>
            ))}
          </ul>
          {invoice.discount_cents > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>−{formatCents(invoice.discount_cents, invoice.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCents(invoice.total_cents, invoice.currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
