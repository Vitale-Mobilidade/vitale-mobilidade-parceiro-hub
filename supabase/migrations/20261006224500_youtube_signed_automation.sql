-- The database signs its own scheduled requests. The signing key never leaves this private table.
create table if not exists public.youtube_editorial_worker_settings (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  actor_id uuid not null references auth.users(id),
  signing_key bytea not null default extensions.gen_random_bytes(32)
);
alter table public.youtube_editorial_worker_settings enable row level security;
revoke all on public.youtube_editorial_worker_settings from public,anon,authenticated;
grant select on public.youtube_editorial_worker_settings to service_role;
insert into public.youtube_editorial_worker_settings(singleton,actor_id)
values(true,'d31af94c-f6c1-4d02-80a1-9d3b79dfebd2') on conflict(singleton) do nothing;

create or replace function public.authorize_youtube_editorial_tick(signature text, issued_at text, tick_action text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare settings public.youtube_editorial_worker_settings; expected text;
begin
  if signature is null or issued_at is null or tick_action is null or signature !~ '^[a-f0-9]{64}$' or issued_at !~ '^[0-9]{10}$' or tick_action not in ('youtube-hourly','youtube-drain') then return null; end if;
  if abs(extract(epoch from now())-issued_at::bigint)>300 then return null; end if;
  select * into settings from youtube_editorial_worker_settings where singleton;
  expected:=encode(extensions.hmac(convert_to(issued_at||':'||tick_action,'UTF8'),settings.signing_key,'sha256'),'hex');
  if expected<>signature then return null; end if;
  return jsonb_build_object('enabled',settings.enabled,'actor_id',settings.actor_id);
end $$;
revoke all on function public.authorize_youtube_editorial_tick(text,text,text) from public,anon,authenticated;
grant execute on function public.authorize_youtube_editorial_tick(text,text,text) to service_role;

create or replace function public.dispatch_youtube_editorial_tick(tick_action text)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare settings public.youtube_editorial_worker_settings; issued text; signature text;
begin
  if tick_action not in ('youtube-hourly','youtube-drain') then raise exception 'invalid_tick_action'; end if;
  select * into settings from youtube_editorial_worker_settings where singleton;
  if not settings.enabled then return null; end if;
  if tick_action='youtube-drain' and not exists (
    select 1 from youtube_editorial_inventory i where not i.historical
      and not exists(select 1 from youtube_editorial_sources s where s.video_id=i.video_id)
      and not exists(select 1 from editorial_articles a where a.video_id=i.video_id and a.status<>'archived')
  ) then return null; end if;
  issued:=floor(extract(epoch from clock_timestamp()))::bigint::text;
  signature:=encode(extensions.hmac(convert_to(issued||':'||tick_action,'UTF8'),settings.signing_key,'sha256'),'hex');
  return net.http_post(
    url:='https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
    headers:=jsonb_build_object('Content-Type','application/json','x-youtube-worker-signature',signature,'x-youtube-worker-issued-at',issued),
    body:=jsonb_build_object('action',tick_action),timeout_milliseconds:=180000
  );
end $$;
revoke all on function public.dispatch_youtube_editorial_tick(text) from public,anon,authenticated,service_role;
select cron.schedule('youtube-editorial-hourly','12 * * * *', $$select public.dispatch_youtube_editorial_tick('youtube-hourly');$$);
select cron.schedule('youtube-editorial-drain','*/2 * * * *', $$select public.dispatch_youtube_editorial_tick('youtube-drain');$$);
select cron.alter_job(jobid,active:=false) from cron.job where jobname in ('youtube-editorial-hourly','youtube-editorial-drain');
