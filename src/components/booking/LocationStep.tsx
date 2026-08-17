'use client';

import { useTranslations } from 'next-intl';
import type { Location } from '@/types/db';
import { cn } from '@/lib/cn';

export function LocationStep({
  locations,
  selectedId,
  onSelect,
  onNext,
}: {
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  const t = useTranslations('booking.location');

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-black text-ink">{t('heading')}</h1>

      {locations.length === 0 ? (
        <p className="font-body text-sm text-ink/70">{t('empty')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {locations.map((location) => {
            const active = location.id === selectedId;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => onSelect(location.id)}
                className={cn(
                  'border px-5 py-4 text-left font-body transition-colors',
                  active ? 'border-clay bg-clay/5' : 'border-ink/15 hover:border-ink/35'
                )}
              >
                <div className="font-display text-base font-extrabold text-ink">{location.name}</div>
                {(location.address || location.city) && (
                  <div className="mt-1 text-sm text-ink/60">
                    {[location.address, location.city, location.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={!selectedId}
        onClick={onNext}
        className="mt-8 inline-flex items-center gap-2.5 bg-clay px-8 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('next')}
      </button>
    </div>
  );
}
