'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls } from './lib/ui';

const TEMPLATES = ['general', 'couples', 'family', 'quinceanera', 'senior', 'newborn', 'engagement'];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function NewLandingPageForm({ studioId }: { studioId: string }) {
  const [template, setTemplate] = useState('general');
  const [headline, setHeadline] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleHeadlineChange(v: string) {
    setHeadline(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) {
      setError('Slug is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('landing_pages')
      .insert({
        studio_id: studioId,
        slug: slugify(slug),
        template,
        status: 'draft',
        headline_en: headline.trim(),
        headline_es: '',
      })
      .select('id')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create landing page.');
      return;
    }
    router.push(`/admin/landing-pages/${data.id}/edit`);
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardCls} max-w-lg space-y-4`}>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className={labelCls}>Template / session type</label>
        <select className={selectCls} value={template} onChange={(e) => setTemplate(e.target.value)}>
          {TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Headline (English)</label>
        <input className={inputCls} value={headline} onChange={(e) => handleHeadlineChange(e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Slug</label>
        <input
          className={inputCls}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
        />
        <p className="mt-1 text-xs text-gray-500">The page will live at /{slug || '…'}</p>
      </div>

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Creating…' : 'Create draft'}
        </button>
        <button type="button" className={btnSecondary} onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
