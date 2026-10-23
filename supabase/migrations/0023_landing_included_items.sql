-- "What's included" bullet list per landing page (bilingual items, e.g.
-- "30-minute session", "10–15 edited photos"), shown on the closer's
-- price ticket. Edited in the landing editor.
alter table landing_pages add column included_items jsonb not null default '[]'::jsonb;
