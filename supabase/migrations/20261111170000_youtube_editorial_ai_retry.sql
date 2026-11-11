-- Keep hourly discovery active while the AI provider refuses paid processing.
alter table public.youtube_editorial_worker_settings add column ai_retry_at timestamptz;
grant update (ai_retry_at) on public.youtube_editorial_worker_settings to service_role;
