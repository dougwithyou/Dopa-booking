'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import type { AvailabilitySlot, Location } from '@/types/db';
import type { BookingStep, HoldResponse } from '@/lib/booking/types';
import { formatDateTimeLabel } from '@/lib/booking/format';
import { Stepper } from './Stepper';
import { LocationStep } from './LocationStep';
import { DateTimeStep } from './DateTimeStep';
import { ContactStep } from './ContactStep';
import { CheckoutStep } from './CheckoutStep';

export function BookingFlow({
  locale,
  slug,
  landingPageId,
  locations,
  initialPromo,
}: {
  locale: AppLocale;
  slug: string;
  landingPageId: string;
  locations: Location[];
  initialPromo: string | null;
}) {
  const t = useTranslations('booking');

  const [step, setStep] = useState<BookingStep>('location');
  const [locationId, setLocationId] = useState<string | null>(locations.length === 1 ? locations[0].id : null);
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [hold, setHold] = useState<HoldResponse | null>(null);
  const [dtRefreshToken, setDtRefreshToken] = useState(0);

  const selectedLocation = locations.find((l) => l.id === locationId) ?? null;

  return (
    <main className="min-h-screen bg-parchment px-[6vw] py-16">
      <Link
        href={`/l/${slug}`}
        className="mb-8 inline-block font-body text-xs font-semibold uppercase tracking-[0.14em] text-ink/50 hover:text-ink"
      >
        ← Dopa Studio
      </Link>

      <h1 className="sr-only">{t('title')}</h1>

      <Stepper
        current={step}
        labels={{
          location: t('steps.location'),
          datetime: t('steps.datetime'),
          contact: t('steps.contact'),
          checkout: t('steps.checkout'),
        }}
      />

      {(selectedLocation || slot) && step !== 'location' && (
        <div className="mb-8 flex flex-wrap gap-x-8 gap-y-1 border-b border-ink/10 pb-6 font-body text-sm text-ink/70">
          {selectedLocation && (
            <div>
              <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/40">
                {t('summary.location')}
              </span>
              {selectedLocation.name}
            </div>
          )}
          {slot && (
            <div>
              <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/40">
                {t('summary.when')}
              </span>
              {formatDateTimeLabel(slot.start_time, locale)}
            </div>
          )}
        </div>
      )}

      {step === 'location' && (
        <LocationStep
          locations={locations}
          selectedId={locationId}
          onSelect={setLocationId}
          onNext={() => locationId && setStep('datetime')}
        />
      )}

      {step === 'datetime' && locationId && (
        <DateTimeStep
          locationId={locationId}
          locale={locale}
          selectedSlotId={slot?.id ?? null}
          refreshToken={dtRefreshToken}
          onSelect={(s) => {
            setSlot(s);
            setStep('contact');
          }}
          onBack={() => setStep('location')}
        />
      )}

      {step === 'contact' && slot && (
        <ContactStep
          landingPageId={landingPageId}
          slotId={slot.id}
          onBack={() => setStep('datetime')}
          onHoldCreated={(h) => {
            setHold(h);
            setStep('checkout');
          }}
          onConflict={() => {
            setSlot(null);
            setDtRefreshToken((n) => n + 1);
            setStep('datetime');
          }}
        />
      )}

      {step === 'checkout' && hold && (
        <CheckoutStep
          hold={hold}
          landingPageId={landingPageId}
          promoParam={initialPromo}
          locale={locale}
          onExpired={() => {
            setHold(null);
            setSlot(null);
            setDtRefreshToken((n) => n + 1);
            setStep('datetime');
          }}
        />
      )}
    </main>
  );
}
