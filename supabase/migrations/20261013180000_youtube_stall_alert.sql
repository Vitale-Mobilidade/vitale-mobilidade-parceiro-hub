-- Additive state lease timestamp; interrupted paid calls are never replayed.
ALTER TABLE public.youtube_editorial_sources ADD COLUMN IF NOT EXISTS state_changed_at timestamptz NOT NULL DEFAULT now();
-- Existing in-flight text jobs retain their real start time for reconciliation.
UPDATE public.youtube_editorial_sources s SET state_changed_at = COALESCE(
  (SELECT max(r.started_at) FROM public.editorial_compiler_runs r WHERE r.article_id=s.article_id AND r.status='running'), now())
WHERE s.state IN ('capturing','generating','cover_generating','cover_rendering','publishing');

CREATE OR REPLACE FUNCTION public.track_youtube_editorial_state() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state THEN NEW.state_changed_at := now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS youtube_editorial_state_timestamp ON public.youtube_editorial_sources;
CREATE TRIGGER youtube_editorial_state_timestamp BEFORE UPDATE ON public.youtube_editorial_sources
FOR EACH ROW EXECUTE FUNCTION public.track_youtube_editorial_state();
REVOKE ALL ON FUNCTION public.track_youtube_editorial_state() FROM public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_youtube_editorial_stalls() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE source public.youtube_editorial_sources; result jsonb;
BEGIN
  FOR source IN SELECT * FROM youtube_editorial_sources
    WHERE state IN ('capturing','generating','cover_generating','cover_rendering','publishing')
      AND state_changed_at < now()-interval '15 minutes'
    ORDER BY state_changed_at,video_id FOR UPDATE SKIP LOCKED LIMIT 20
  LOOP
    UPDATE youtube_editorial_sources SET state='needs_review', capture=COALESCE(capture,'{}'::jsonb)||
      jsonb_build_object('stallDetectedAt',now(),'stalledState',source.state)
    WHERE video_id=source.video_id AND state=source.state;
    UPDATE editorial_compiler_runs SET status='failed',error_code='automatic_stage_interrupted',completed_at=now()
    WHERE article_id=source.article_id AND status='running' AND started_at<now()-interval '15 minutes';
  END LOOP;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('video_id',pending.video_id,'article_id',pending.article_id,
    'state_changed_at',pending.state_changed_at)), '[]'::jsonb) INTO result
  FROM (SELECT s.* FROM youtube_editorial_sources s
    WHERE s.state='needs_review' AND s.capture ? 'stallDetectedAt'
      AND NOT EXISTS(SELECT 1 FROM editorial_audit_logs l WHERE l.entity_type='video' AND l.entity_id=s.video_id
        AND l.action='editorial_alert_sent' AND l.created_at>=s.state_changed_at)
      AND NOT EXISTS(SELECT 1 FROM editorial_audit_logs l WHERE l.entity_type='video' AND l.entity_id=s.video_id
        AND l.action='editorial_alert_failed' AND l.created_at>now()-interval '10 minutes')
    ORDER BY s.state_changed_at,s.video_id LIMIT 5) pending;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_youtube_editorial_stalls() FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_youtube_editorial_stalls() TO service_role;

create or replace function public.dispatch_youtube_editorial_tick(tick_action text)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare settings public.youtube_editorial_worker_settings; issued text; signature text;
begin
  if tick_action not in ('youtube-hourly','youtube-drain') then raise exception 'invalid_tick_action'; end if;
  select * into settings from youtube_editorial_worker_settings where singleton;
  if not settings.enabled then return null; end if;
  if tick_action='youtube-drain' and not exists(select 1 from youtube_editorial_sources where state in ('cover_pending','rewrite_pending','cover_render_pending','publish_pending')) and not exists(select 1 from youtube_editorial_sources where state in ('capturing','generating','cover_generating','cover_rendering','publishing') and state_changed_at < now()-interval '15 minutes') and not exists(select 1 from youtube_editorial_sources s where s.state='needs_review' and s.capture ? 'stallDetectedAt' and not exists(select 1 from editorial_audit_logs l where l.entity_type='video' and l.entity_id=s.video_id and l.action='editorial_alert_sent' and l.created_at>=s.state_changed_at) and not exists(select 1 from editorial_audit_logs l where l.entity_type='video' and l.entity_id=s.video_id and l.action='editorial_alert_failed' and l.created_at>now()-interval '10 minutes')) and not exists (
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
