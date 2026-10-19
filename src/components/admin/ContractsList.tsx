'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Check, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { EnrichedContract } from './lib/data';
import { formatDateTime } from './lib/format';
import { badgeCls, tableWrapCls, thCls, tdCls, btnGhost } from './lib/ui';

function statusTone(status: EnrichedContract['status']): 'gray' | 'blue' | 'green' | 'red' {
  if (status === 'signed') return 'green';
  if (status === 'sent') return 'blue';
  if (status === 'void') return 'red';
  return 'gray';
}

function publicUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  return `${base}/en/contracts/${token}`;
}

export default function ContractsList({ contracts: initialContracts }: { contracts: EnrichedContract[] }) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyLink(contract: EnrichedContract) {
    try {
      await navigator.clipboard.writeText(publicUrl(contract.public_token));
      setCopiedId(contract.id);
      setTimeout(() => setCopiedId((id) => (id === contract.id ? null : id)), 1500);
    } catch {
      // clipboard access can fail (permissions, insecure context) — non-critical, just skip.
    }
  }

  async function handleDelete(contract: EnrichedContract) {
    if (!confirm(`Delete "${contract.title}"? This can't be undone.`)) return;
    setDeletingId(contract.id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('contracts').delete().eq('id', contract.id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setContracts((prev) => prev.filter((c) => c.id !== contract.id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className={tableWrapCls}>
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className={thCls}>Title</th>
              <th className={thCls}>Client</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Created</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contracts.map((c) => (
              <tr key={c.id}>
                <td className={tdCls}>
                  <Link href={`/admin/contracts/${c.id}/edit`} className="font-medium text-gray-900 hover:underline">
                    {c.title}
                  </Link>
                </td>
                <td className={tdCls}>{c.client?.name || c.client?.email || '—'}</td>
                <td className={tdCls}>
                  <span className={badgeCls(statusTone(c.status))}>{c.status}</span>
                </td>
                <td className={tdCls}>{formatDateTime(c.created_at)}</td>
                <td className={tdCls}>
                  <div className="flex justify-end gap-1">
                    {(c.status === 'sent' || c.status === 'signed') && (
                      <button className={btnGhost} onClick={() => copyLink(c)}>
                        {copiedId === c.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === c.id ? 'Copied' : 'Copy link'}
                      </button>
                    )}
                    <Link href={`/admin/contracts/${c.id}/edit`} className={btnGhost}>
                      {c.status === 'draft' ? 'Edit' : 'View'}
                    </Link>
                    {(c.status === 'draft' || c.status === 'sent' || c.status === 'void') && (
                      <button
                        className={btnGhost}
                        disabled={deletingId === c.id}
                        onClick={() => handleDelete(c)}
                        title="Delete contract"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === c.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={5}>
                  No contracts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
