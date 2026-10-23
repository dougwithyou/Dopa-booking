-- Schedules the abandoned-checkout follow-up: every 15 minutes pg_cron
-- POSTs to the app's /api/cron/abandoned-carts with the shared secret.
-- The secret lives in Supabase Vault (name 'cron_secret', same value as the
-- CRON_SECRET env var in Vercel) — never in this file. Create it once with:
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'abandoned-carts',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://book.hidopastudio.com/api/cron/abandoned-carts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
