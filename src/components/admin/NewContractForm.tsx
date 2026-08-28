'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/types/db';
import type { EnrichedBooking } from './lib/data';
import { landingPageLabel } from './lib/data';
import { formatDateTime } from './lib/format';
import { DEFAULT_CONTRACT_TEMPLATE, renderContractVariables } from '@/lib/contracts/template';
import { btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls } from './lib/ui';

export default function NewContractForm({
  studioId,
  studioName,
  bookings,
  clients,
}: {
  studioId: string;
  studioName: string;
  bookings: EnrichedBooking[];
  clients: Client[];
}) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientList, setClientList] = useState<Client[]>(clients);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [title, setTitle] = useState('Photography Services Contract');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingOptions = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== 'cancelled')
        .map((b) => ({
          id: b.id,
          label: `${b.client?.name || b.client?.email || 'Unknown client'} — ${landingPageLabel(b.landing_page)} — ${
            b.slot ? formatDateTime(b.slot.start_time) : 'no date'
          }`,
        })),
    [bookings]
  );

  /** Inserts a client from the newClientName/newClientEmail fields and
   * returns its id, or null (with `error` set) if that failed. Shared by
   * the standalone "Add client" button and handleCreate's auto-save, so a
   * name/email typed but never explicitly submitted isn't silently lost. */
  async function createNewClient(): Promise<string | null> {
    if (!newClientName.trim() || !newClientEmail.trim()) {
      setError('Enter a name and email for the new client.');
      return null;
    }
    setAddingClient(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('clients')
      .insert({ studio_id: studioId, name: newClientName.trim(), email: newClientEmail.trim() })
      .select('*')
      .single();

    setAddingClient(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create client.');
      return null;
    }
    setClientList((prev) => [...prev, data].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')));
    setClientId(data.id);
    setShowNewClient(false);
    setNewClientName('');
    setNewClientEmail('');
    return data.id;
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);

    // If the admin typed a new client's name/email but never clicked "Add
    // client", create it now instead of quietly dropping it.
    let effectiveClientId = clientId;
    if (!effectiveClientId && showNewClient && (newClientName.trim() || newClientEmail.trim())) {
      const newId = await createNewClient();
      if (!newId) {
        setSaving(false);
        return;
      }
      effectiveClientId = newId;
    }

    const booking = bookings.find((b) => b.id === bookingId) ?? null;
    const linkedClient = booking?.client ?? clientList.find((c) => c.id === effectiveClientId) ?? null;

    const content = booking
      ? renderContractVariables(DEFAULT_CONTRACT_TEMPLATE, {
          clientName: booking.client?.name || booking.client?.email,
          studioName,
          amountCents: booking.amount_cents,
          currency: booking.currency,
          sessionDate: booking.slot?.start_time,
          sessionType: landingPageLabel(booking.landing_page),
          location: booking.location?.name,
        })
      : linkedClient
        ? renderContractVariables(DEFAULT_CONTRACT_TEMPLATE, {
            clientName: linkedClient.name || linkedClient.email,
            studioName,
          })
        : DEFAULT_CONTRACT_TEMPLATE;

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('contracts')
      .insert({
        studio_id: studioId,
        // effectiveClientId is '' (not null/undefined) when left on "— No
        // client —", which Postgres' uuid column rejects — normalize it.
        client_id: booking?.client_id ?? (effectiveClientId || null),
        booking_id: booking?.id ?? null,
        title: title.trim() || 'Photography Services Contract',
        content,
      })
      .select('id')
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create contract.');
      return;
    }
    router.push(`/admin/contracts/${data.id}/edit`);
  }

  return (
    <div className={`${cardCls} max-w-xl space-y-4`}>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Pre-fill from a booking (optional)</label>
        <select
          className={selectCls}
          value={bookingId}
          onChange={(e) => {
            setBookingId(e.target.value);
            if (e.target.value) setClientId('');
          }}
        >
          <option value="">— Start from scratch —</option>
          {bookingOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Fills in the client, session type, date, location, and amount using the default template's variables.
        </p>
      </div>

      {!bookingId && (
        <div>
          <label className={labelCls}>Link a client (optional, for contracts with no booking)</label>
          <select className={selectCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— No client —</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.email}
              </option>
            ))}
          </select>

          {!showNewClient ? (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
              onClick={() => setShowNewClient(true)}
            >
              + New client
            </button>
          ) : (
            <div className="mt-2 space-y-2 rounded-md border border-gray-200 p-3">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  className={inputCls}
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" className={btnSecondary} disabled={addingClient} onClick={createNewClient}>
                  {addingClient ? 'Adding…' : 'Add client'}
                </button>
                <button type="button" className={btnSecondary} onClick={() => setShowNewClient(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button className={btnPrimary} disabled={saving} onClick={handleCreate}>
        {saving ? 'Creating…' : 'Create draft contract'}
      </button>
    </div>
  );
}
