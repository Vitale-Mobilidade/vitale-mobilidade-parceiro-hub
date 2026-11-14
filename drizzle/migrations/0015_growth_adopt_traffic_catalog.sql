SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
DO $growth_adopt$
DECLARE
  d regprocedure := to_regprocedure('public.admin_public_traffic(date,date)');
  h regprocedure := to_regprocedure('public.admin_public_traffic_hours(date,date)');
  w regprocedure := to_regprocedure('public.record_public_traffic_hour()');
  t regclass := to_regclass('public.site_analytics_hourly');
  trigger_matches boolean;
  trigger_exists boolean;
BEGIN
  SELECT count(*) > 0, coalesce(bool_and(
    tgenabled = 'O' AND NOT tgisinternal AND tgfoid = w AND
    md5(pg_get_triggerdef(oid)) = 'b5f5b9e7a1b3aea51d7adb9f025c0b70'
  ), false) INTO trigger_exists, trigger_matches
  FROM pg_trigger
  WHERE tgrelid = 'public.site_analytics_daily'::regclass
    AND tgname = 'record_public_traffic_hour';

  IF d IS NULL AND h IS NULL AND w IS NULL AND t IS NULL AND NOT trigger_exists THEN
    EXECUTE $grow_sql$-- Mirror of supabase/migrations/20261113210000_admin_public_traffic.sql
create function public.admin_public_traffic(p_start date, p_end date)
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
    select min(day) as first_day, max(day) as last_day
    from public.site_analytics_daily
    where event_name = 'page_view' and event_count > 0
      and source_path !~* '^/(admin|painel-bikes|conta|newsletter/confirmar)(/|$)'
  ), daily as (
    select day, sum(event_count)::bigint as views
    from public.site_analytics_daily, bounds
    where event_name = 'page_view' and day >= p_start - days and day <= p_end
      and source_path !~* '^/(admin|painel-bikes|conta|newsletter/confirmar)(/|$)'
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
$$;$grow_sql$;
    EXECUTE $grow_sql$revoke all on function public.admin_public_traffic(date, date) from public, anon, authenticated;$grow_sql$;
    EXECUTE $grow_sql$grant execute on function public.admin_public_traffic(date, date) to service_role;$grow_sql$;
    EXECUTE $grow_sql$-- Local calendar hours in America/Sao_Paulo. No paths or visitor identifiers.
create table public.site_analytics_hourly (
  hour_start timestamp primary key,
  views bigint not null check (views > 0)
);$grow_sql$;
    EXECUTE $grow_sql$alter table public.site_analytics_hourly enable row level security;$grow_sql$;
    EXECUTE $grow_sql$revoke all on table public.site_analytics_hourly from public, anon, authenticated;$grow_sql$;
    EXECUTE $grow_sql$grant select, insert, update, delete on table public.site_analytics_hourly to service_role;$grow_sql$;
    EXECUTE $grow_sql$create function public.record_public_traffic_hour()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bucket timestamp := date_trunc('hour', now() at time zone 'America/Sao_Paulo');
  increment bigint;
  updated_views bigint;
begin
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
$$;$grow_sql$;
    EXECUTE $grow_sql$revoke all on function public.record_public_traffic_hour() from public, anon, authenticated;$grow_sql$;
    EXECUTE $grow_sql$grant execute on function public.record_public_traffic_hour() to service_role;$grow_sql$;
    EXECUTE $grow_sql$create trigger record_public_traffic_hour
after insert or update of event_count on public.site_analytics_daily
for each row
when (
  new.event_name = 'page_view'
  and new.source_path !~* '^/(admin|painel-bikes|conta|newsletter/confirmar)(/|$)'
  and new.day = (now() at time zone 'America/Sao_Paulo')::date
)
execute function public.record_public_traffic_hour();$grow_sql$;
    EXECUTE $grow_sql$create function public.admin_public_traffic_hours(p_start date, p_end date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with clock as (
    select date_trunc('hour', now() at time zone 'America/Sao_Paulo') as current_hour
  ), bounds as (
    select p_start::timestamp as start_at, (p_end + 1)::timestamp as end_at, current_hour
    from clock
    where p_end - p_start between 0 and 365 and p_start >= date '2020-01-01'
      and p_end <= current_hour::date
  ), coverage as (
    select min(hour_start) as first_hour, max(hour_start) as last_hour
    from public.site_analytics_hourly
  ), hours as (
    select series.bucket,
           case when series.bucket > coverage.first_hour and series.bucket <= coverage.last_hour
                then coalesce(hourly.views, 0) end as views
    from bounds
    cross join coverage
    cross join lateral generate_series(
      case when p_start = p_end then start_at - interval '1 day' else start_at end,
      end_at - interval '1 hour', interval '1 hour'
    ) as series(bucket)
    left join public.site_analytics_hourly hourly on hourly.hour_start = series.bucket
  ), heatmap as (
    select extract(isodow from bucket)::int as weekday, extract(hour from bucket)::int as hour,
           round(avg(views), 1) as average, count(*) as samples
    from hours cross join bounds
    where views is not null and bucket >= start_at and bucket < current_hour
    group by 1, 2
  )
  select jsonb_build_object(
    'coverageSince', (select first_hour from coverage),
    'currentHour', (select current_hour from clock),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object(
        'hour', extract(hour from selected.bucket)::int,
        'views', selected.views,
        'previousViews', previous.views
      ) order by selected.bucket)
      from hours selected
      left join hours previous on previous.bucket = selected.bucket - interval '1 day'
      where p_start = p_end and selected.bucket >= p_start::timestamp
    ), '[]'::jsonb),
    'heatmap', coalesce((select jsonb_agg(to_jsonb(heatmap) order by weekday, hour) from heatmap), '[]'::jsonb)
  );
$$;$grow_sql$;
    EXECUTE $grow_sql$revoke all on function public.admin_public_traffic_hours(date, date) from public, anon, authenticated;$grow_sql$;
    EXECUTE $grow_sql$grant execute on function public.admin_public_traffic_hours(date, date) to service_role;$grow_sql$;
    RETURN;
  END IF;

  IF d IS NULL OR h IS NULL OR w IS NULL OR t IS NULL OR NOT trigger_matches
    OR 3 <> (SELECT count(*) FROM pg_proc p
      WHERE NOT p.prosecdef AND p.proconfig = ARRAY['search_path=""']
        AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND has_function_privilege('service_role', p.oid, 'EXECUTE')
        AND EXISTS (SELECT 1 FROM (VALUES
          (d, 'b4b00db66d97bfe820476da43296ad4dbcbe8cccde821432fcf558b2be437505', 's', 'jsonb'::regtype, 'sql'),
          (h, 'f7e55b0b939d8480abc646f6c7290472252594476114e1a4b8dec223d2bd6b3c', 's', 'jsonb'::regtype, 'sql'),
          (w, '5996cf660dee9b9734dc37b0c352e78abf22b6f1cea979a764e38b9be7d6d1fd', 'v', 'trigger'::regtype, 'plpgsql')
        ) expected(fn, hash, volatility, returns, language)
        JOIN pg_language l ON l.oid = p.prolang AND l.lanname = expected.language
        WHERE p.oid = expected.fn AND p.prorettype = expected.returns
          AND p.provolatile::text = expected.volatility
          AND encode(sha256(convert_to(btrim(p.prosrc, chr(32) || chr(9) || chr(10) || chr(13)), 'UTF8')), 'hex') = expected.hash))
    OR NOT EXISTS (SELECT FROM pg_class WHERE oid = t AND relkind = 'r' AND relrowsecurity AND NOT relforcerowsecurity)
    OR EXISTS (SELECT FROM pg_policy WHERE polrelid = t)
    OR 2 <> (SELECT count(*) FROM pg_attribute WHERE attrelid = t AND attnum > 0 AND NOT attisdropped)
    OR 2 <> (SELECT count(*) FROM pg_attribute WHERE attrelid = t AND attnum > 0 AND NOT attisdropped AND attnotnull
      AND ((attname='hour_start' AND atttypid='timestamp'::regtype) OR (attname='views' AND atttypid='bigint'::regtype)))
    OR 2 <> (SELECT count(*) FROM pg_constraint WHERE conrelid = t AND convalidated AND
      pg_get_constraintdef(oid) IN ('PRIMARY KEY (hour_start)', 'CHECK ((views > 0))'))
    OR EXISTS (SELECT FROM aclexplode((SELECT relacl FROM pg_class WHERE oid=t)) a
      WHERE a.grantee IN (0,'anon'::regrole,'authenticated'::regrole))
    OR 4 <> (SELECT count(*) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) perm
      WHERE has_table_privilege('service_role', t, perm))
  THEN
    RAISE EXCEPTION 'Growth catalog differs from validated release; no object was changed';
  END IF;
END
$growth_adopt$;