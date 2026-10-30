set timezone='Asia/Tokyo';
set role anon;
do $$
declare result jsonb;
begin
  select jsonb_object_agg(bike_id,relevance_rank) into result from public.get_radar_offer_click_ranks_30d();
  if result <> '{"a":1,"b":2,"c":2,"no_clicks":3}'::jsonb then
    raise exception 'Wrong ranking, boundary, deduplication or active-offer filtering: %', result;
  end if;
  begin
    perform * from public.quiz_events;
    raise exception 'anon obtained raw events';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from jsonb_object_keys((select to_jsonb(r) from public.get_radar_offer_click_ranks_30d() r limit 1))) <> 2 then
    raise exception 'Public contract exposes more than bike_id and rank';
  end if;
end $$;
reset role;
set timezone='UTC';
set role authenticated;
do $$ begin
  if (select relevance_rank from public.get_radar_offer_click_ranks_30d() where bike_id='a') <> 1 then
    raise exception 'Result depends on session timezone';
  end if;
end $$;
reset role;
-- The fixture owner is the only writer; no production database is contacted.
truncate public.quiz_events, public.site_analytics_daily;
set role anon;
do $$ begin
  if (select count(*) from public.get_radar_offer_click_ranks_30d() where relevance_rank=1) <> 4 then
    raise exception 'Zero-click bikes must tie, allowing app A-Z';
  end if;
end $$;
reset role;
-- Rollback is additive: removing the new function does not touch source tables.
drop function public.get_radar_offer_click_ranks_30d();
select 'PASS: 30-day boundary, timezone, CTA-only, Quiz deduplication, ties, active offers, public permissions, empty history and rollback' as result;
