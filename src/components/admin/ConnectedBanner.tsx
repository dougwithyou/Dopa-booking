'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ConnectedBanner({ connectedParam }: { connectedParam?: string }) {
  const [visible, setVisible] = useState(!!connectedParam);
  const router = useRouter();

  useEffect(() => {
    setVisible(!!connectedParam);
  }, [connectedParam]);

  if (!visible || !connectedParam) return null;

  const success = connectedParam === '1';

  return (
    <div
      className={`flex items-center justify-between rounded-md px-4 py-3 text-sm ${
        success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <span className="flex items-center gap-2">
        {success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {success ? 'Stripe account connected successfully.' : 'Stripe connection failed or was cancelled. Please try again.'}
      </span>
      <button
        className="text-xs font-medium underline"
        onClick={() => {
          setVisible(false);
          router.replace('/admin/settings');
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
