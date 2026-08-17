'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Booking, BookingStatus, PaymentMethod } from '@/types/db';
import { centsToDollarsInput, dollarsInputToCents } from './lib/format';
import { btnDanger, btnPrimary, cardCls, inputCls, labelCls, selectCls } from './lib/ui';

export default function BookingEditForm({ booking }: { booking: Booking }) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(booking.payment_method);
  const [amount, setAmount] = useState(centsToDollarsInput(booking.amount_cents));
  const [markPaid, setMarkPaid] = useState(!!booking.paid_at);
  const [adminNote, setAdminNote] = useState(booking.admin_note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status,
        payment_method: paymentMethod,
        amount_cents: dollarsInputToCents(amount || '0'),
        paid_at: markPaid ? booking.paid_at ?? new Date().toISOString() : null,
        admin_note: adminNote.trim() || null,
      })
      .eq('id', booking.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('Delete this booking? This cannot be undone.')) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('bookings').delete().eq('id', booking.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push('/admin/calendar');
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className={`${cardCls} max-w-2xl space-y-5`}>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Booking updated.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Amount (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Payment method</label>
          <select className={selectCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
            <option value="stripe">Stripe</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
        Paid {booking.paid_at && markPaid ? `(originally ${new Date(booking.paid_at).toLocaleDateString()})` : ''}
      </label>

      <div>
        <label className={labelCls}>Admin note</label>
        <input className={inputCls} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
      </div>

      <div className="flex items-center justify-between">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className={btnDanger} onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete booking
        </button>
      </div>
    </form>
  );
}
