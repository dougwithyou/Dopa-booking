-- Admin cancellation with optional Stripe refund (POST
-- /api/admin/bookings/[id]/cancel). A refunded upsell order keeps its row
-- (status flips to 'cancelled') with refunded_at set for the record.
alter table bookings
  add column cancelled_at timestamptz,
  add column refunded_at timestamptz,
  add column refund_amount_cents int,
  add column stripe_refund_id text;

alter table upsell_orders
  add column refunded_at timestamptz;
