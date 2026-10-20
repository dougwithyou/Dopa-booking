'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Booking, BookingStatus, PaymentMethod } from '@/types/db';
import { centsToDollarsInput, dollarsInputToCents, formatCents } from './lib/format';
import { btnDanger, btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls } from './lib/ui';

const CANCEL_ERRORS: Record<string, string> = {
  refund_failed: 'Stripe could not process the refund. Nothing was cancelled — try again, or cancel without refunding.',
  no_stripe_payment: 'There is no Stripe payment on this booking to refund.',
  stripe_not_connected: 'Stripe is not connected, so the refund cannot be issued.',
  already_cancelled: 'This booking is already cancelled.',
  unauthorized: 'Your session expired — sign in again.',
};

export default function BookingEditForm({
  booking,
  clientEmail,
  paidExtrasCents,
  hasStripeExtras,
}: {
  booking: Booking;
  clientEmail: string | null;
  /** Paid upsell orders on this booking (checkout extras + later purchases). */
  paidExtrasCents: number;
  hasStripeExtras: boolean;
}) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(booking.payment_method);
  const [amount, setAmount] = useState(centsToDollarsInput(booking.amount_cents));
  const [markPaid, setMarkPaid] = useState(!!booking.paid_at);
  const [adminNote, setAdminNote] = useState(booking.admin_note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Cancel dialog
  // Mirrors what the cancel route refunds: the booking's own Stripe payment
  // (checkout extras ride on it) plus any separately paid upsell purchases.
  const bookingPaidByStripe =
    booking.payment_method === 'stripe' && !!booking.paid_at && !!booking.stripe_payment_intent_id;
  const canRefund = bookingPaidByStripe || hasStripeExtras;
  const refundableCents = (bookingPaidByStripe ? booking.amount_cents : 0) + (hasStripeExtras ? paidExtrasCents : 0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refund, setRefund] = useState(canRefund);
  const [notify, setNotify] = useState(!!clientEmail);
  const [emailLocale, setEmailLocale] = useState<'es' | 'en'>('es');
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<string | null>(null);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refund: canRefund && refund, notify, locale: emailLocale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(CANCEL_ERRORS[data.error] ?? 'Could not cancel the booking. Try again.');
        return;
      }
      setCancelOpen(false);
      setCancelResult(
        [
          'Booking cancelled.',
          canRefund && refund ? `Refunded ${formatCents(data.refundedCents ?? 0)}.` : 'No refund issued.',
          notify && data.emailed ? `Cancellation email sent to ${clientEmail}.` : null,
        ]
          .filter(Boolean)
          .join(' ')
      );
      router.refresh();
    } catch {
      setError('Network error — check your connection and try again.');
    } finally {
      setCancelling(false);
    }
  }

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
    const paidWarning =
      booking.paid_at && booking.status !== 'cancelled'
        ? '\n\nThis booking is marked paid. Deleting does NOT refund or email the client — use "Cancel booking" for real clients.'
        : '';
    if (
      !confirm(
        `Permanently delete this booking from the system? Use this for test bookings. Its extras are deleted too and the time slot is freed. This cannot be undone.${paidWarning}`
      )
    )
      return;
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
      {cancelResult && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{cancelResult}</p>}
      {booking.status === 'cancelled' && (
        <p className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
          Cancelled{booking.cancelled_at ? ` on ${new Date(booking.cancelled_at).toLocaleDateString()}` : ''}
          {booking.refunded_at
            ? ` · refunded ${formatCents(booking.refund_amount_cents ?? 0)}`
            : ' · not refunded'}
          .
        </p>
      )}

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
            {/* Cancelling goes through "Cancel booking" (refund + client email). */}
            {booking.status === 'cancelled' && <option value="cancelled">Cancelled</option>}
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

      {cancelOpen && (
        <div className="space-y-4 rounded-lg border border-red-200 bg-red-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Cancel this booking?</h3>
          <p className="text-xs text-gray-600">The time slot goes back on sale.</p>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-medium text-gray-600">Refund</legend>
            {canRefund ? (
              <>
                <label className="flex items-start gap-2 text-sm text-gray-800">
                  <input type="radio" name="refund" checked={refund} onChange={() => setRefund(true)} className="mt-0.5" />
                  <span>
                    Yes, refund {formatCents(refundableCents)} to the client&apos;s card
                    {paidExtrasCents > 0 ? ' (session + extras)' : ''}
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-800">
                  <input type="radio" name="refund" checked={!refund} onChange={() => setRefund(false)} className="mt-0.5" />
                  <span>No, cancel without refunding</span>
                </label>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                No Stripe card payment on this booking{booking.payment_method !== 'stripe' ? ` (paid by ${booking.payment_method})` : ''}
                {' '}— refund it manually if needed.
              </p>
            )}
          </fieldset>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={notify} disabled={!clientEmail} onChange={(e) => setNotify(e.target.checked)} />
              Email the client {clientEmail ? `(${clientEmail})` : '(no email on file)'}
            </label>
            {notify && (
              <div className="ml-6 flex items-center gap-2 text-sm">
                <span className="text-xs text-gray-600">Language</span>
                <select
                  className={`${selectCls} w-auto`}
                  value={emailLocale}
                  onChange={(e) => setEmailLocale(e.target.value as 'es' | 'en')}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnDanger} onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : canRefund && refund ? 'Cancel & refund' : 'Cancel booking'}
            </button>
            <button type="button" className={btnSecondary} onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Keep booking
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <div className="flex flex-wrap gap-2">
          {booking.status !== 'cancelled' && !cancelOpen && (
            <button type="button" className={btnSecondary} onClick={() => setCancelOpen(true)}>
              <Ban className="h-3.5 w-3.5" /> Cancel booking
            </button>
          )}
          <button type="button" className={btnDanger} onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete booking
          </button>
        </div>
      </div>
    </form>
  );
}
