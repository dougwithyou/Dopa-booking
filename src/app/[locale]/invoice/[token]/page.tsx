import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, es } from 'date-fns/locale';
import { adminDb, fetchInvoiceByToken } from '@/lib/invoices/server';
import { fetchLocation, fetchSlot, fetchStudio } from '@/app/api/_lib/payments';
import { invoiceNumberLabel, lineTotalCents, subtotalCents } from '@/lib/invoices/totals';
import { PayInvoiceButton } from '@/components/invoices/PayInvoiceButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

const COPY = {
  es: {
    invoice: 'Factura',
    billedTo: 'Para',
    session: 'Sesión',
    when: 'Fecha y hora',
    location: 'Ubicación',
    due: 'Vence',
    item: 'Concepto',
    amount: 'Importe',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    total: 'Total',
    pay: 'Pagar ahora',
    processing: 'Redirigiendo al pago…',
    error: 'No pudimos iniciar el pago. Intenta de nuevo en un momento.',
    status: { draft: 'Pendiente de pago', sent: 'Pendiente de pago', paid: 'Pagada', void: 'Anulada', overdue: 'Vencida' },
    paidNote: '¡Gracias! Recibimos tu pago y tu sesión está confirmada.',
    processingNote: 'Estamos confirmando tu pago — actualiza esta página en unos segundos.',
    voidNote: 'Esta factura fue anulada. Si tienes dudas, escríbenos.',
    secure: 'Pago seguro con Stripe',
  },
  en: {
    invoice: 'Invoice',
    billedTo: 'Billed to',
    session: 'Session',
    when: 'Date & time',
    location: 'Location',
    due: 'Due',
    item: 'Item',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'Total',
    pay: 'Pay now',
    processing: 'Redirecting to payment…',
    error: "We couldn't start the payment. Please try again in a moment.",
    status: { draft: 'Awaiting payment', sent: 'Awaiting payment', paid: 'Paid', void: 'Void', overdue: 'Overdue' },
    paidNote: 'Thank you! We received your payment and your session is confirmed.',
    processingNote: "We're confirming your payment — refresh this page in a few seconds.",
    voidNote: 'This invoice was voided. Questions? Get in touch.',
    secure: 'Secure payment by Stripe',
  },
} as const;

/**
 * Public invoice page (private link sent by email): session details, line
 * items and a Stripe "Pay now" button. Read server-side by token with the
 * service role — invoices have no public RLS read.
 */
export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: { locale: string; token: string };
  searchParams: { paid?: string };
}) {
  const db = adminDb();
  const invoice = await fetchInvoiceByToken(db, params.token);
  if (!invoice) notFound();

  const locale = params.locale === 'en' ? 'en' : 'es';
  const t = COPY[locale];
  const [slot, location, studio] = await Promise.all([
    invoice.slot_id ? fetchSlot(db, invoice.slot_id) : null,
    invoice.location_id ? fetchLocation(db, invoice.location_id) : null,
    fetchStudio(db, invoice.studio_id),
  ]);
  const tz = studio?.timezone || 'America/New_York';
  const money = (cents: number) =>
    new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
      style: 'currency',
      currency: invoice.currency.toUpperCase(),
    }).format(cents / 100);

  const payable = invoice.status === 'draft' || invoice.status === 'sent';
  const overdue = payable && invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10);
  const statusLabel = overdue ? t.status.overdue : t.status[invoice.status];
  const subtotal = subtotalCents(invoice.items);

  return (
    <main className="min-h-screen bg-parchment px-[6vw] py-14">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-sm font-black uppercase tracking-[0.14em] text-clay">
            {studio?.name ?? 'Dopa Studio'}
          </span>
          <span
            className={`px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.12em] ${
              invoice.status === 'paid'
                ? 'bg-moss/15 text-moss'
                : invoice.status === 'void'
                  ? 'bg-ink/10 text-ink/60'
                  : 'bg-clay/10 text-clay'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <h1 className="font-display text-3xl font-black text-ink">
          {t.invoice} {invoiceNumberLabel(invoice.number)}
        </h1>
        <p className="mt-1 font-body text-sm text-ink/60">
          {t.billedTo}: {invoice.client_name || invoice.client_email}
        </p>

        {invoice.status === 'paid' && (
          <p className="mt-6 border border-moss/30 bg-moss/10 px-4 py-3 font-body text-sm text-ink">{t.paidNote}</p>
        )}
        {payable && searchParams.paid === '1' && (
          <p className="mt-6 border border-clay/30 bg-clay/5 px-4 py-3 font-body text-sm text-ink">{t.processingNote}</p>
        )}
        {invoice.status === 'void' && (
          <p className="mt-6 border border-ink/15 px-4 py-3 font-body text-sm text-ink/70">{t.voidNote}</p>
        )}

        <dl className="mt-8 space-y-2 border-y border-ink/10 py-5 font-body text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/50">{t.session}</dt>
            <dd className="text-right font-semibold text-ink">{invoice.title}</dd>
          </div>
          {slot && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink/50">{t.when}</dt>
              <dd className="text-right text-ink">
                {formatInTimeZone(new Date(slot.start_time), tz, locale === 'es' ? "EEEE d 'de' MMMM, h:mm a" : 'EEEE, MMMM d, h:mm a', {
                  locale: locale === 'es' ? es : enUS,
                })}
              </dd>
            </div>
          )}
          {location && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink/50">{t.location}</dt>
              <dd className="text-right text-ink">
                {[location.name, location.address, location.city].filter(Boolean).join(', ')}
              </dd>
            </div>
          )}
          {invoice.due_date && payable && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink/50">{t.due}</dt>
              <dd className={`text-right ${overdue ? 'font-semibold text-wine' : 'text-ink'}`}>
                {new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
                  new Date(`${invoice.due_date}T00:00:00Z`)
                )}
              </dd>
            </div>
          )}
        </dl>

        <table className="mt-6 w-full font-body text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink/50">
              <th className="pb-2 font-semibold">{t.item}</th>
              <th className="pb-2 text-right font-semibold">{t.amount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2.5 pr-4 text-ink">
                  {item.description}
                  {item.quantity > 1 && (
                    <span className="text-ink/50">
                      {' '}
                      · {item.quantity} × {money(item.unit_cents)}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums text-ink">{money(lineTotalCents(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1.5 border-t border-ink/15 pt-4 font-body text-sm">
          {invoice.discount_cents > 0 && subtotal > invoice.total_cents && (
            <>
              <div className="flex justify-between text-ink/70">
                <span>{t.subtotal}</span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-moss">
                <span>{t.discount}</span>
                <span className="tabular-nums">−{money(subtotal - invoice.total_cents)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between pt-1 font-display text-xl font-black text-ink">
            <span>{t.total}</span>
            <span className="tabular-nums">{money(invoice.total_cents)}</span>
          </div>
        </div>

        {invoice.notes && (
          <p className="mt-6 whitespace-pre-line font-body text-sm leading-relaxed text-ink/70">{invoice.notes}</p>
        )}

        {payable && invoice.total_cents >= 50 && (
          <div className="mt-8">
            <PayInvoiceButton token={invoice.token} label={t.pay} processingLabel={t.processing} errorLabel={t.error} />
            <p className="mt-3 text-center font-body text-xs text-ink/50">{t.secure}</p>
          </div>
        )}
      </div>
    </main>
  );
}
