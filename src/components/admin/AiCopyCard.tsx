'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { LandingCopy } from '@/lib/landing/ai';
import { btnPrimary, cardCls, labelCls, textareaCls } from './lib/ui';

// Kept in sync with MAX_BRIEF_LENGTH in src/lib/landing/ai.ts (that module
// is server-only, so only its types can be imported here).
const MAX_BRIEF_LENGTH = 3000;

/**
 * "Fill with AI" box at the top of the landing page editor: the admin
 * writes a brief, Claude drafts every bilingual text field, and the result
 * lands in the editor's unsaved state for review — nothing is persisted
 * until the admin clicks Save.
 */
export default function AiCopyCard({
  template,
  hasExistingCopy,
  onApply,
}: {
  template: string;
  hasExistingCopy: boolean;
  onApply: (copy: LandingCopy) => void;
}) {
  const [brief, setBrief] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleGenerate() {
    if (!brief.trim()) return;
    if (hasExistingCopy && !window.confirm('This will replace the current texts (English and Spanish). Continue?')) {
      return;
    }
    setGenerating(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch('/api/admin/landing-pages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, template }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.copy) {
        setError(
          res.status === 401
            ? 'Your session expired — sign in again.'
            : 'The AI could not write the texts right now. Try again in a moment, or adjust the brief.'
        );
        return;
      }
      onApply(data.copy as LandingCopy);
      setDone(true);
    } catch {
      setError('Network error — check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className={`${cardCls} space-y-3 border-violet-200 bg-violet-50/40`}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <h2 className="text-sm font-semibold text-gray-900">Fill with AI</h2>
      </div>
      <div>
        <label className={labelCls}>Brief — what is this page about?</label>
        <textarea
          className={textareaCls}
          rows={4}
          maxLength={MAX_BRIEF_LENGTH}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="E.g. Christmas mini sessions for families with little kids, cozy indoor set with a tree and warm lights, 20-minute sessions, deposit to reserve, photos ready before Dec 20."
        />
        <p className="mt-1 text-xs text-gray-500">
          Writes every text on the page in English and Spanish. Include the real details you want mentioned (prices,
          dates, what&apos;s included) — the AI won&apos;t make them up. Review before saving.
        </p>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {done && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Texts filled in below. Review them, then click Save.
        </p>
      )}
      <button type="button" className={btnPrimary} onClick={handleGenerate} disabled={generating || !brief.trim()}>
        {generating ? 'Writing… (up to a minute)' : 'Generate texts'}
      </button>
    </div>
  );
}
