'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import type { Product } from '@/types/db';
import { formatCents } from '@/lib/formatMoney';
import { Photo } from '@/components/landing/Photo';

export function UpsellGrid({
  locale,
  bookingId,
  products,
}: {
  locale: AppLocale;
  bookingId: string;
  products: Product[];
}) {
  const t = useTranslations('upsell');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [quantities]
  );

  function setQty(productId: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, qty) }));
  }

  async function handleContinue() {
    setError(null);
    setProcessing(true);
    try {
      const res = await fetch('/api/upsell-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, items, locale }),
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
      <h1 className="font-display text-3xl font-black text-ink">{t('title')}</h1>
      <p className="mt-2 max-w-lg font-body text-sm text-ink/60">{t('subtitle')}</p>

      {products.length === 0 ? (
        <p className="mt-10 font-body text-sm text-ink/70">{t('empty')}</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => {
            const qty = quantities[product.id] ?? 0;
            return (
              <div key={product.id} className="border border-ink/10 bg-white/30">
                <Photo
                  src={product.images?.[0]?.url ?? null}
                  alt={product.name}
                  seed={i + 5}
                  className="aspect-[4/3] w-full"
                />
                <div className="p-5">
                  <div className="font-display text-base font-extrabold text-ink">{product.name}</div>
                  {product.description && (
                    <p className="mt-1 font-body text-sm text-ink/60">{product.description}</p>
                  )}
                  <div className="mt-3 font-body text-sm font-semibold text-clay">
                    {formatCents(product.price_cents, product.currency, locale)}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/50">
                      {t('qty')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(product.id, qty - 1)}
                      disabled={qty === 0}
                      className="flex h-8 w-8 items-center justify-center border border-ink/20 font-body text-sm disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-body text-sm tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(product.id, qty + 1)}
                      className="flex h-8 w-8 items-center justify-center border border-ink/20 font-body text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-6 font-body text-sm text-wine">{error}</p>}

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={handleContinue}
          disabled={processing || items.length === 0}
          className="inline-flex items-center gap-2.5 bg-clay px-8 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40"
        >
          {processing ? t('processing') : t('continue')}
        </button>
        <Link
          href={`/booking/${bookingId}/confirmation`}
          className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ink/60 hover:text-ink"
        >
          {t('skip')}
        </Link>
      </div>
    </div>
  );
}
