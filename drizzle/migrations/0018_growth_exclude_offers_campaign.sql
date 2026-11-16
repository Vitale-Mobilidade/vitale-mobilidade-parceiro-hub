-- Apply through the official project migration flow. CREATE OR REPLACE preserves RPC grants.
set local lock_timeout = '2s';
set local statement_timeout = '15s';

create or replace function public.admin_public_traffic(p_start date, p_end date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
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
      and source_path !~* '^/(entrenogrupodeofertas|grupodeofertas)/*$'
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
$$;