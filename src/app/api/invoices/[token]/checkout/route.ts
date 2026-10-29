import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { APP_METADATA_KEY, APP_METADATA_VALUE, getStripe, studioStripeOptions } from '@/lib/stripe';
import { invoiceNumberLabel, lineTotalCents, subtotalCents } from '@/lib/invoices/totals';
import { adminDb, fetchInvoiceByToken, invoicePayUrl } from '@/lib/invoices/server';
import { fetchStudio, jsonError } from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/invoices/[token]/checkout — public "Pay" button on the invoice
 * page. Creates a Stripe Checkout Session for the invoice total (one line
 * per item; a discount is folded in as a single line when present, since
 * Checkout has no negative lines). The webhook marks it paid.
 * 200: { url }   409: { error: 'invoice_paid' | 'invoice_void' | 'nothing_to_pay' }
 */
export async function POST(_request: NextRequest, { params }: { params: { token: string } }) {
  const db = adminDb();
  const invoice = await fetchInvoiceByToken(db, params.token);
  if (!invoice) return jsonError(404, 'not_found');
  if (invoice.status === 'paid' || invoice.status === 'void') return jsonError(409, `invoice_${invoice.status}`);
  if (invoice.total_cents < 50) return jsonError(409, 'nothing_to_pay');

  const studio = await fetchStudio(db, invoice.studio_id);
  const target = studio ? studioStripeOptions(studio.stripe_account_id) : null;
  if (!target) return jsonError(400, 'stripe_not_connected');

  const num = invoiceNumberLabel(invoice.number);
  const es = invoice.locale === 'es';
  const hasDiscount = invoice.discount_cents > 0 && subtotalCents(invoice.items) > invoice.total_cents;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = hasDiscount
    ? [
        {
          quantity: 1,
          price_data: {
            currency: invoice.currency,
            unit_amount: invoice.total_cents,
            product_data: {
              name: `${es ? 'Factura' : 'Invoice'} ${num} — ${invoice.title}`.slice(0, 250),
              description: invoice.items
                .map((i) => (i.quantity > 1 ? `${i.description} × ${i.quantity}` : i.description))
                .join(', ')
                .slice(0, 250),
            },
          },
        },
      ]
    : invoice.items
        .filter((i) => lineTotalCents(i) > 0)
        .map((i) => ({
          quantity: i.quantity,
          price_data: {
            currency: invoice.currency,
            unit_amount: i.unit_cents,
            product_data: { name: i.description.slice(0, 250) },
          },
        }));

  const payUrl = invoicePayUrl(invoice);
  try {
    const session = await getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        locale: invoice.locale,
        customer_email: invoice.client_email,
        client_reference_id: invoice.id,
        line_items: lineItems,
        metadata: {
          type: 'invoice',
          invoiceId: invoice.id,
          ...(invoice.booking_id ? { bookingId: invoice.booking_id } : {}),
          [APP_METADATA_KEY]: APP_METADATA_VALUE,
        },
        payment_intent_data: {
          description: `${es ? 'Factura' : 'Invoice'} ${num} — ${invoice.title}`.slice(0, 1000),
          metadata: { type: 'invoice', invoiceId: invoice.id },
        },
        success_url: `${payUrl}?paid=1`,
        cancel_url: payUrl,
      },
      target.options
    );
    if (!session.url) return jsonError(502, 'stripe_session_failed');
    await db.from('invoices').update({ stripe_checkout_session_id: session.id }).eq('id', invoice.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[invoices/checkout] Stripe session failed', error);
    return jsonError(502, 'stripe_session_failed');
  }
}
