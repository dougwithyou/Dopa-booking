'use client';

import { useState } from 'react';

export function PayInvoiceButton({ token, label, processingLabel, errorLabel }: {
  token: string;
  label: string;
  processingLabel: string;
  errorLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function pay() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/invoices/${token}/checkout`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        if (data.error === 'invoice_paid' || data.error === 'invoice_void') {
          window.location.reload();
          return;
        }
        setError(true);
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={loading}
        className="w-full bg-clay px-8 py-4 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine disabled:opacity-60"
      >
        {loading ? processingLabel : label}
      </button>
      {error && <p className="mt-3 font-body text-sm text-wine">{errorLabel}</p>}
    </div>
  );
}
