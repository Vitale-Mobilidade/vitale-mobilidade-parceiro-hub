-- Wake the existing drain for due caption waits; no new cron or permissions.
create or replace function public.dispatch_youtube_editorial_tick(tick_action text)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare settings public.youtube_editorial_worker_settings; issued text; signature text;
begin
  if tick_action not in ('youtube-hourly','youtube-drain') then raise exception 'invalid_tick_action'; end if;
  select * into settings from youtube_editorial_worker_settings where singleton;
  if not settings.enabled then return null; end if;
  if tick_action='youtube-drain' and not exists(select 1 from youtube_editorial_sources where state='needs_review' and capture is null and article_id is null and caption_retry_at<=now()) and not exists(select 1 from youtube_editorial_sources where state in ('cover_pending','rewrite_pending','cover_render_pending','publish_pending')) and not exists(select 1 from youtube_editorial_sources where state in ('capturing','generating','cover_generating','cover_rendering','publishing') and state_changed_at < now()-interval '15 minutes') and not exists(select 1 from youtube_editorial_sources s where s.state='needs_review' and s.capture ? 'stallDetectedAt' and not exists(select 1 from editorial_audit_logs l where l.entity_type='video' and l.entity_id=s.video_id and l.action='editorial_alert_sent' and l.created_at>=s.state_changed_at) and not exists(select 1 from editorial_audit_logs l where l.entity_type='video' and l.entity_id=s.video_id and l.action='editorial_alert_failed' and l.created_at>now()-interval '10 minutes')) and not exists (
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
