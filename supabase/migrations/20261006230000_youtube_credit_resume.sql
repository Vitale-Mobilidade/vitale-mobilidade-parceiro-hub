-- A settled HTTP 402 with an empty draft may resume after the operator enables the worker again.
-- Timeouts, running/completed AI results, nonempty articles and cover failures remain blocked.
grant update(enabled) on public.youtube_editorial_worker_settings to service_role;
create or replace function public.ingest_youtube_editorial_snapshot(video_ids text[]) returns text
language plpgsql security definer set search_path = public as $$
declare first_snapshot boolean; candidate text;
begin
  if cardinality(video_ids)=0 or video_ids is null or exists(select 1 from unnest(video_ids) v where v is null or v !~ '^[A-Za-z0-9_-]{11}$') then raise exception 'invalid_snapshot'; end if;
  select not initialized into first_snapshot from youtube_editorial_snapshot_state where singleton for update;
  insert into youtube_editorial_inventory(video_id,historical)
    select distinct v,first_snapshot from unnest(video_ids) v on conflict(video_id) do nothing;
  update youtube_editorial_snapshot_state set initialized=true where singleton;
  if first_snapshot then return null; end if;
  select i.video_id into candidate from youtube_editorial_inventory i
    where not i.historical and i.video_id=any(video_ids) and (
      (not exists(select 1 from youtube_editorial_sources s where s.video_id=i.video_id)
       and not exists(select 1 from editorial_articles a where a.video_id=i.video_id and a.status<>'archived'))
      or exists(
        select 1 from youtube_editorial_sources s join editorial_articles a on a.id=s.article_id
        where s.video_id=i.video_id and s.state='needs_review' and a.status='draft'
          and a.blocks='[]'::jsonb and a.published_at is null
          and exists(select 1 from editorial_compiler_runs r where r.article_id=a.id and r.status='failed' and r.error_code='ai_http_402')
          and not exists(select 1 from editorial_compiler_runs r where r.article_id=a.id and (r.status<>'failed' or r.error_code is distinct from 'ai_http_402'))
      )
    ) order by i.created_at,i.video_id limit 1;
  return candidate;
end $$;
