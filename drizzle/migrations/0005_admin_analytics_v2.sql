-- Applied verbatim from supabase/migrations/20261008160000_admin_analytics_v2.sql (merge 78c7c455).
create table public.site_analytics_daily (
  day date not null,
  event_name text not null check (event_name in ('page_view', 'bike_click', 'affiliate_click')),
  source_path text not null check (length(source_path) between 1 and 220 and source_path like '/%' and source_path !~ '[?#]'),
  target_path text not null default '' check (length(target_path) <= 220 and target_path !~ '[?#]'),
  bike_id text not null default '' check (bike_id = '' or bike_id ~ '^[a-z0-9_]{1,64}$'),
  position text not null default '' check (position = '' or position ~ '^[a-z0-9_]{1,64}$'),
  event_count bigint not null default 0 check (event_count >= 0),
  primary key (day, event_name, source_path, target_path, bike_id, position),
  check (
    (event_name = 'page_view' and target_path = '' and bike_id = '' and position = '') or
    (event_name = 'bike_click' and target_path = '/radar/' || bike_id and bike_id <> '' and position = '') or
    (event_name = 'affiliate_click' and target_path = '' and bike_id <> '' and position <> '')
  )
);

create index site_analytics_daily_event_day_idx on public.site_analytics_daily (event_name, day);
create index site_analytics_daily_bike_day_idx on public.site_analytics_daily (bike_id, day) where bike_id <> '';

alter table public.site_analytics_daily enable row level security;
revoke all on table public.site_analytics_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.site_analytics_daily to service_role;

create function public.record_site_analytics(
  p_event_name text,
  p_source_path text,
  p_target_path text,
  p_bike_id text,
  p_position text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.site_analytics_daily (
    day, event_name, source_path, target_path, bike_id, position, event_count
  ) values (
    (now() at time zone 'America/Sao_Paulo')::date,
    p_event_name,
    p_source_path,
    coalesce(p_target_path, ''),
    coalesce(p_bike_id, ''),
    coalesce(p_position, ''),
    1
  )
  on conflict (day, event_name, source_path, target_path, bike_id, position)
  do update set event_count = public.site_analytics_daily.event_count + 1;

  -- Retention is enforced on the next successful write; no destructive release step is needed.
  delete from public.site_analytics_daily
  where day < (now() at time zone 'America/Sao_Paulo')::date - 365;
end;
$$;

revoke all on function public.record_site_analytics(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_site_analytics(text, text, text, text, text) to service_role;

-- Exact, PII-free recommendation and Quiz CTA click aggregation.
create function public.admin_quiz_bike_metrics(p_since timestamptz)
returns table (
  bike_id text,
  bike_name text,
  primary_recommendations bigint,
  secondary_recommendations bigint,
  quiz_offer_clicks bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recommendations as (
    select recommended_bike_1 as id, count(*)::bigint as primary_count, 0::bigint as secondary_count
    from public.quiz_leads
    where status = 'completo' and completed_at >= p_since and recommended_bike_1 ~ '^[a-z0-9_]{1,64}$'
    group by recommended_bike_1
    union all
    select recommended_bike_2 as id, 0::bigint, count(*)::bigint
    from public.quiz_leads
    where status = 'completo' and completed_at >= p_since and recommended_bike_2 ~ '^[a-z0-9_]{1,64}$'
    group by recommended_bike_2
  ), rec as (
    select id, sum(primary_count)::bigint as primary_count, sum(secondary_count)::bigint as secondary_count
    from recommendations group by id
  ), clicks as (
    select field_value as id, count(*)::bigint as click_count
    from public.quiz_events
    where created_at >= p_since
      and event_name in ('buy_button_clicked', 'secondary_option_clicked')
      and field_value ~ '^[a-z0-9_]{1,64}$'
    group by field_value
  ), ids as (
    select id from rec union select id from clicks
  )
  select ids.id,
         coalesce(b.name, ids.id),
         coalesce(rec.primary_count, 0),
         coalesce(rec.secondary_count, 0),
         coalesce(clicks.click_count, 0)
  from ids
  left join public.bikes b on b.bike_id = ids.id
  left join rec on rec.id = ids.id
  left join clicks on clicks.id = ids.id
  order by coalesce(rec.primary_count, 0) + coalesce(rec.secondary_count, 0) desc, ids.id;
$$;

revoke all on function public.admin_quiz_bike_metrics(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_quiz_bike_metrics(timestamptz) to service_role;

-- Sitewide aggregates are built in PostgreSQL so the Admin never enumerates raw rows.
create function public.admin_site_analytics_metrics(p_since date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    select * from public.site_analytics_daily where day >= p_since
  ), page_totals as (
    select source_path, sum(event_count)::bigint as count
    from scoped where event_name = 'page_view' group by source_path
  ), bike_totals as (
    select bike_id,
           (sum(event_count) filter (where event_name = 'bike_click'))::bigint as detail_clicks,
           (sum(event_count) filter (where event_name = 'affiliate_click'))::bigint as offer_clicks
    from scoped where bike_id <> '' group by bike_id
  ), bike_origins as (
    select bike_id, source_path,
           (sum(event_count) filter (where event_name = 'bike_click'))::bigint as detail_clicks,
           (sum(event_count) filter (where event_name = 'affiliate_click'))::bigint as offer_clicks
    from scoped where bike_id <> '' group by bike_id, source_path
  )
  select jsonb_build_object(
    'coverageSince', (select min(day) from public.site_analytics_daily),
    'pageViews', coalesce((select sum(event_count) from scoped where event_name = 'page_view'), 0),
    'bikeClicks', coalesce((select sum(event_count) from scoped where event_name = 'bike_click'), 0),
    'affiliateClicks', coalesce((select sum(event_count) from scoped where event_name = 'affiliate_click'), 0),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('path', source_path, 'views', count) order by count desc, source_path) from (select * from page_totals order by count desc, source_path limit 20) p), '[]'::jsonb),
    'bikes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'bikeId', bt.bike_id,
        'name', coalesce(b.name, bt.bike_id),
        'detailClicks', coalesce(bt.detail_clicks, 0),
        'offerClicks', coalesce(bt.offer_clicks, 0),
        'origins', coalesce((
          select jsonb_agg(jsonb_build_object(
            'path', bo.source_path,
            'detailClicks', coalesce(bo.detail_clicks, 0),
            'offerClicks', coalesce(bo.offer_clicks, 0)
          ) order by coalesce(bo.detail_clicks, 0) + coalesce(bo.offer_clicks, 0) desc, bo.source_path)
          from bike_origins bo where bo.bike_id = bt.bike_id
        ), '[]'::jsonb)
      ) order by coalesce(bt.detail_clicks, 0) + coalesce(bt.offer_clicks, 0) desc, bt.bike_id)
      from bike_totals bt left join public.bikes b on b.bike_id = bt.bike_id
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_site_analytics_metrics(date) from public, anon, authenticated;
grant execute on function public.admin_site_analytics_metrics(date) to service_role;