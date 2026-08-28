'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Client, Contract } from '@/types/db';
import { CONTRACT_VARIABLES, renderContractVariables } from '@/lib/contracts/template';
import { contractMarkdownToHtml } from '@/lib/contracts/markdown';
import { formatDateTime } from './lib/format';
import { badgeCls, btnDanger, btnPrimary, btnSecondary, cardCls, inputCls, labelCls } from './lib/ui';

export interface BookingContext {
  amountCents: number | null;
  currency: string | null;
  sessionDate: string | null;
  sessionType: string | null;
  location: string | null;
}

function publicUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  return `${base}/en/contracts/${token}`;
}

export default function ContractEditor({
  contract,
  studioName,
  client,
  bookingContext,
}: {
  contract: Contract;
  studioName: string;
  client: Client | null;
  bookingContext: BookingContext | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(contract.title);
  const [content, setContent] = useState(contract.content);
  const [status, setStatus] = useState(contract.status);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const editable = status === 'draft' || status === 'sent';
  const previewHtml = contractMarkdownToHtml(content);

  function insertVariable(token: string) {
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + token);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ title: title.trim() || contract.title, content })
      .eq('id', contract.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function handleSend() {
    setSending(true);
    setError(null);

    const resolved = renderContractVariables(content, {
      clientName: client?.name || client?.email,
      studioName,
      amountCents: bookingContext?.amountCents,
      currency: bookingContext?.currency,
      sessionDate: bookingContext?.sessionDate,
      sessionType: bookingContext?.sessionType,
      location: bookingContext?.location,
    });

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ title: title.trim() || contract.title, content: resolved, status: 'sent' })
      .eq('id', contract.id);

    setSending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setContent(resolved);
    setStatus('sent');
    router.refresh();
  }

  async function handleVoid() {
    if (!confirm('Void this contract? The public link will stop working.')) return;
    setVoiding(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from('contracts').update({ status: 'void' }).eq('id', contract.id);
    setVoiding(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus('void');
    router.refresh();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl(contract.public_token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // non-critical
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{editable ? 'Edit contract' : 'Contract'}</h1>
          <p className="text-sm text-gray-500">
            {client ? `${client.name || client.email}` : 'No client linked'}
          </p>
        </div>
        <span className={badgeCls(status === 'signed' ? 'green' : status === 'sent' ? 'blue' : status === 'void' ? 'red' : 'gray')}>
          {status}
        </span>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {status === 'signed' && (
        <div className={`${cardCls} space-y-2`}>
          <h2 className="text-sm font-semibold text-gray-900">Signed</h2>
          <p className="text-sm text-gray-700">
            Signed by <strong>{contract.signer_name}</strong>
            {contract.signer_email ? ` (${contract.signer_email})` : ''}
            {contract.signer_id_number ? ` — ID: ${contract.signer_id_number}` : ''} on{' '}
            {contract.signed_at ? formatDateTime(contract.signed_at) : '—'}.
          </p>
          <p className="text-xs text-gray-500">IP address: {contract.signer_ip ?? '—'}</p>
          {contract.pdf_url && (
            <a href={contract.pdf_url} target="_blank" rel="noreferrer" className={`${btnSecondary} inline-flex`}>
              Download signed PDF
            </a>
          )}
        </div>
      )}

      {(status === 'sent' || status === 'signed') && (
        <div className={`${cardCls} flex items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Public link</div>
            <div className="truncate text-sm text-gray-900">{publicUrl(contract.public_token)}</div>
          </div>
          <button className={btnSecondary} onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}

      {status === 'void' && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          This contract has been voided. The public link no longer works.
        </div>
      )}

      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} />
      </div>

      {editable && (
        <div>
          <label className={labelCls}>Insert variable</label>
          <div className="flex flex-wrap gap-1.5">
            {CONTRACT_VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => insertVariable(v.token)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className={labelCls}>Content</label>
          <textarea
            ref={textareaRef}
            className="h-96 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!editable}
          />
          <p className="mt-1 text-xs text-gray-500">
            Use <code># </code> / <code>## </code> for headings, <code>- </code> for lists, <code>**bold**</code>, and
            blank lines for paragraph breaks.
          </p>
        </div>
        <div>
          <label className={labelCls}>Preview</label>
          <div
            className="h-96 overflow-y-auto rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-900 [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2">
          <button className={btnSecondary} disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {status === 'draft' && (
            <button className={btnPrimary} disabled={sending} onClick={handleSend}>
              {sending ? 'Sending…' : 'Send contract'}
            </button>
          )}
          <button className={btnDanger} disabled={voiding} onClick={handleVoid}>
            {voiding ? 'Voiding…' : 'Void contract'}
          </button>
        </div>
      )}
    </div>
  );
}
