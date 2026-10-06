alter table public.youtube_editorial_sources drop constraint youtube_editorial_sources_state_check;
alter table public.youtube_editorial_sources add constraint youtube_editorial_sources_state_check
  check(state in ('capturing','generating','rewrite_pending','cover_pending','cover_generating','done','needs_review'));
create or replace function public.claim_youtube_editorial_cover() returns jsonb
language plpgsql security definer set search_path=public as $$
declare source public.youtube_editorial_sources;
begin
  select * into source from youtube_editorial_sources where state='cover_pending'
    order by created_at,video_id for update skip locked limit 1;
  if not found then return null; end if;
  update youtube_editorial_sources set state='cover_generating' where video_id=source.video_id;
  return jsonb_build_object('video_id',source.video_id,'article_id',source.article_id);
end $$;
revoke all on function public.claim_youtube_editorial_cover() from public,anon,authenticated;
grant execute on function public.claim_youtube_editorial_cover() to service_role;
create or replace function public.dispatch_youtube_editorial_tick(tick_action text)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare settings public.youtube_editorial_worker_settings; issued text; signature text;
begin
  if tick_action not in ('youtube-hourly','youtube-drain') then raise exception 'invalid_tick_action'; end if;
  select * into settings from youtube_editorial_worker_settings where singleton;
  if not settings.enabled then return null; end if;
  if tick_action='youtube-drain' and not exists(select 1 from youtube_editorial_sources where state in ('cover_pending','rewrite_pending')) and not exists (
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
create or replace function public.claim_youtube_editorial_rewrite() returns jsonb
language plpgsql security definer set search_path=public as $$
declare source public.youtube_editorial_sources;
begin
  select * into source from youtube_editorial_sources where state='rewrite_pending'
    order by created_at,video_id for update skip locked limit 1;
  if not found then return null; end if;
  update youtube_editorial_sources set state='generating' where video_id=source.video_id;
  return jsonb_build_object('video_id',source.video_id,'article_id',source.article_id);
end $$;
revoke all on function public.claim_youtube_editorial_rewrite() from public,anon,authenticated;
grant execute on function public.claim_youtube_editorial_rewrite() to service_role;
update public.youtube_editorial_sources s set state='rewrite_pending'
from public.editorial_articles a where a.id=s.article_id and a.status='draft' and a.published_at is null
  and ((s.video_id='cf-AF7LgqpY' and s.article_id='53d6210a-5152-4fe4-b129-5f3eb61be995' and s.state='done')
    or (s.video_id='Kb8TdEnyhSA' and s.article_id='75130457-26e9-45c2-bddf-2f69a5bfd8b8' and s.state='cover_generating'));