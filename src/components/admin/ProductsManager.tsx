'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Product, ProductImage } from '@/types/db';
import { uploadMedia } from './lib/storage';
import ImageUploadCrop from './ImageUploadCrop';
import { centsToDollarsInput, dollarsInputToCents, formatCents } from './lib/format';
import { badgeCls, btnDanger, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls, tableWrapCls, tdCls, textareaCls, thCls } from './lib/ui';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  images: ProductImage[];
}

const emptyForm: ProductForm = { name: '', description: '', price: '', is_active: true, images: [] };

function fromProduct(p: Product): ProductForm {
  return {
    name: p.name,
    description: p.description ?? '',
    price: centsToDollarsInput(p.price_cents),
    is_active: p.is_active,
    images: p.images ?? [],
  };
}

export default function ProductsManager({ studioId, initialProducts }: { studioId: string; initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleImageUpload(blob: Blob, target: 'create' | 'edit') {
    setUploading(true);
    try {
      const supabase = createClient();
      const url = await uploadMedia(supabase, 'products', blob);
      const newImage: ProductImage = { url, order: (target === 'create' ? createForm.images : editForm.images).length };
      if (target === 'create') setCreateForm((f) => ({ ...f, images: [...f.images, newImage] }));
      else setEditForm((f) => ({ ...f, images: [...f.images, newImage] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(target: 'create' | 'edit', idx: number) {
    if (target === 'create') setCreateForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    else setEditForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  async function handleCreate() {
    if (!createForm.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('products')
      .insert({
        studio_id: studioId,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        price_cents: dollarsInputToCents(createForm.price || '0'),
        currency: 'usd',
        images: createForm.images,
        is_active: createForm.is_active,
      })
      .select('*')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create product.');
      return;
    }
    setProducts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateForm(emptyForm);
    setCreating(false);
    router.refresh();
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditForm(fromProduct(p));
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('products')
      .update({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        price_cents: dollarsInputToCents(editForm.price || '0'),
        images: editForm.images,
        is_active: editForm.is_active,
      })
      .eq('id', id)
      .select('*')
      .single();
    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? 'Failed to update product.');
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? data : p)));
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(p: Product) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('products')
      .update({ is_active: !p.is_active })
      .eq('id', p.id)
      .select('*')
      .single();
    if (!updateError && data) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? data : x)));
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  function renderForm(form: ProductForm, setForm: (f: ProductForm) => void, target: 'create' | 'edit') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Price (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            className={textareaCls}
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Images</label>
          <div className="flex flex-wrap gap-2">
            {form.images.map((img, idx) => (
              <div key={img.url} className="relative h-16 w-16 overflow-hidden rounded-md border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(target, idx)}
                  className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <ImageUploadCrop aspect={1} label="Add photo" uploading={uploading} onCropped={(blob) => handleImageUpload(blob, target)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
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
            <Plus className="h-4 w-4" /> Add product
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">New product</h3>
          {renderForm(createForm, setCreateForm, 'create')}
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
              <th className={thCls}></th>
              <th className={thCls}>Name</th>
              <th className={thCls}>Price</th>
              <th className={thCls}>Status</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) =>
              editingId === p.id ? (
                <tr key={p.id} className="bg-gray-50">
                  <td className={tdCls} colSpan={5}>
                    {renderForm(editForm, setEditForm, 'edit')}
                    <div className="mt-3 flex gap-2">
                      <button className={btnPrimary} disabled={saving} onClick={() => handleSaveEdit(p.id)}>
                        Save
                      </button>
                      <button className={btnSecondary} onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td className={tdCls}>
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-100" />
                    )}
                  </td>
                  <td className={tdCls}>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.description && <div className="max-w-xs truncate text-xs text-gray-500">{p.description}</div>}
                  </td>
                  <td className={tdCls}>{formatCents(p.price_cents, p.currency)}</td>
                  <td className={tdCls}>
                    <button onClick={() => handleToggleActive(p)}>
                      <span className={badgeCls(p.is_active ? 'green' : 'gray')}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className={tdCls}>
                    <div className="flex justify-end gap-1">
                      <button className={btnGhost} onClick={() => startEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className={btnDanger} onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {products.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={5}>
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
