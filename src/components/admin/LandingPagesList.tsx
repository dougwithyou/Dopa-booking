'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { LandingPage, LandingPageStatus } from '@/types/db';
import { formatDate } from './lib/format';
import { badgeCls, btnDanger, btnGhost, btnPrimary, tableWrapCls, tdCls, thCls } from './lib/ui';

const STATUS_TONE: Record<LandingPageStatus, 'green' | 'gray' | 'amber'> = {
  published: 'green',
  draft: 'amber',
  archived: 'gray',
};

export default function LandingPagesList({ initialPages }: { initialPages: LandingPage[] }) {
  const [pages, setPages] = useState(initialPages);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function setStatus(id: string, status: LandingPageStatus) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('landing_pages')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError || !data) {
      setError(updateError?.message ?? 'Failed to update status.');
      return;
    }
    setPages((prev) => prev.map((p) => (p.id === id ? data : p)));
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this landing page? This cannot be undone.')) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('landing_pages').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        <Link href="/admin/landing-pages/new" className={btnPrimary}>
          <Plus className="h-4 w-4" /> New landing page
        </Link>
      </div>

      <div className={tableWrapCls}>
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className={thCls}>Headline</th>
              <th className={thCls}>Slug</th>
              <th className={thCls}>Template</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Updated</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map((p) => (
              <tr key={p.id}>
                <td className={tdCls}>
                  <Link href={`/admin/landing-pages/${p.id}/edit`} className="font-medium text-gray-900 hover:underline">
                    {p.headline_en || '(untitled)'}
                  </Link>
                </td>
                <td className={tdCls}>
                  <span className="font-mono text-xs text-gray-600">/{p.slug}</span>
                </td>
                <td className={tdCls}>{p.template}</td>
                <td className={tdCls}>
                  <span className={badgeCls(STATUS_TONE[p.status])}>{p.status}</span>
                </td>
                <td className={tdCls}>{formatDate(p.updated_at)}</td>
                <td className={tdCls}>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/landing-pages/${p.id}/edit`} className={btnGhost}>
                      Edit
                    </Link>
                    {p.status !== 'published' && (
                      <button className={btnGhost} onClick={() => setStatus(p.id, 'published')}>
                        Publish
                      </button>
                    )}
                    {p.status !== 'draft' && (
                      <button className={btnGhost} onClick={() => setStatus(p.id, 'draft')}>
                        Unpublish
                      </button>
                    )}
                    {p.status !== 'archived' && (
                      <button className={btnGhost} onClick={() => setStatus(p.id, 'archived')}>
                        Archive
                      </button>
                    )}
                    <button className={btnDanger} onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={6}>
                  No landing pages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
