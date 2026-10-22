-- Whether the landing page shows the session price (with the active
-- discount applied) on the closer ticket. On by default.
alter table landing_pages add column show_price boolean not null default true;
