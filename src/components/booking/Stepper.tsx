import { cn } from '@/lib/cn';
import type { BookingStep } from '@/lib/booking/types';

const ORDER: BookingStep[] = ['location', 'datetime', 'contact', 'checkout'];

export function Stepper({
  current,
  labels,
}: {
  current: BookingStep;
  labels: Record<BookingStep, string>;
}) {
  const currentIndex = ORDER.indexOf(current);
  return (
    <ol className="mb-10 flex flex-wrap items-center gap-x-3 gap-y-2 font-body text-[11px] uppercase tracking-[0.14em]">
      {ORDER.map((step, i) => (
        <li key={step} className="flex items-center gap-3">
          <span
            className={cn(
              'flex items-center gap-2',
              i === currentIndex ? 'text-clay' : i < currentIndex ? 'text-ink/50' : 'text-ink/30'
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                i === currentIndex
                  ? 'border-clay text-clay'
                  : i < currentIndex
                    ? 'border-ink/40 bg-ink/40 text-parchment'
                    : 'border-ink/20 text-ink/30'
              )}
            >
              {i + 1}
            </span>
            {labels[step]}
          </span>
          {i < ORDER.length - 1 && <span className="h-px w-6 bg-ink/15" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
