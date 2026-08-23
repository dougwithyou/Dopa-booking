-- Tracks physical/digital delivery of a paid upsell order (a photobook,
-- prints, etc.) separately from payment status — `status = 'paid'` only
-- means Stripe settled the charge, not that Doug has handed anything over.
alter table upsell_orders add column fulfilled_at timestamptz;
