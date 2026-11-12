'use client';

import { useState } from 'react';

export interface SessionRequestCopy {
  sessionType: string;
  sessionTypePlaceholder: string;
  date: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
}

const field =
  'w-full border border-ink/20 bg-white/70 px-4 py-3 font-body text-sm text-ink placeholder:text-ink/40 focus:border-ink/60 focus:outline-none';
const label = 'mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60';

/** "Looking for a different session?" request form on the session catalog. */
export function SessionRequestForm({ locale, copy }: { locale: string; copy: SessionRequestCopy }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState('sending');
    try {
      const res = await fetch('/api/session-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: form.get('sessionType'),
          preferredDate: form.get('preferredDate') || null,
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          email: form.get('email'),
          phone: form.get('phone'),
          website: form.get('website'),
          locale: locale === 'en' ? 'en' : 'es',
        }),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return <p className="border border-moss/30 bg-moss/10 px-5 py-4 font-body text-sm text-ink">{copy.success}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={label} htmlFor="sr-type">
          {copy.sessionType}
        </label>
        <input id="sr-type" name="sessionType" required minLength={2} maxLength={200} placeholder={copy.sessionTypePlaceholder} className={field} />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="sr-date">
          {copy.date}
        </label>
        <input id="sr-date" name="preferredDate" type="date" min={new Date().toISOString().slice(0, 10)} className={field} />
      </div>
      <div>
        <label className={label} htmlFor="sr-first">
          {copy.firstName}
        </label>
        <input id="sr-first" name="firstName" required autoComplete="given-name" maxLength={100} className={field} />
      </div>
      <div>
        <label className={label} htmlFor="sr-last">
          {copy.lastName}
        </label>
        <input id="sr-last" name="lastName" required autoComplete="family-name" maxLength={100} className={field} />
      </div>
      <div>
        <label className={label} htmlFor="sr-email">
          {copy.email}
        </label>
        <input id="sr-email" name="email" type="email" required autoComplete="email" maxLength={320} className={field} />
      </div>
      <div>
        <label className={label} htmlFor="sr-phone">
          {copy.phone}
        </label>
        <input id="sr-phone" name="phone" type="tel" required minLength={7} autoComplete="tel" maxLength={40} className={field} />
      </div>
      {/* Honeypot: invisible to people; bots that fill it are ignored. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="w-full bg-clay px-8 py-4 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine disabled:opacity-60 sm:w-auto"
        >
          {state === 'sending' ? copy.sending : copy.submit}
        </button>
        {state === 'error' && <p className="mt-3 font-body text-sm text-wine">{copy.error}</p>}
      </div>
    </form>
  );
}
