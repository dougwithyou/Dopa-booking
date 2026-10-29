'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Client, Invoice, InvoiceItem, Location, PublicSlot } from '@/types/db';
import { invoiceTotalCents, lineTotalCents, subtotalCents } from '@/lib/invoices/totals';
import { centsToDollarsInput, dollarsInputToCents, formatCents, formatDate, formatTime } from './lib/format';
import { btnDanger, btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls, textareaCls } from './lib/ui';

type ItemRow = { description: string; quantity: string; unit: string };

const ERRORS: Record<string, string> = {
  slot_unavailable: 'That time slot was just taken — pick another one.',
  unauthorized: 'Your session expired — sign in again.',
  invalid_request: 'Check the required fields: client email, title and at least one item.',
};

/**
 * Create or edit an invoice. On create, an optional session slot is picked
 * from the location's free availability and gets reserved for the client;
 * after creation the slot is fixed (void and re-issue to move it).
 */
export default function InvoiceForm({
  clients,
  locations,
  invoice,
  slotLabel,
}: {
  clients: Client[];
  locations: Location[];
  invoice?: Invoice;
  /** Human label of the reserved slot (edit mode). */
  slotLabel?: string | null;
}) {
  const router = useRouter();
  const editing = Boolean(invoice);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState(invoice?.client_name ?? '');
  const [clientEmail, setClientEmail] = useState(invoice?.client_email ?? '');
  const [clientPhone, setClientPhone] = useState(invoice?.client_phone ?? '');
  const [title, setTitle] = useState(invoice?.title ?? 'Sesión de fotos');
  const [locationId, setLocationId] = useState('');
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [slotId, setSlotId] = useState('');
  const [items, setItems] = useState<ItemRow[]>(
    invoice?.items.map((i) => ({
      description: i.description,
      quantity: String(i.quantity),
      unit: centsToDollarsInput(i.unit_cents),
    })) ?? [{ description: 'Sesión de fotos', quantity: '1', unit: '' }]
  );
  const [discount, setDiscount] = useState(invoice && invoice.discount_cents > 0 ? centsToDollarsInput(invoice.discount_cents) : '');
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? '');
  const [locale, setLocale] = useState<'es' | 'en'>(invoice?.locale ?? 'es');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from a CRM client.
  function pickClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      setClientName(c.name ?? '');
      setClientEmail(c.email);
      setClientPhone(c.phone ?? '');
    }
  }

  // Free slots for the chosen location (same source as the public calendar).
  useEffect(() => {
    if (!locationId) {
      setSlots(null);
      setSlotId('');
      return;
    }
    let cancelled = false;
    setSlots(null);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 180);
    createClient()
      .rpc('public_slot_availability', {
        p_location_id: locationId,
        p_from: new Date().toISOString(),
        p_to: horizon.toISOString(),
      })
      .then(({ data }) => {
        if (!cancelled) setSlots(((data as PublicSlot[] | null) ?? []).filter((s) => s.available));
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const parsedItems: InvoiceItem[] = useMemo(
    () =>
      items.map((r) => ({
        description: r.description,
        quantity: Math.max(1, parseInt(r.quantity, 10) || 1),
        unit_cents: dollarsInputToCents(r.unit || '0'),
      })),
    [items]
  );
  const discountCents = dollarsInputToCents(discount || '0');
  const subtotal = subtotalCents(parsedItems.filter((i) => i.description.trim()));
  const total = invoiceTotalCents(parsedItems.filter((i) => i.description.trim()), discountCents);

  async function submit(send: boolean) {
    setError(null);
    if (!clientEmail.trim() || !title.trim() || !parsedItems.some((i) => i.description.trim())) {
      setError(ERRORS.invalid_request);
      return;
    }
    const fields = {
      clientName: clientName.trim() || null,
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim() || null,
      title: title.trim(),
      notes: notes.trim() || null,
      items: parsedItems.filter((i) => i.description.trim()),
      discountCents,
      dueDate: dueDate || null,
      locale,
    };
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/invoices/${invoice!.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', fields }),
          })
        : await fetch('/api/admin/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...fields, slotId: slotId || null, send }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERRORS[data.error] ?? 'Could not save the invoice. Try again.');
        return;
      }
      router.push(`/admin/invoices/${editing ? invoice!.id : data.id}`);
      router.refresh();
    } catch {
      setError('Network error — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className={`${cardCls} space-y-3`}>
        <h2 className="text-sm font-semibold text-gray-900">Client</h2>
        {!editing && clients.length > 0 && (
          <div>
            <label className={labelCls}>From CRM (optional)</label>
            <select className={selectCls} value={clientId} onChange={(e) => pickClient(e.target.value)}>
              <option value="">New client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ? `${c.name} — ${c.email}` : c.email}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" className={inputCls} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </div>
        </div>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <h2 className="text-sm font-semibold text-gray-900">Session</h2>
        <div>
          <label className={labelCls}>Title *</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {editing ? (
          <p className="text-sm text-gray-600">
            {slotLabel ? (
              <>
                Reserved slot: <span className="font-medium text-gray-900">{slotLabel}</span>. To change it, void this
                invoice and issue a new one.
              </>
            ) : (
              'No session slot on this invoice.'
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Location</label>
              <select className={selectCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">No session date (just bill)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            {locationId && (
              <div>
                <label className={labelCls}>Free time slot</label>
                <select className={selectCls} value={slotId} onChange={(e) => setSlotId(e.target.value)} disabled={!slots}>
                  <option value="">{slots === null ? 'Loading…' : slots.length ? 'Choose a time…' : 'No free slots'}</option>
                  {(slots ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDate(s.start_time)} · {formatTime(s.start_time)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  It&apos;s reserved as soon as the invoice is created, and shows as taken on landing pages.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`${cardCls} space-y-3`}>
        <h2 className="text-sm font-semibold text-gray-900">Items</h2>
        {items.map((row, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder="Description"
              value={row.description}
              onChange={(e) => setItems(items.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)))}
            />
            <input
              className={`${inputCls} w-16`}
              type="number"
              min="1"
              aria-label="Quantity"
              value={row.quantity}
              onChange={(e) => setItems(items.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))}
            />
            <input
              className={`${inputCls} w-28`}
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              aria-label="Unit price (USD)"
              value={row.unit}
              onChange={(e) => setItems(items.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)))}
            />
            <span className="w-24 pt-2 text-right text-sm tabular-nums text-gray-700">
              {formatCents(lineTotalCents(parsedItems[idx]))}
            </span>
            <button
              type="button"
              className={btnDanger}
              aria-label="Remove line"
              disabled={items.length === 1}
              onClick={() => setItems(items.filter((_, i) => i !== idx))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" className={btnSecondary} onClick={() => setItems([...items, { description: '', quantity: '1', unit: '' }])}>
          <Plus className="h-4 w-4" /> Add line
        </button>

        <div className="ml-auto max-w-xs space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCents(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-gray-600">
            <span>Discount (USD)</span>
            <input
              className={`${inputCls} w-28 text-right`}
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div className="flex justify-between text-base font-semibold text-gray-900">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(total)}</span>
          </div>
        </div>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Due date</label>
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Client&apos;s language (email + invoice page)</label>
            <select className={selectCls} value={locale} onChange={(e) => setLocale(e.target.value as 'es' | 'en')}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes for the client</label>
          <textarea className={textareaCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-8">
        {editing ? (
          <button type="button" className={btnPrimary} disabled={saving} onClick={() => submit(false)}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        ) : (
          <>
            <button type="button" className={btnPrimary} disabled={saving} onClick={() => submit(true)}>
              {saving ? 'Saving…' : 'Create & email to client'}
            </button>
            <button type="button" className={btnSecondary} disabled={saving} onClick={() => submit(false)}>
              Save as draft
            </button>
          </>
        )}
      </div>
    </div>
  );
}
