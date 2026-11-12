'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { SessionRequestStatus } from '@/types/db';
import { selectCls } from './lib/ui';

export default function RequestStatusSelect({ id, status }: { id: string; status: SessionRequestStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  return (
    <select
      className={`${selectCls} w-auto`}
      value={value}
      onChange={async (e) => {
        const next = e.target.value as SessionRequestStatus;
        setValue(next);
        await createClient().from('session_requests').update({ status: next }).eq('id', id);
        router.refresh();
      }}
    >
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="closed">Closed</option>
    </select>
  );
}
