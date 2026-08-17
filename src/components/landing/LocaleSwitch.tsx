'use client';

import { Link, usePathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

/**
 * Minimal manual EN/ES toggle (bonus per spec — auto-detection via
 * middleware is the primary mechanism). Swaps the locale segment of the
 * current path, preserving the rest of it.
 */
export function LocaleSwitch({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  const other: AppLocale = locale === 'en' ? 'es' : 'en';
  return (
    <Link
      href={pathname}
      locale={other}
      className="border-l border-white/30 pl-4 no-underline transition-opacity hover:opacity-70"
      aria-label={other === 'en' ? 'Switch to English' : 'Cambiar a español'}
    >
      {other.toUpperCase()}
    </Link>
  );
}
