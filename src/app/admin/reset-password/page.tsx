'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { btnPrimary, inputCls, labelCls } from '@/components/admin/lib/ui';

const MIN_LENGTH = 8;

/**
 * Step 2 of password recovery: the emailed link (via /admin/auth/confirm)
 * has signed the admin in; here they choose the new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const linkError = useSearchParams().get('error') === 'link';
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_LENGTH) {
      setError(`The new password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await createClient().auth.updateUser({ password: next });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  if (hasSession === null) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (!hasSession || linkError) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Link expired or invalid</h1>
        <p className="mb-6 text-sm text-gray-600">
          Reset links work once, for a limited time, and only on the device and browser where you requested them.
          Request a new one and open it right away.
        </p>
        <Link href="/admin/forgot-password" className={`${btnPrimary} w-full`}>
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Choose a new password</h1>
      <p className="mb-6 text-sm text-gray-500">You&apos;ll stay signed in after saving it.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>New password</label>
          <input
            type="password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            required
            className={inputCls}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">At least {MIN_LENGTH} characters.</p>
        </div>
        <div>
          <label className={labelCls}>Confirm new password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            className={inputCls}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
          {saving ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  );
}
