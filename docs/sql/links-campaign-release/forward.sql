-- Replace only these functions through the official Lovable migration tool.
set local lock_timeout = '2s';
set local statement_timeout = '15s';

CREATE OR REPLACE FUNCTION public.admin_site_analytics_range(p_since date, p_until date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with scoped as (
    select * from public.site_analytics_daily where day >= p_since and day < p_until
      and source_path !~* '^/links/*$'
  ), page_totals as (
    select source_path, sum(event_count)::bigint as count
    from scoped where event_name = 'page_view' group by source_path
  ), page_clicks as (
    select source_path,
      coalesce(sum(event_count) filter (where event_name = 'page_view'), 0) as views,
      coalesce(sum(event_count) filter (where event_name = 'bike_click'), 0) as detail_clicks,
      coalesce(sum(event_count) filter (where event_name = 'affiliate_click'), 0) as offer_clicks
    from scoped group by source_path
    having coalesce(sum(event_count) filter (where event_name in ('bike_click', 'affiliate_click')), 0) > 0
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
    'pageClicks', coalesce((select jsonb_agg(jsonb_build_object('path', source_path, 'views', views, 'detailClicks', detail_clicks, 'offerClicks', offer_clicks) order by offer_clicks desc, detail_clicks desc, source_path) from page_clicks), '[]'::jsonb),
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_public_traffic(p_start date, p_end date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with bounds as (
    select p_end - p_start + 1 as days
    where p_end - p_start between 0 and 365
      and p_start >= date '2020-01-01'
      and p_end <= (now() at time zone 'America/Sao_Paulo')::date
  ), coverage as (
    -- Campaign-only days still have coverage and return zero eligible views.
    select min(day) as first_day, max(day) as last_day
    from public.site_analytics_daily
    where event_name = 'page_view' and event_count > 0
      and source_path !~* '^/(admin|painel-bikes|conta|newsletter/confirmar)(/|$)'
  ), daily as (
    select day, sum(event_count)::bigint as views
    from public.site_analytics_daily, bounds
    where event_name = 'page_view' and day >= p_start - days and day <= p_end
      and source_path !~* '^/(admin|painel-bikes|conta|newsletter/confirmar)(/|$)'
      and source_path !~* '^/(entrenogrupodeofertas|grupodeofertas|links)/*$'
    group by day
  )
  select jsonb_build_object(
    'coverageSince', coverage.first_day,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', p_start + offset_day,
        'views', case when p_start + offset_day between coverage.first_day and coverage.last_day
                      then coalesce(current_day.views, 0) end,
        'previousDate', p_start - bounds.days + offset_day,
        'previousViews', case when p_start - bounds.days + offset_day between coverage.first_day and coverage.last_day
                              then coalesce(previous_day.views, 0) end
      ) order by offset_day)
      from bounds
      cross join generate_series(0, bounds.days - 1) as offsets(offset_day)
      left join daily current_day on current_day.day = p_start + offset_day
      left join daily previous_day on previous_day.day = p_start - bounds.days + offset_day
    ), '[]'::jsonb)
  )
  from coverage;
$function$;

CREATE OR REPLACE FUNCTION public.record_public_traffic_hour()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  bucket timestamp := date_trunc('hour', now() at time zone 'America/Sao_Paulo');
  increment bigint;
  updated_views bigint;
begin
  -- Campaign visits stay in the daily aggregate for Campanhas only.
  if new.source_path ~* '^/links/*$' then return null; end if;
  increment := case when tg_op = 'INSERT' then new.event_count else new.event_count - old.event_count end;
  if increment <= 0 then return null; end if;

  insert into public.site_analytics_hourly (hour_start, views)
  values (bucket, increment)
  on conflict (hour_start) do update set views = public.site_analytics_hourly.views + excluded.views
  returning views into updated_views;

  -- A new hour is the only time the total equals this positive increment.
  if updated_views = increment then
    delete from public.site_analytics_hourly where hour_start < date_trunc('day', bucket) - interval '365 days';
  end if;

  return null;
end;
$function$;
