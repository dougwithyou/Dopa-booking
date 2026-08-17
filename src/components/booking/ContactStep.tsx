'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { HoldResponse } from '@/lib/booking/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactStep({
  landingPageId,
  slotId,
  onBack,
  onHoldCreated,
  onConflict,
}: {
  landingPageId: string;
  slotId: string;
  onBack: () => void;
  onHoldCreated: (hold: HoldResponse) => void;
  onConflict: () => void;
}) {
  const t = useTranslations('booking.contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError(t('errorRequired'));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('errorEmail'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          landingPageId,
          clientName: name.trim(),
          clientEmail: email.trim(),
          clientPhone: phone.trim(),
        }),
      });

      if (res.status === 409) {
        setError(t('errorConflict'));
        setSubmitting(false);
        onConflict();
        return;
      }
      if (!res.ok) {
        setError(t('errorGeneric'));
        setSubmitting(false);
        return;
      }

      const hold = (await res.json()) as HoldResponse;
      onHoldCreated(hold);
    } catch {
      setError(t('errorGeneric'));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-black text-ink">{t('heading')}</h1>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <label className="block">
          <span className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60">
            {t('name')}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            className="w-full border border-ink/20 bg-white/40 px-4 py-3 font-body text-sm text-ink outline-none focus:border-clay"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60">
            {t('email')}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            className="w-full border border-ink/20 bg-white/40 px-4 py-3 font-body text-sm text-ink outline-none focus:border-clay"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60">
            {t('phone')}
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            className="w-full border border-ink/20 bg-white/40 px-4 py-3 font-body text-sm text-ink outline-none focus:border-clay"
          />
        </label>

        {error && <p className="font-body text-sm text-wine">{error}</p>}

        <div className="flex flex-wrap items-center gap-5 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2.5 bg-clay px-8 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ink/60 hover:text-ink"
          >
            ← {t('back')}
          </button>
        </div>
      </form>
    </div>
  );
}
