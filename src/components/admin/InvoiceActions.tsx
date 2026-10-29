'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Check, Copy, Send } from 'lucide-react';
import type { InvoiceStatus } from '@/types/db';
import { btnDanger, btnSecondary } from './lib/ui';

export default function InvoiceActions({
  invoiceId,
  status,
  payUrl,
  sentAt,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  payUrl: string;
  sentAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = status === 'draft' || status === 'sent';

  async function run(action: string, body: Record<string, unknown>, confirmText?: string, done?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        setError('That didn’t work — refresh and try again.');
        return;
      }
      if (done) setMessage(done);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnSecondary}
          onClick={async () => {
            await navigator.clipboard.writeText(payUrl);
            setMessage('Payment link copied.');
          }}
        >
          <Copy className="h-4 w-4" /> Copy payment link
        </button>
        {open && (
          <>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy !== null}
              onClick={() => run('send', {}, undefined, 'Invoice emailed to the client.')}
            >
              <Send className="h-4 w-4" /> {busy === 'send' ? 'Sending…' : sentAt ? 'Resend email' : 'Email to client'}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy !== null}
              onClick={() =>
                run(
                  'mark_paid',
                  { method: 'cash' },
                  'Mark this invoice as paid outside Stripe (cash, Zelle…)? The session gets confirmed and the client receives a receipt.',
                  'Marked as paid.'
                )
              }
            >
              <Check className="h-4 w-4" /> Mark as paid
            </button>
            <button
              type="button"
              className={btnDanger}
              disabled={busy !== null}
              onClick={() =>
                run(
                  'void',
                  {},
                  'Void this invoice? The payment link stops working and the reserved time slot is released.',
                  'Invoice voided.'
                )
              }
            >
              <Ban className="h-4 w-4" /> Void
            </button>
          </>
        )}
      </div>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
