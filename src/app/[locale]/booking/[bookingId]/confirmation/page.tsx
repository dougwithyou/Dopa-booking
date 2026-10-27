import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { MetaPixel } from '@/components/landing/MetaPixel';
import { purchasePixel } from '@/lib/booking/pixel';

/**
 * Simple bilingual "you're booked" confirmation. We don't have public read
 * access to the `bookings` row (no anon SELECT policy — by design, see
 * migration 0002), so this intentionally shows generic warm copy plus the
 * booking id from the route rather than booking details. The Meta Pixel
 * Purchase event gets only the pixel id and amount, resolved server-side.
 */
export default async function ConfirmationPage({
  params: { locale, bookingId },
}: {
  params: { locale: string; bookingId: string };
}) {
  const t = await getTranslations({ locale, namespace: 'confirmation' });
  const pixel = await purchasePixel(bookingId);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-parchment px-6 text-center">
      {pixel && <MetaPixel pixelId={pixel.pixelId} events={pixel.events} />}

      <span className="font-display text-sm font-black uppercase tracking-[0.14em] text-clay">Dopa Studio</span>
      <h1 className="font-display text-4xl font-black text-ink">{t('title')}</h1>
      <p className="max-w-md font-body text-sm leading-relaxed text-ink/70">{t('body')}</p>
      <p className="font-body text-xs uppercase tracking-[0.14em] text-ink/40">
        {t('bookingLabel')}: {bookingId}
      </p>

      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-2.5 bg-clay px-8 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine"
      >
        {t('backHome')}
      </Link>
    </main>
  );
}
