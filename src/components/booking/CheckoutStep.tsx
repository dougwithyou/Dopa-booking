'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { pad2, useCountdown } from '@/lib/countdown';
import type { HoldResponse } from '@/lib/booking/types';

export function CheckoutStep({
  hold,
  landingPageId,
  promoParam,
  locale,
  onExpired,
}: {
  hold: HoldResponse;
  landingPageId: string;
  promoParam: string | null;
  locale: string;
  onExpired: () => void;
}) {
  const t = useTranslations('booking.checkout');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiredHandled = useRef(false);

  const handleExpire = useCallback(() => {
    if (expiredHandled.current) return;
    expiredHandled.current = true;
    // Best-effort release — the hold has already lapsed server-side by the
    // time expires_at passes, so this just tidies up promptly.
    fetch(`/api/holds/${hold.holdId}`, { method: 'DELETE' }).catch(() => {});
    onExpired();
  }, [hold.holdId, onExpired]);

  const { minutes, seconds, totalMs } = useCountdown(hold.expiresAt, handleExpire);
  const expired = totalMs <= 0;

  async function handleProceed() {
    setError(null);
    setProcessing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId: hold.holdId, landingPageId, promoParam, locale }),
      });
      if (!res.ok) {
        setError(t('errorGeneric'));
        setProcessing(false);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setError(t('errorGeneric'));
      setProcessing(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-black text-ink">{t('heading')}</h1>

      {expired ? (
        <div>
          <p className="mb-4 font-body text-sm text-wine">{t('expired')}</p>
          <button
            type="button"
            onClick={onExpired}
            className="border border-ink/30 px-6 py-3 font-body text-xs font-semibold uppercase tracking-[0.14em] hover:border-ink"
          >
            {t('chooseAgain')}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-8 inline-flex items-center gap-3 border border-clay/30 bg-clay/5 px-5 py-3">
            <span className="font-body text-xs uppercase tracking-[0.14em] text-ink/60">{t('holdNotice')}</span>
            <span className="font-display text-lg font-black tabular-nums text-clay">
              {pad2(minutes)}:{pad2(seconds)}
            </span>
          </div>

          {error && <p className="mb-4 font-body text-sm text-wine">{error}</p>}

          <button
            type="button"
            onClick={handleProceed}
            disabled={processing}
            className="inline-flex items-center gap-2.5 bg-clay px-8 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? t('processing') : t('proceed')}
          </button>
        </>
      )}
    </div>
  );
}
