'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { btnPrimary, inputCls, labelCls } from '@/components/admin/lib/ui';

/**
 * Step 1 of password recovery: emails a reset link via Supabase Auth. The
 * link goes to /admin/auth/confirm, which signs the admin in and sends them
 * to /admin/reset-password to choose a new password.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/auth/confirm?next=/admin/reset-password`,
    });
    setLoading(false);
    // Rate limits are worth surfacing; anything else gets the same neutral
    // message so the form doesn't reveal which emails have an account.
    if (resetError && resetError.status === 429) {
      setError('Too many requests — wait a few minutes and try again.');
      return;
    }
    setSent(true);
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Reset your password</h1>

      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            If <span className="font-medium text-gray-900">{email.trim()}</span> has an admin account, we&apos;ve sent it
            a link to set a new password. Open it on this same device and browser.
          </p>
          <p className="text-xs text-gray-500">Didn&apos;t get it? Check spam, or wait a minute and try again.</p>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-gray-500">Enter your admin email and we&apos;ll send you a reset link.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={labelCls}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href="/admin/login" className="text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
