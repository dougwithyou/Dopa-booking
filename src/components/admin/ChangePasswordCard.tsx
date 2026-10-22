'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { btnPrimary, cardCls, inputCls, labelCls } from './lib/ui';

const MIN_LENGTH = 8;

/**
 * Lets the signed-in admin change their Supabase Auth password. The current
 * password is re-checked first (a fresh sign-in with it) so an unattended,
 * logged-in browser can't be used to take over the account.
 */
export default function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.length < MIN_LENGTH) {
      setError(`The new password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    if (next === current) {
      setError('The new password must be different from the current one.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        setError('Your session expired — sign in again.');
        return;
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (verifyError) {
        setError('The current password is incorrect.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setCurrent('');
      setNext('');
      setConfirm('');
      setSuccess(true);
    } catch {
      setError('Network error — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardCls} space-y-4`}>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Change password</h2>
        <p className="mt-0.5 text-xs text-gray-500">Used to sign in to this admin panel.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Password updated. Use the new one next time you sign in.
        </p>
      )}

      <div>
        <label className={labelCls}>Current password</label>
        <input
          type="password"
          autoComplete="current-password"
          className={inputCls}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>New password</label>
          <input
            type="password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            className={inputCls}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-gray-500">At least {MIN_LENGTH} characters.</p>
        </div>
        <div>
          <label className={labelCls}>Confirm new password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={inputCls}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      <button type="submit" className={btnPrimary} disabled={saving}>
        <KeyRound className="h-4 w-4" /> {saving ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
