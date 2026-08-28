'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Studio } from '@/types/db';
import { SignaturePad, type SignaturePadHandle } from '@/components/contracts/SignaturePad';
import { uploadMedia } from './lib/storage';
import { btnPrimary, btnSecondary, cardCls, inputCls, labelCls } from './lib/ui';

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];

export default function SettingsForm({ studio }: { studio: Studio }) {
  const [name, setName] = useState(studio.name);
  const [contactEmail, setContactEmail] = useState(studio.contact_email ?? '');
  const [timezone, setTimezone] = useState(studio.timezone);
  const [metaPixelId, setMetaPixelId] = useState(studio.meta_pixel_id ?? '');
  const [holdMinutes, setHoldMinutes] = useState(String(studio.hold_duration_minutes));
  const [providerSignerName, setProviderSignerName] = useState(studio.provider_signer_name ?? '');
  const [providerSignatureUrl, setProviderSignatureUrl] = useState(studio.provider_signature_url ?? '');
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('upload');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  async function handleSignatureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingSignature(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const url = await uploadMedia(supabase, 'signatures', file, ext);
      setProviderSignatureUrl(url);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Signature upload failed.');
    } finally {
      setUploadingSignature(false);
    }
  }

  async function handleSaveDrawnSignature() {
    setError(null);
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError('Draw a signature first.');
      return;
    }
    const dataUrl = signaturePadRef.current.getDataUrl();
    if (!dataUrl) {
      setError('Draw a signature first.');
      return;
    }
    setUploadingSignature(true);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const supabase = createClient();
      const url = await uploadMedia(supabase, 'signatures', blob, 'png');
      setProviderSignatureUrl(url);
      signaturePadRef.current.clear();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Signature upload failed.');
    } finally {
      setUploadingSignature(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('studios')
      .update({
        name: name.trim(),
        contact_email: contactEmail.trim() || null,
        timezone,
        meta_pixel_id: metaPixelId.trim() || null,
        hold_duration_minutes: Number(holdMinutes) || 15,
        provider_signer_name: providerSignerName.trim() || null,
        provider_signature_url: providerSignatureUrl || null,
      })
      .eq('id', studio.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className={`${cardCls} space-y-4`}>
      <h2 className="text-sm font-semibold text-gray-900">Studio profile</h2>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>}

      <div>
        <label className={labelCls}>Studio name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Contact email</label>
        <input type="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Timezone</label>
          <select className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Hold duration (minutes)</label>
          <input
            type="number"
            min="1"
            className={inputCls}
            value={holdMinutes}
            onChange={(e) => setHoldMinutes(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Meta Pixel ID (studio-wide default)</label>
        <input className={inputCls} value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Contract signature</h3>
        <p className="mb-3 text-xs text-gray-500">
          Stamped on every contract PDF and shown to clients on the signing page, alongside their own signature.
        </p>

        <div className="mb-3">
          <label className={labelCls}>Signer name (e.g. &quot;Douglas Cárdenas — Hidopa Lab&quot;)</label>
          <input
            className={inputCls}
            value={providerSignerName}
            onChange={(e) => setProviderSignerName(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Signature image</label>
          {providerSignatureUrl && (
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL */}
              <img
                src={providerSignatureUrl}
                alt="Provider signature preview"
                className="h-16 max-w-[200px] rounded border border-gray-200 bg-white object-contain p-1"
              />
              <button type="button" className={btnSecondary} onClick={() => setProviderSignatureUrl('')}>
                Remove
              </button>
            </div>
          )}

          <div className="mb-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => setSignatureMode('upload')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                signatureMode === 'upload' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Upload image
            </button>
            <button
              type="button"
              onClick={() => setSignatureMode('draw')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                signatureMode === 'draw' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Draw signature
            </button>
          </div>

          {signatureMode === 'upload' ? (
            <div>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSignatureFile}
              />
              <button
                type="button"
                className={btnSecondary}
                disabled={uploadingSignature}
                onClick={() => signatureInputRef.current?.click()}
              >
                {uploadingSignature ? 'Uploading…' : providerSignatureUrl ? 'Replace image' : 'Upload signature image'}
              </button>
            </div>
          ) : (
            <div className="max-w-sm space-y-2">
              <SignaturePad ref={signaturePadRef} />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => signaturePadRef.current?.clear()}
                >
                  Clear
                </button>
                <button type="button" className={btnPrimary} disabled={uploadingSignature} onClick={handleSaveDrawnSignature}>
                  {uploadingSignature ? 'Saving…' : 'Use this drawing'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button type="submit" className={btnPrimary} disabled={saving}>
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
