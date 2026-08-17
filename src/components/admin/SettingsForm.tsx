'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Studio } from '@/types/db';
import { btnPrimary, cardCls, inputCls, labelCls } from './lib/ui';

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];

export default function SettingsForm({ studio }: { studio: Studio }) {
  const [name, setName] = useState(studio.name);
  const [contactEmail, setContactEmail] = useState(studio.contact_email ?? '');
  const [timezone, setTimezone] = useState(studio.timezone);
  const [metaPixelId, setMetaPixelId] = useState(studio.meta_pixel_id ?? '');
  const [holdMinutes, setHoldMinutes] = useState(String(studio.hold_duration_minutes));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

      <button type="submit" className={btnPrimary} disabled={saving}>
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
