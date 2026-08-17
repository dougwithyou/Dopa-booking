import { CreditCard } from 'lucide-react';
import type { Studio } from '@/types/db';
import { badgeCls, btnPrimary, cardCls } from './lib/ui';

// The OAuth flow itself (/api/stripe/connect/start, /api/stripe/connect/callback)
// is owned by the payments-integrator agent — this card just links to it and
// reflects the resulting studios.stripe_* columns.
export default function StripeConnectCard({ studio }: { studio: Studio }) {
  const connected = !!studio.stripe_account_id && studio.stripe_charges_enabled;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Stripe payments</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Connect a Stripe account to accept card payments on your public booking pages.
          </p>
        </div>
        <span className={badgeCls(connected ? 'green' : 'gray')}>{connected ? 'Connected ✓' : 'Not connected'}</span>
      </div>

      {studio.stripe_account_id && !studio.stripe_charges_enabled && (
        <p className="mt-2 text-xs text-amber-600">
          Account linked but onboarding isn&apos;t complete yet — charges are disabled until Stripe finishes verifying it.
        </p>
      )}

      <a href="/api/stripe/connect/start" className={`${btnPrimary} mt-4`}>
        <CreditCard className="h-4 w-4" /> {studio.stripe_account_id ? 'Manage Stripe connection' : 'Connect Stripe'}
      </a>
    </div>
  );
}
