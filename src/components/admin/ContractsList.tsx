'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check } from 'lucide-react';
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

export default function ContractsList({ contracts }: { contracts: EnrichedContract[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyLink(contract: EnrichedContract) {
    try {
      await navigator.clipboard.writeText(publicUrl(contract.public_token));
      setCopiedId(contract.id);
      setTimeout(() => setCopiedId((id) => (id === contract.id ? null : id)), 1500);
    } catch {
      // clipboard access can fail (permissions, insecure context) — non-critical, just skip.
    }
  }

  return (
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
  );
}
