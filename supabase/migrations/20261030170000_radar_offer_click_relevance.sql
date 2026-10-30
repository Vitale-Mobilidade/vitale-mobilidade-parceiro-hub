-- Public priority only: no lead, event payload, click count or arbitrary window.
-- Additive/read-only; existing catalog RPCs, writers and RLS remain unchanged.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';

create function public.get_radar_offer_click_ranks_30d()
returns table (bike_id text, relevance_rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select (now() at time zone 'America/Sao_Paulo')::date as today
  ), clicks as (
    select e.field_value as id, count(*)::bigint as total
    from public.quiz_events e cross join bounds
    where e.event_name in ('buy_button_clicked', 'secondary_option_clicked')
      and e.field_value ~ '^[a-z0-9_]{1,64}$'
      and e.created_at >= ((bounds.today - 29)::timestamp at time zone 'America/Sao_Paulo')
      and e.created_at < now()
    group by e.field_value
    union all
    select s.bike_id as id, sum(s.event_count)::bigint as total
    from public.site_analytics_daily s cross join bounds
    where s.event_name = 'affiliate_click'
      and s.bike_id <> ''
      and s.day >= bounds.today - 29 and s.day <= bounds.today
      -- Quiz clicks already exist in quiz_events. Popup/chat secondary events
      -- are not added again either: use exactly the reviewed CTA definition.
      and s.position not in ('quiz_primary', 'quiz_secondary')
      and s.source_path not in ('/quiz', '/escolherbike')
    group by s.bike_id
  ), totals as (
    select id, sum(total) as total from clicks group by id
  ), active as (
    select b.bike_id, coalesce(t.total, 0) as total
    from public.bikes b left join totals t on t.id = b.bike_id
    where exists (
      select 1 from public.bike_offers f
      where f.bike_id = b.bike_id and f.is_current and f.ended_at is null
        and f.price > 0 and f.url ~ '^https://meli\.la/[A-Za-z0-9]+$'
    )
  )
  select active.bike_id, dense_rank() over (order by active.total desc)
  from active
  order by 2, 1;
$$;

revoke all on function public.get_radar_offer_click_ranks_30d() from public;
grant execute on function public.get_radar_offer_click_ranks_30d() to anon, authenticated, service_role;
comment on function public.get_radar_offer_click_ranks_30d() is
  'Offer CTA priority over 30 Sao Paulo calendar days including today; ties share a rank. No PII or click totals.';
commit;
