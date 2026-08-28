'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { contractMarkdownToHtml } from '@/lib/contracts/markdown';
import { renderContractVariables } from '@/lib/contracts/template';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';

interface ContractData {
  id: string;
  title: string;
  content: string;
  status: 'sent' | 'signed';
  studioName: string;
  providerSignerName: string | null;
  providerSignatureUrl: string | null;
  clientName: string | null;
  clientEmail: string | null;
  signerName: string | null;
  signedAt: string | null;
  pdfUrl: string | null;
}

type ViewState = 'loading' | 'not_found' | 'void' | 'ready';

export function ContractSigningView({ token, locale }: { token: string; locale: string }) {
  const t = useTranslations('contracts');
  const [state, setState] = useState<ViewState>('loading');
  const [data, setData] = useState<ContractData | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [infoConfirmed, setInfoConfirmed] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedResult, setSignedResult] = useState<{ pdfUrl: string } | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/contracts/${token}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState('not_found');
          return;
        }
        const json = (await res.json()) as ContractData;
        if (cancelled) return;
        setData(json);
        if (json.clientName) setName(json.clientName);
        if (json.clientEmail) setEmail(json.clientEmail);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('not_found');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleConfirmInfo() {
    setIntakeError(null);
    if (!name.trim()) {
      setIntakeError(t('form.nameRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setIntakeError(t('form.emailRequired'));
      return;
    }
    setInfoConfirmed(true);
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError(t('form.nameRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('form.emailRequired'));
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      setError(t('form.signatureRequired'));
      return;
    }
    const signatureDataUrl = padRef.current.getDataUrl();
    if (!signatureDataUrl) {
      setError(t('form.signatureRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: name.trim(),
          signerEmail: email.trim(),
          signerIdNumber: idNumber.trim() || undefined,
          signatureDataUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error === 'already_signed' ? t('form.errorAlreadySigned') : t('form.errorGeneric'));
        setSubmitting(false);
        return;
      }
      setSignedResult({ pdfUrl: json.pdfUrl });
    } catch {
      setError(t('form.errorGeneric'));
      setSubmitting(false);
    }
  }

  if (state === 'loading') {
    return <p className="px-6 py-24 text-center font-body text-sm text-ink/60">{t('loading')}</p>;
  }
  if (state === 'not_found') {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-3 font-display text-2xl font-black text-ink">{t('notFound.title')}</h1>
        <p className="font-body text-sm text-ink/70">{t('notFound.body')}</p>
      </div>
    );
  }
  if (!data) return null;

  const isSigned = !!signedResult || data.status === 'signed';

  if (!isSigned && !infoConfirmed) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="mb-8 text-center">
          <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-clay">{data.studioName}</span>
          <h1 className="mt-2 font-display text-2xl font-black text-ink">{data.title}</h1>
          <p className="mt-3 font-body text-sm text-ink/70">{t('intake.subtitle')}</p>
        </div>

        <div className="mb-4">
          <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/50">
            {t('form.nameLabel')}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('form.namePlaceholder')}
            className="w-full border border-ink/20 bg-white px-3 py-2.5 font-body text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/50">
            {t('form.emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('form.emailPlaceholder')}
            className="w-full border border-ink/20 bg-white px-3 py-2.5 font-body text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>

        {intakeError && <p className="mb-4 font-body text-sm text-red-700">{intakeError}</p>}

        <button
          type="button"
          onClick={handleConfirmInfo}
          className="w-full bg-clay px-6 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine"
        >
          {t('intake.continue')}
        </button>
      </div>
    );
  }

  const displayName = (isSigned ? data.signerName : name) || data.clientName || '';
  const contentHtml = contractMarkdownToHtml(
    renderContractVariables(data.content, { clientName: displayName, studioName: data.studioName })
  );
  const finalPdfUrl = signedResult?.pdfUrl ?? (data.status === 'signed' ? data.pdfUrl : null);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 text-center">
        <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-clay">{data.studioName}</span>
        <h1 className="mt-2 font-display text-3xl font-black text-ink">{data.title}</h1>
      </div>

      <div
        className="space-y-4 font-body text-[15px] leading-relaxed text-ink/90 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-ink [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-ink [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {data.providerSignatureUrl && (
        <div className="mt-8 border-t border-ink/15 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL */}
          <img src={data.providerSignatureUrl} alt="" className="h-16 max-w-[220px] object-contain" />
          {data.providerSignerName && (
            <p className="mt-1 font-body text-xs text-ink/60">
              {t('providerSignedBy', { name: data.providerSignerName, studio: data.studioName })}
            </p>
          )}
        </div>
      )}

      {isSigned ? (
        <div className="mt-10 border-t border-ink/15 pt-8 text-center">
          <h2 className="mb-2 font-display text-xl font-black text-ink">
            {signedResult ? t('confirmationTitle') : t('signed.title')}
          </h2>
          <p className="mb-4 font-body text-sm text-ink/70">
            {signedResult
              ? t('confirmationBody')
              : t('signed.body', {
                  name: data.signerName ?? '',
                  date: data.signedAt ? new Date(data.signedAt).toLocaleDateString(locale) : '',
                })}
          </p>
          {finalPdfUrl && (
            <a
              href={finalPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-clay px-6 py-3 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine"
            >
              {signedResult ? t('download') : t('signed.download')}
            </a>
          )}
        </div>
      ) : (
        <div className="mt-10 border-t border-ink/15 pt-8">
          <h2 className="mb-4 font-display text-xl font-black text-ink">{t('form.heading')}</h2>

          <div className="mb-4 flex items-center justify-between border border-ink/15 bg-white px-3 py-2.5">
            <div>
              <div className="font-body text-sm text-ink">{name}</div>
              <div className="font-body text-xs text-ink/60">{email}</div>
            </div>
            <button
              type="button"
              onClick={() => setInfoConfirmed(false)}
              className="font-body text-xs font-semibold uppercase tracking-[0.1em] text-ink/50 underline-offset-4 hover:text-ink hover:underline"
            >
              {t('intake.edit')}
            </button>
          </div>

          <div className="mb-4">
            <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/50">
              {t('form.idLabel')}
            </label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder={t('form.idPlaceholder')}
              className="w-full border border-ink/20 bg-white px-3 py-2.5 font-body text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/50">
                {t('form.signatureLabel')}
              </label>
              <button
                type="button"
                onClick={() => padRef.current?.clear()}
                className="font-body text-xs font-semibold uppercase tracking-[0.1em] text-ink/50 underline-offset-4 hover:text-ink hover:underline"
              >
                {t('form.signatureClear')}
              </button>
            </div>
            <SignaturePad ref={padRef} />
          </div>

          <p className="mb-6 mt-3 font-body text-xs leading-relaxed text-ink/50">{t('form.disclaimer')}</p>

          {error && <p className="mb-4 font-body text-sm text-red-700">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-clay px-6 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('form.submitting') : t('form.submit')}
          </button>
        </div>
      )}
    </div>
  );
}
