-- Per-page small label above the gallery heading (previously fixed chrome
-- copy in messages/*.json, e.g. "Últimas sesiones"). Null falls back to it.
alter table landing_pages
  add column gallery_eyebrow_en text,
  add column gallery_eyebrow_es text;
