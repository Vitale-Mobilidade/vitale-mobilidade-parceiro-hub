-- Paid backgrounds are private durable assets; rendering never calls the image model again.
alter table public.youtube_editorial_sources drop constraint youtube_editorial_sources_state_check;
alter table public.youtube_editorial_sources add constraint youtube_editorial_sources_state_check
  check(state in ('capturing','generating','rewrite_pending','cover_pending','cover_generating','cover_render_pending','cover_rendering','done','needs_review'));
-- Cloud storage tool configured editorial-covers private with file_size_limit=8388608 before this migration.
-- Cloud's SQL migration API refuses storage.buckets writes; apply that configuration separately on another host.
create or replace function public.claim_youtube_editorial_cover_render() returns jsonb
language plpgsql security definer set search_path=public as $$
declare source public.youtube_editorial_sources;
begin
  select * into source from youtube_editorial_sources where state='cover_render_pending'
    order by created_at,video_id for update skip locked limit 1;
  if not found then return null; end if;
  update youtube_editorial_sources set state='cover_rendering' where video_id=source.video_id;
  return jsonb_build_object('video_id',source.video_id,'article_id',source.article_id,'background',source.capture->'coverBackground');
end $$;
revoke all on function public.claim_youtube_editorial_cover_render() from public,anon,authenticated;
grant execute on function public.claim_youtube_editorial_cover_render() to service_role;
create or replace function public.dispatch_youtube_editorial_tick(tick_action text)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare settings public.youtube_editorial_worker_settings; issued text; signature text;
begin
  if tick_action not in ('youtube-hourly','youtube-drain') then raise exception 'invalid_tick_action'; end if;
  select * into settings from youtube_editorial_worker_settings where singleton;
  if not settings.enabled then return null; end if;
  if tick_action='youtube-drain' and not exists(select 1 from youtube_editorial_sources where state in ('cover_pending','rewrite_pending','cover_render_pending')) and not exists (
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


-- Known failed composition (image was generated but never stored) after local reproduction/fix.
-- One controlled recovery by the same automatic queue; no general image-failure retry.
update public.youtube_editorial_sources s set state='cover_pending'
from public.editorial_articles a where a.id=s.article_id and a.status='draft' and a.published_at is null
  and s.video_id='QU72tOgHfCc' and s.article_id='9ea9d27c-aff5-4585-8496-66e3dde9e757' and s.state='needs_review'
  and jsonb_array_length(a.blocks)>0 and a.og_image_url like 'https://i.ytimg.com/vi/QU72tOgHfCc/%';
