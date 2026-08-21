create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('sync-bike-catalog-hourly') where exists (select 1 from cron.job where jobname = 'sync-bike-catalog-hourly');

select cron.schedule(
  'sync-bike-catalog-hourly',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/sync-bike-catalog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);