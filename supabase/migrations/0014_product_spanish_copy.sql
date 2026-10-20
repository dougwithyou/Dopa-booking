-- Spanish copy for upsell products. The existing name/description columns
-- hold the English text; Spanish falls back to them when these are empty.
alter table products
  add column name_es text,
  add column description_es text;
