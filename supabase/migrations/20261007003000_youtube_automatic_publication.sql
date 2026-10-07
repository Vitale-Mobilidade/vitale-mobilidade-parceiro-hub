-- Explicit user authorization: publish newly generated automatic articles after QA.
alter table public.youtube_editorial_sources drop constraint youtube_editorial_sources_state_check;
alter table public.youtube_editorial_sources add constraint youtube_editorial_sources_state_check
 check(state in ('capturing','generating','rewrite_pending','cover_pending','cover_generating','cover_render_pending','cover_rendering','publish_pending','publishing','done','needs_review'));
create or replace function public.claim_youtube_editorial_publication() returns jsonb
language plpgsql security definer set search_path=public as $$
declare source public.youtube_editorial_sources;
begin
 select s.* into source from youtube_editorial_sources s
 join youtube_editorial_inventory i on i.video_id=s.video_id and not i.historical
 join editorial_articles a on a.id=s.article_id and a.status='draft' and a.published_at is null
 where s.state='publish_pending' order by s.created_at,s.video_id for update of s skip locked limit 1;
 if not found then return null; end if;
 update youtube_editorial_sources set state='publishing' where video_id=source.video_id;
 return jsonb_build_object('video_id',source.video_id,'article_id',source.article_id);
end $$;
revoke all on function public.claim_youtube_editorial_publication() from public,anon,authenticated;
grant execute on function public.claim_youtube_editorial_publication() to service_role;
create or replace function public.dispatch_youtube_editorial_tick(tick_action text)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare settings public.youtube_editorial_worker_settings; issued text; signature text;
begin
  if tick_action not in ('youtube-hourly','youtube-drain') then raise exception 'invalid_tick_action'; end if;
  select * into settings from youtube_editorial_worker_settings where singleton;
  if not settings.enabled then return null; end if;
  if tick_action='youtube-drain' and not exists(select 1 from youtube_editorial_sources where state in ('cover_pending','rewrite_pending','cover_render_pending','publish_pending')) and not exists (
    select 1 from youtube_editorial_inventory i where not i.historical
      and not exists(select 1 from youtube_editorial_sources s where s.video_id=i.video_id)
      and not exists(select 1 from editorial_articles a where a.video_id=i.video_id and a.status<>'archived')
  ) then return null; end if;
  if tick_action='youtube-drain' and exists(select 1 from net.http_request_queue where url='https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin') then return null; end if;
  issued:=floor(extract(epoch from clock_timestamp()))::bigint::text;
  signature:=encode(extensions.hmac(convert_to(issued||':'||tick_action,'UTF8'),settings.signing_key,'sha256'),'hex');
  return net.http_post(
    url:='https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
    headers:=jsonb_build_object('Content-Type','application/json','x-youtube-worker-signature',signature,'x-youtube-worker-issued-at',issued),
    body:=jsonb_build_object('action',tick_action),timeout_milliseconds:=180000
  );
end $$;
revoke all on function public.dispatch_youtube_editorial_tick(text) from public,anon,authenticated,service_role;



-- Queue existing completed automatic articles; do not publish them through SQL.
update youtube_editorial_sources s set state='publish_pending'
from youtube_editorial_inventory i, editorial_articles a
where i.video_id=s.video_id and not i.historical and a.id=s.article_id
and s.state='done' and a.status='draft' and a.published_at is null;
