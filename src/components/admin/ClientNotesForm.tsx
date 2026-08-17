'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { btnPrimary, textareaCls } from './lib/ui';

export default function ClientNotesForm({ clientId, initialNotes }: { clientId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error: updateError } = await supabase.from('clients').update({ notes: notes || null }).eq('id', clientId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <textarea
        className={textareaCls}
        rows={4}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Preferences, allergies, past conversations…"
      />
      <div className="flex items-center gap-2">
        <button className={btnPrimary} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save notes'}
        </button>
        {saved && <span className="text-xs text-emerald-600">Saved.</span>}
      </div>
    </div>
  );
}
