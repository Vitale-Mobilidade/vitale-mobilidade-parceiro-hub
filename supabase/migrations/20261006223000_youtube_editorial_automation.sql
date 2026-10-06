-- Install paused, verify one real scheduled run, then activate both jobs explicitly.
-- The worker secret is generated server-side and mirrored in Edge secrets before applying this migration.
do $$ begin
  if not exists(select 1 from vault.secrets where name='vitale_youtube_worker_key') then
    raise exception 'youtube_worker_secret_not_configured';
  end if;
end $$;
select cron.schedule('youtube-editorial-hourly','12 * * * *', $job$
  select net.http_post(
    url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
    headers := jsonb_build_object('Content-Type','application/json','x-youtube-worker-key',
      (select decrypted_secret from vault.decrypted_secrets where name='vitale_youtube_worker_key')),
    body := '{"action":"youtube-hourly"}'::jsonb,
    timeout_milliseconds := 180000
  );
$job$);
select cron.schedule('youtube-editorial-drain','*/2 * * * *', $job$
  select net.http_post(
    url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
    headers := jsonb_build_object('Content-Type','application/json','x-youtube-worker-key',
      (select decrypted_secret from vault.decrypted_secrets where name='vitale_youtube_worker_key')),
    body := '{"action":"youtube-drain"}'::jsonb,
    timeout_milliseconds := 180000
  );
$job$);
update cron.job set active=false where jobname in ('youtube-editorial-hourly','youtube-editorial-drain');
