'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DiscountCode, GalleryPhoto, LandingPage, LandingPageStatus, Location, Product } from '@/types/db';
import ImageUploadCrop from './ImageUploadCrop';
import { uploadMedia } from './lib/storage';
import { centsToDollarsInput, dollarsInputToCents } from './lib/format';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardCls,
  inputCls,
  labelCls,
  selectCls,
  textareaCls,
} from './lib/ui';

const MAX_GALLERY = 6;

interface EditorState {
  slug: string;
  template: string;
  status: LandingPageStatus;
  eyebrow_en: string;
  eyebrow_es: string;
  headline_en: string;
  headline_es: string;
  subheadline_en: string;
  subheadline_es: string;
  cta_primary_en: string;
  cta_primary_es: string;
  cta_secondary_en: string;
  cta_secondary_es: string;
  gallery_heading_en: string;
  gallery_heading_es: string;
  about_heading_en: string;
  about_heading_es: string;
  about_body_en: string;
  about_body_es: string;
  closer_heading_en: string;
  closer_heading_es: string;
  closer_body_en: string;
  closer_body_es: string;
  hero_image_url: string | null;
  gallery: GalleryPhoto[];
  base_price: string;
  currency: string;
  meta_pixel_id: string;
  discount_code_id: string;
}

function fromPage(p: LandingPage): EditorState {
  return {
    slug: p.slug,
    template: p.template,
    status: p.status,
    eyebrow_en: p.eyebrow_en ?? '',
    eyebrow_es: p.eyebrow_es ?? '',
    headline_en: p.headline_en ?? '',
    headline_es: p.headline_es ?? '',
    subheadline_en: p.subheadline_en ?? '',
    subheadline_es: p.subheadline_es ?? '',
    cta_primary_en: p.cta_primary_en ?? '',
    cta_primary_es: p.cta_primary_es ?? '',
    cta_secondary_en: p.cta_secondary_en ?? '',
    cta_secondary_es: p.cta_secondary_es ?? '',
    gallery_heading_en: p.gallery_heading_en ?? '',
    gallery_heading_es: p.gallery_heading_es ?? '',
    about_heading_en: p.about_heading_en ?? '',
    about_heading_es: p.about_heading_es ?? '',
    about_body_en: p.about_body_en ?? '',
    about_body_es: p.about_body_es ?? '',
    closer_heading_en: p.closer_heading_en ?? '',
    closer_heading_es: p.closer_heading_es ?? '',
    closer_body_en: p.closer_body_en ?? '',
    closer_body_es: p.closer_body_es ?? '',
    hero_image_url: p.hero_image_url,
    gallery: [...(p.gallery ?? [])].sort((a, b) => a.order - b.order),
    base_price: centsToDollarsInput(p.base_price_cents),
    currency: p.currency || 'usd',
    meta_pixel_id: p.meta_pixel_id ?? '',
    discount_code_id: p.discount_code_id ?? '',
  };
}

function PairedRow({
  label,
  enValue,
  esValue,
  onEnChange,
  onEsChange,
  textarea = false,
}: {
  label: string;
  enValue: string;
  esValue: string;
  onEnChange: (v: string) => void;
  onEsChange: (v: string) => void;
  textarea?: boolean;
}) {
  const cls = textarea ? textareaCls : inputCls;
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[10px] font-semibold uppercase text-gray-400">EN</span>
          {textarea ? (
            <textarea className={cls} rows={3} value={enValue} onChange={(e) => onEnChange(e.target.value)} />
          ) : (
            <input className={cls} value={enValue} onChange={(e) => onEnChange(e.target.value)} />
          )}
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-semibold uppercase text-gray-400">ES</span>
          {textarea ? (
            <textarea className={cls} rows={3} value={esValue} onChange={(e) => onEsChange(e.target.value)} />
          ) : (
            <input className={cls} value={esValue} onChange={(e) => onEsChange(e.target.value)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPageEditor({
  page,
  locations,
  products,
  discountCodes,
  initialLocationIds,
  initialProductIds,
}: {
  page: LandingPage;
  locations: Location[];
  products: Product[];
  discountCodes: DiscountCode[];
  initialLocationIds: string[];
  initialProductIds: string[];
}) {
  const [state, setState] = useState<EditorState>(fromPage(page));
  const [locationIds, setLocationIds] = useState<string[]>(initialLocationIds);
  const [productIds, setProductIds] = useState<string[]>(initialProductIds);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function set<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function toggleLocation(id: string) {
    setLocationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleProduct(id: string) {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleHeroUpload(blob: Blob) {
    setUploadingHero(true);
    setError(null);
    try {
      const supabase = createClient();
      const url = await uploadMedia(supabase, 'hero', blob);
      set('hero_image_url', url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hero upload failed.');
    } finally {
      setUploadingHero(false);
    }
  }

  async function handleGalleryUpload(blob: Blob) {
    if (state.gallery.length >= MAX_GALLERY) return;
    setUploadingGallery(true);
    setError(null);
    try {
      const supabase = createClient();
      const url = await uploadMedia(supabase, 'gallery', blob);
      const newItem: GalleryPhoto = { url, tag_en: '', tag_es: '', order: state.gallery.length };
      set('gallery', [...state.gallery, newItem]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gallery upload failed.');
    } finally {
      setUploadingGallery(false);
    }
  }

  function updateGalleryItem(idx: number, patch: Partial<GalleryPhoto>) {
    setState((s) => ({
      ...s,
      gallery: s.gallery.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    }));
  }

  function removeGalleryItem(idx: number) {
    setState((s) => ({
      ...s,
      gallery: s.gallery.filter((_, i) => i !== idx).map((g, i) => ({ ...g, order: i })),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from('landing_pages')
      .update({
        slug: state.slug.trim(),
        template: state.template.trim() || 'general',
        status: state.status,
        eyebrow_en: state.eyebrow_en || null,
        eyebrow_es: state.eyebrow_es || null,
        headline_en: state.headline_en,
        headline_es: state.headline_es,
        subheadline_en: state.subheadline_en || null,
        subheadline_es: state.subheadline_es || null,
        cta_primary_en: state.cta_primary_en || null,
        cta_primary_es: state.cta_primary_es || null,
        cta_secondary_en: state.cta_secondary_en || null,
        cta_secondary_es: state.cta_secondary_es || null,
        gallery_heading_en: state.gallery_heading_en || null,
        gallery_heading_es: state.gallery_heading_es || null,
        about_heading_en: state.about_heading_en || null,
        about_heading_es: state.about_heading_es || null,
        about_body_en: state.about_body_en || null,
        about_body_es: state.about_body_es || null,
        closer_heading_en: state.closer_heading_en || null,
        closer_heading_es: state.closer_heading_es || null,
        closer_body_en: state.closer_body_en || null,
        closer_body_es: state.closer_body_es || null,
        hero_image_url: state.hero_image_url,
        gallery: state.gallery,
        base_price_cents: state.base_price ? dollarsInputToCents(state.base_price) : null,
        currency: state.currency || 'usd',
        meta_pixel_id: state.meta_pixel_id || null,
        discount_code_id: state.discount_code_id || null,
      })
      .eq('id', page.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // Diff + persist location assignments.
    const origLocations = new Set(initialLocationIds);
    const nextLocations = new Set(locationIds);
    const locationsToAdd = locationIds.filter((id) => !origLocations.has(id));
    const locationsToRemove = initialLocationIds.filter((id) => !nextLocations.has(id));

    const origProducts = new Set(initialProductIds);
    const nextProducts = new Set(productIds);
    const productsToAdd = productIds.filter((id) => !origProducts.has(id));
    const productsToRemove = initialProductIds.filter((id) => !nextProducts.has(id));

    const ops: Promise<unknown>[] = [];
    if (locationsToAdd.length)
      ops.push(
        supabase.from('landing_page_locations').insert(locationsToAdd.map((location_id) => ({ landing_page_id: page.id, location_id })))
      );
    if (locationsToRemove.length)
      ops.push(
        supabase.from('landing_page_locations').delete().eq('landing_page_id', page.id).in('location_id', locationsToRemove)
      );
    if (productsToAdd.length)
      ops.push(
        supabase.from('landing_page_products').insert(productsToAdd.map((product_id) => ({ landing_page_id: page.id, product_id })))
      );
    if (productsToRemove.length)
      ops.push(
        supabase.from('landing_page_products').delete().eq('landing_page_id', page.id).in('product_id', productsToRemove)
      );

    await Promise.all(ops);

    setSaving(false);
    setSuccess(true);
    router.refresh();
  }

  return (
    <div className="max-w-4xl space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>}

      <div className={`${cardCls} grid grid-cols-1 gap-4 sm:grid-cols-3`}>
        <div>
          <label className={labelCls}>Status</label>
          <select className={selectCls} value={state.status} onChange={(e) => set('status', e.target.value as LandingPageStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Template</label>
          <input className={inputCls} value={state.template} onChange={(e) => set('template', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <input className={inputCls} value={state.slug} onChange={(e) => set('slug', e.target.value)} />
        </div>
      </div>

      <div className={`${cardCls} space-y-4`}>
        <h2 className="text-sm font-semibold text-gray-900">Hero</h2>
        <div className="flex items-start gap-4">
          {state.hero_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.hero_image_url} alt="" className="h-24 w-40 rounded-md object-cover" />
          )}
          <ImageUploadCrop
            aspect={16 / 9}
            label={state.hero_image_url ? 'Replace hero photo' : 'Upload hero photo'}
            uploading={uploadingHero}
            onCropped={handleHeroUpload}
          />
        </div>

        <PairedRow
          label="Eyebrow"
          enValue={state.eyebrow_en}
          esValue={state.eyebrow_es}
          onEnChange={(v) => set('eyebrow_en', v)}
          onEsChange={(v) => set('eyebrow_es', v)}
        />
        <PairedRow
          label="Headline"
          enValue={state.headline_en}
          esValue={state.headline_es}
          onEnChange={(v) => set('headline_en', v)}
          onEsChange={(v) => set('headline_es', v)}
        />
        <PairedRow
          label="Subheadline"
          enValue={state.subheadline_en}
          esValue={state.subheadline_es}
          onEnChange={(v) => set('subheadline_en', v)}
          onEsChange={(v) => set('subheadline_es', v)}
        />
        <PairedRow
          label="Primary CTA"
          enValue={state.cta_primary_en}
          esValue={state.cta_primary_es}
          onEnChange={(v) => set('cta_primary_en', v)}
          onEsChange={(v) => set('cta_primary_es', v)}
        />
        <PairedRow
          label="Secondary CTA"
          enValue={state.cta_secondary_en}
          esValue={state.cta_secondary_es}
          onEnChange={(v) => set('cta_secondary_en', v)}
          onEsChange={(v) => set('cta_secondary_es', v)}
        />
      </div>

      <div className={`${cardCls} space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Gallery</h2>
          <span className="text-xs text-gray-500">{state.gallery.length} / {MAX_GALLERY}</span>
        </div>
        <PairedRow
          label="Gallery heading"
          enValue={state.gallery_heading_en}
          esValue={state.gallery_heading_es}
          onEnChange={(v) => set('gallery_heading_en', v)}
          onEsChange={(v) => set('gallery_heading_es', v)}
        />

        <div className="space-y-3">
          {state.gallery.map((g, idx) => (
            <div key={g.url} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder="Tag (EN)"
                  value={g.tag_en}
                  onChange={(e) => updateGalleryItem(idx, { tag_en: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Tag (ES)"
                  value={g.tag_es}
                  onChange={(e) => updateGalleryItem(idx, { tag_es: e.target.value })}
                />
              </div>
              <button type="button" className={btnDanger} onClick={() => removeGalleryItem(idx)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {state.gallery.length < MAX_GALLERY && (
          <ImageUploadCrop aspect={1} label="Add gallery photo" uploading={uploadingGallery} onCropped={handleGalleryUpload} />
        )}
      </div>

      <div className={`${cardCls} space-y-4`}>
        <h2 className="text-sm font-semibold text-gray-900">About</h2>
        <PairedRow
          label="About heading"
          enValue={state.about_heading_en}
          esValue={state.about_heading_es}
          onEnChange={(v) => set('about_heading_en', v)}
          onEsChange={(v) => set('about_heading_es', v)}
        />
        <PairedRow
          label="About body"
          enValue={state.about_body_en}
          esValue={state.about_body_es}
          onEnChange={(v) => set('about_body_en', v)}
          onEsChange={(v) => set('about_body_es', v)}
          textarea
        />
      </div>

      <div className={`${cardCls} space-y-4`}>
        <h2 className="text-sm font-semibold text-gray-900">Closer</h2>
        <PairedRow
          label="Closer heading"
          enValue={state.closer_heading_en}
          esValue={state.closer_heading_es}
          onEnChange={(v) => set('closer_heading_en', v)}
          onEsChange={(v) => set('closer_heading_es', v)}
        />
        <PairedRow
          label="Closer body"
          enValue={state.closer_body_en}
          esValue={state.closer_body_es}
          onEnChange={(v) => set('closer_body_en', v)}
          onEsChange={(v) => set('closer_body_es', v)}
          textarea
        />
      </div>

      <div className={`${cardCls} grid grid-cols-1 gap-4 sm:grid-cols-3`}>
        <div>
          <label className={labelCls}>Base price (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={state.base_price}
            onChange={(e) => set('base_price', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Meta pixel ID override</label>
          <input className={inputCls} value={state.meta_pixel_id} onChange={(e) => set('meta_pixel_id', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Auto-apply discount code</label>
          <select className={selectCls} value={state.discount_code_id} onChange={(e) => set('discount_code_id', e.target.value)}>
            <option value="">None</option>
            {discountCodes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Locations offered</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {locations.map((loc) => (
            <label key={loc.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={locationIds.includes(loc.id)} onChange={() => toggleLocation(loc.id)} />
              {loc.name}
              {!loc.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
            </label>
          ))}
          {locations.length === 0 && <p className="text-sm text-gray-500">No locations yet.</p>}
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Upsell products</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {products.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
              {p.name}
              {!p.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
            </label>
          ))}
          {products.length === 0 && <p className="text-sm text-gray-500">No products yet.</p>}
        </div>
      </div>

      <div className="flex gap-2 pb-8">
        <button type="button" className={btnPrimary} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className={btnSecondary} onClick={() => router.push('/admin/landing-pages')}>
          Done
        </button>
      </div>
    </div>
  );
}
