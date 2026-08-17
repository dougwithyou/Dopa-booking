'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DiscountCode, DiscountType, LandingPage } from '@/types/db';
import { landingPageLabel } from './lib/data';
import { formatDate } from './lib/format';
import { badgeCls, btnDanger, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls, tableWrapCls, tdCls, thCls } from './lib/ui';

interface CodeForm {
  code: string;
  type: DiscountType;
  value: string;
  expires_at: string;
  landing_page_id: string;
  promo_param: string;
  max_uses: string;
  is_active: boolean;
}

const emptyForm: CodeForm = {
  code: '',
  type: 'percent',
  value: '',
  expires_at: '',
  landing_page_id: '',
  promo_param: '',
  max_uses: '',
  is_active: true,
};

function toPayload(f: CodeForm, studioId?: string) {
  return {
    ...(studioId ? { studio_id: studioId } : {}),
    code: f.code.trim().toUpperCase(),
    type: f.type,
    value: Number(f.value) || 0,
    expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
    landing_page_id: f.landing_page_id || null,
    promo_param: f.promo_param.trim() || null,
    max_uses: f.max_uses ? Number(f.max_uses) : null,
    is_active: f.is_active,
  };
}

function fromCode(c: DiscountCode): CodeForm {
  return {
    code: c.code,
    type: c.type,
    value: String(c.value),
    expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    landing_page_id: c.landing_page_id ?? '',
    promo_param: c.promo_param ?? '',
    max_uses: c.max_uses !== null ? String(c.max_uses) : '',
    is_active: c.is_active,
  };
}

export default function DiscountCodesManager({
  studioId,
  initialCodes,
  landingPages,
}: {
  studioId: string;
  initialCodes: DiscountCode[];
  landingPages: LandingPage[];
}) {
  const [codes, setCodes] = useState(initialCodes);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CodeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CodeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    if (!createForm.code.trim()) {
      setError('Code is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('discount_codes')
      .insert(toPayload(createForm, studioId))
      .select('*')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create discount code.');
      return;
    }
    setCodes((prev) => [data, ...prev]);
    setCreateForm(emptyForm);
    setCreating(false);
    router.refresh();
  }

  function startEdit(c: DiscountCode) {
    setEditingId(c.id);
    setEditForm(fromCode(c));
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('discount_codes')
      .update(toPayload(editForm))
      .eq('id', id)
      .select('*')
      .single();
    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? 'Failed to update discount code.');
      return;
    }
    setCodes((prev) => prev.map((c) => (c.id === id ? data : c)));
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(c: DiscountCode) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('discount_codes')
      .update({ is_active: !c.is_active })
      .eq('id', c.id)
      .select('*')
      .single();
    if (!updateError && data) {
      setCodes((prev) => prev.map((x) => (x.id === c.id ? data : x)));
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount code?')) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('discount_codes').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setCodes((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  function renderFormFields(form: CodeForm, setForm: (f: CodeForm) => void) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Code</label>
          <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}>
            <option value="percent">Percent</option>
            <option value="fixed">Fixed ($ off, in cents-equivalent dollars)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Value {form.type === 'percent' ? '(0-100)' : '($)'}</label>
          <input
            type="number"
            className={inputCls}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Expires</label>
          <input
            type="date"
            className={inputCls}
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Auto-apply on page</label>
          <select
            className={inputCls}
            value={form.landing_page_id}
            onChange={(e) => setForm({ ...form, landing_page_id: e.target.value })}
          >
            <option value="">None</option>
            {landingPages.map((lp) => (
              <option key={lp.id} value={lp.id}>
                {landingPageLabel(lp)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Promo param (?promo=)</label>
          <input
            className={inputCls}
            value={form.promo_param}
            onChange={(e) => setForm({ ...form, promo_param: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Max uses</label>
          <input
            type="number"
            className={inputCls}
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
          />
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Active
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        {!creating && (
          <button className={btnPrimary} onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add discount code
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">New discount code</h3>
          {renderFormFields(createForm, setCreateForm)}
          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} disabled={saving} onClick={handleCreate}>
              {saving ? 'Saving…' : 'Create'}
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
              <th className={thCls}>Code</th>
              <th className={thCls}>Value</th>
              <th className={thCls}>Page</th>
              <th className={thCls}>Uses</th>
              <th className={thCls}>Expires</th>
              <th className={thCls}>Status</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {codes.map((c) =>
              editingId === c.id ? (
                <tr key={c.id} className="bg-gray-50">
                  <td className={tdCls} colSpan={7}>
                    {renderFormFields(editForm, setEditForm)}
                    <div className="mt-3 flex gap-2">
                      <button className={btnPrimary} disabled={saving} onClick={() => handleSaveEdit(c.id)}>
                        Save
                      </button>
                      <button className={btnSecondary} onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id}>
                  <td className={tdCls}>
                    <span className="font-mono font-medium text-gray-900">{c.code}</span>
                  </td>
                  <td className={tdCls}>{c.type === 'percent' ? `${c.value}%` : `$${c.value}`}</td>
                  <td className={tdCls}>{landingPageLabel(landingPages.find((lp) => lp.id === c.landing_page_id))}</td>
                  <td className={tdCls}>
                    {c.times_used}
                    {c.max_uses ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td className={tdCls}>{c.expires_at ? formatDate(c.expires_at) : 'Never'}</td>
                  <td className={tdCls}>
                    <button onClick={() => handleToggleActive(c)}>
                      <span className={badgeCls(c.is_active ? 'green' : 'gray')}>{c.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className={tdCls}>
                    <div className="flex justify-end gap-1">
                      <button className={btnGhost} onClick={() => startEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className={btnDanger} onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {codes.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={7}>
                  No discount codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
