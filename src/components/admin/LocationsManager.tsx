'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Location } from '@/types/db';
import { badgeCls, btnDanger, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls, tableWrapCls, tdCls, thCls } from './lib/ui';

interface LocationForm {
  name: string;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
}

const emptyForm: LocationForm = { name: '', address: '', city: '', state: '', is_active: true };

export default function LocationsManager({
  studioId,
  initialLocations,
}: {
  studioId: string;
  initialLocations: Location[];
}) {
  const [locations, setLocations] = useState(initialLocations);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<LocationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    if (!createForm.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('locations')
      .insert({
        studio_id: studioId,
        name: createForm.name.trim(),
        address: createForm.address.trim() || null,
        city: createForm.city.trim() || null,
        state: createForm.state.trim() || null,
        is_active: createForm.is_active,
      })
      .select('*')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create location.');
      return;
    }
    setLocations((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateForm(emptyForm);
    setCreating(false);
    router.refresh();
  }

  function startEdit(loc: Location) {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name,
      address: loc.address ?? '',
      city: loc.city ?? '',
      state: loc.state ?? '',
      is_active: loc.is_active,
    });
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('locations')
      .update({
        name: editForm.name.trim(),
        address: editForm.address.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
        is_active: editForm.is_active,
      })
      .eq('id', id)
      .select('*')
      .single();
    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? 'Failed to update location.');
      return;
    }
    setLocations((prev) => prev.map((l) => (l.id === id ? data : l)));
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(loc: Location) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('locations')
      .update({ is_active: !loc.is_active })
      .eq('id', loc.id)
      .select('*')
      .single();
    if (!updateError && data) {
      setLocations((prev) => prev.map((l) => (l.id === loc.id ? data : l)));
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this location? This cannot be undone.')) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('locations').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setLocations((prev) => prev.filter((l) => l.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        {!creating && (
          <button className={btnPrimary} onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add location
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">New location</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input
                className={inputCls}
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input
                className={inputCls}
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input
                className={inputCls}
                value={createForm.state}
                onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                placeholder="DC / MD / VA"
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={createForm.is_active}
              onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
            />
            Active
          </label>
          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} disabled={saving} onClick={handleCreate}>
              {saving ? 'Saving…' : 'Create location'}
            </button>
            <button
              className={btnSecondary}
              onClick={() => {
                setCreating(false);
                setCreateForm(emptyForm);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={tableWrapCls}>
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Address</th>
              <th className={thCls}>City / State</th>
              <th className={thCls}>Status</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {locations.map((loc) =>
              editingId === loc.id ? (
                <tr key={loc.id} className="bg-gray-50">
                  <td className={tdCls} colSpan={5}>
                    <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
                      <input
                        className={inputCls}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Name"
                      />
                      <input
                        className={inputCls}
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Address"
                      />
                      <input
                        className={inputCls}
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="City"
                      />
                      <input
                        className={inputCls}
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        />
                        Active
                      </label>
                      <div className="flex gap-2">
                        <button className={btnPrimary} disabled={saving} onClick={() => handleSaveEdit(loc.id)}>
                          Save
                        </button>
                        <button className={btnSecondary} onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={loc.id}>
                  <td className={tdCls}>
                    <div className="font-medium text-gray-900">{loc.name}</div>
                  </td>
                  <td className={tdCls}>{loc.address || '—'}</td>
                  <td className={tdCls}>
                    {[loc.city, loc.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className={tdCls}>
                    <button onClick={() => handleToggleActive(loc)}>
                      <span className={badgeCls(loc.is_active ? 'green' : 'gray')}>
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td className={tdCls}>
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/admin/locations/${loc.id}/availability`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <CalendarClock className="h-3.5 w-3.5" /> Set availability
                      </Link>
                      <button className={btnGhost} onClick={() => startEdit(loc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className={btnDanger} onClick={() => handleDelete(loc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {locations.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={5}>
                  No locations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
