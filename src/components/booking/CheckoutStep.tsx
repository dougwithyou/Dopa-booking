'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Minus, Plus } from 'lucide-react';
import { pad2, useCountdown } from '@/lib/countdown';
import { formatCents } from '@/lib/formatMoney';
import type { HoldResponse } from '@/lib/booking/types';
import { Photo } from '@/components/landing/Photo';
import { productCopy } from '@/lib/products/copy';
import type { CheckoutOffer } from './BookingFlow';

const MAX_QUANTITY = 20;

export function CheckoutStep({
  hold,
  landingPageId,
  promoParam,
  locale,
  offer,
  onExpired,
}: {
  hold: HoldResponse;
  landingPageId: string;
  promoParam: string | null;
  locale: string;
  offer: CheckoutOffer;
  onExpired: () => void;
}) {
  const t = useTranslations('booking.checkout');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiredHandled = useRef(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function setQty(productId: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.min(MAX_QUANTITY, Math.max(0, qty)) }));
  }

  const cart = useMemo(
    () =>
      offer.products
        .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
        .filter((line) => line.quantity > 0),
    [offer.products, quantities]
  );
  const totalCents = offer.sessionCents + cart.reduce((sum, l) => sum + l.product.price_cents * l.quantity, 0);
  const money = (cents: number) => formatCents(cents, offer.currency, locale);

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
        body: JSON.stringify({
          holdId: hold.holdId,
          landingPageId,
          promoParam,
          locale,
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        }),
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

          {offer.products.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display text-xl font-black text-ink">{t('extrasTitle')}</h2>
              <p className="mt-1 max-w-lg font-body text-sm text-ink/60">{t('extrasSubtitle')}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {offer.products.map((product, i) => {
                  const qty = quantities[product.id] ?? 0;
                  const copy = productCopy(product, locale);
                  return (
                    <div
                      key={product.id}
                      className={`flex flex-col border bg-white/40 transition-colors ${
                        qty > 0 ? 'border-clay' : 'border-ink/10'
                      }`}
                    >
                      <Photo
                        src={product.images?.[0]?.url ?? null}
                        alt={copy.name}
                        seed={i + 5}
                        className="aspect-[4/3] w-full"
                      />
                      <div className="flex flex-1 flex-col p-4">
                        <div className="font-display text-base font-extrabold text-ink">{copy.name}</div>
                        {copy.description && (
                          <p className="mt-1 font-body text-sm text-ink/60">{copy.description}</p>
                        )}
                        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                          <span className="font-body text-sm font-semibold text-clay">{money(product.price_cents)}</span>
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => setQty(product.id, 1)}
                              className="inline-flex items-center gap-1.5 border border-ink/30 px-4 py-2 font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:border-clay hover:text-clay"
                            >
                              <Plus className="h-3.5 w-3.5" /> {t('add')}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="mr-1 inline-flex items-center gap-1 font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-clay">
                                <Check className="h-3.5 w-3.5" /> {t('added')}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(product.id, qty - 1)}
                                aria-label={t('remove')}
                                className="flex h-8 w-8 items-center justify-center border border-ink/20"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-5 text-center font-body text-sm tabular-nums">{qty}</span>
                              <button
                                type="button"
                                onClick={() => setQty(product.id, qty + 1)}
                                disabled={qty >= MAX_QUANTITY}
                                aria-label={t('add')}
                                className="flex h-8 w-8 items-center justify-center border border-ink/20 disabled:opacity-30"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-8 max-w-md border border-ink/10 bg-white/40 p-5">
            <h2 className="mb-3 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
              {t('ticketTitle')}
            </h2>
            <ul className="space-y-2 font-body text-sm text-ink">
              <li className="flex justify-between gap-4">
                <span>{t('session')}</span>
                <span className="tabular-nums">
                  {offer.sessionCents < offer.baseCents && (
                    <span className="mr-2 text-ink/40 line-through">{money(offer.baseCents)}</span>
                  )}
                  {money(offer.sessionCents)}
                </span>
              </li>
              {offer.sessionCents < offer.baseCents && (
                <li className="text-xs text-moss">{t('discount')}</li>
              )}
              {cart.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between gap-4">
                  <span>
                    {productCopy(product, locale).name}
                    {quantity > 1 && <span className="text-ink/50"> × {quantity}</span>}
                  </span>
                  <span className="tabular-nums">{money(product.price_cents * quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between gap-4 border-t border-ink/10 pt-3 font-display text-lg font-black text-ink">
              <span>{t('total')}</span>
              <span className="tabular-nums">{money(totalCents)}</span>
            </div>
          </section>

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
