import { formatCents } from '@/lib/formatMoney';

export interface ContractVariableContext {
  clientName?: string | null;
  studioName?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  sessionDate?: string | null; // ISO
  sessionType?: string | null;
  location?: string | null;
}

/** Tokens an admin can drop into a contract's body — resolved when the
 * contract is created/regenerated from a booking, or left as-is (shown
 * verbatim) if a value isn't available yet. */
export const CONTRACT_VARIABLES: { token: string; label: string }[] = [
  { token: '{{client.name}}', label: 'Client name' },
  { token: '{{studio.name}}', label: 'Studio name' },
  { token: '{{amount}}', label: 'Amount' },
  { token: '{{date}}', label: 'Session date' },
  { token: '{{session_type}}', label: 'Session type' },
  { token: '{{location}}', label: 'Location' },
];

export function renderContractVariables(content: string, ctx: ContractVariableContext): string {
  const values: Record<string, string> = {
    'client.name': ctx.clientName?.trim() || '',
    'studio.name': ctx.studioName?.trim() || '',
    amount:
      ctx.amountCents != null ? formatCents(ctx.amountCents, ctx.currency || 'usd', 'en') : '',
    date: ctx.sessionDate
      ? new Date(ctx.sessionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '',
    session_type: ctx.sessionType?.trim() || '',
    location: ctx.location?.trim() || '',
  };

  return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const value = values[key];
    return value !== undefined && value !== '' ? value : match;
  });
}

export const DEFAULT_CONTRACT_TEMPLATE = `# Photography Services Agreement

This agreement is entered into between {{studio.name}} ("Photographer") and {{client.name}} ("Client") for a {{session_type}} session on {{date}} at {{location}}.

## Payment

The Client agrees to pay {{amount}} for the services described above.

## Usage & Delivery

Photographer will deliver edited digital images within 2-3 weeks of the session date. Photographer retains the right to use images for portfolio and marketing purposes unless otherwise agreed in writing.

## Cancellation

Cancellations made less than 48 hours before the scheduled session may not be eligible for a refund.

By signing below, both parties agree to the terms above.`;
