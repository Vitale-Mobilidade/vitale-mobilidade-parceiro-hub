begin;
alter role service_role bypassrls;
set local role service_role;

do $$
declare
  bucket timestamp := date_trunc('hour', now() at time zone 'America/Sao_Paulo');
  report jsonb;
  hour_index int := extract(hour from bucket);
begin
  insert into public.site_analytics_hourly values (bucket - interval '370 days', 99);
  perform public.record_site_analytics('page_view', '/', '', '', '');
  perform public.record_site_analytics('page_view', '/', '', '', '');
  perform public.record_site_analytics('page_view', '/quiz', '', '', '');
  perform public.record_site_analytics('page_view', '/admin/growth', '', '', '');
  perform public.record_site_analytics('page_view', '/conta/anuncios', '', '', '');
  perform public.record_site_analytics('affiliate_click', '/', '', 'bike', 'home');
  if (select views from public.site_analytics_hourly where hour_start = bucket) is distinct from 3::bigint
    or (select count(*) from public.site_analytics_hourly) <> 1
  then raise exception 'Incorrect hourly count, private route filter, or retention'; end if;

  report := public.admin_public_traffic_hours(bucket::date, bucket::date);
  if report->'hours'->hour_index->'views' is distinct from 'null'::jsonb
    or report->'heatmap' <> '[]'::jsonb
  then raise exception 'The first partial hour must be excluded'; end if;

  insert into public.site_analytics_hourly values
    (bucket - interval '8 days 1 hour', 1),
    (bucket - interval '8 days', 8),
    (bucket - interval '1 day', 12);
  report := public.admin_public_traffic_hours(bucket::date, bucket::date);
  if jsonb_array_length(report->'hours') <> 24
    or report->'hours'->hour_index->'views' <> '3'::jsonb
    or report->'hours'->hour_index->'previousViews' <> '12'::jsonb
    or report->'heatmap' @> jsonb_build_array(jsonb_build_object('hour', hour_index))
  then raise exception 'Same-hour comparison or current-hour cutoff incorrect: %', report; end if;

  report := public.admin_public_traffic_hours(bucket::date - 8, bucket::date - 1);
  if not report->'heatmap' @> jsonb_build_array(jsonb_build_object(
    'hour', hour_index, 'weekday', extract(isodow from bucket - interval '1 day')::int,
    'average', 10, 'samples', 2))
  then raise exception 'Incorrect weekday/hour average: %', report; end if;

  if has_function_privilege('anon', 'public.admin_public_traffic_hours(date,date)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.admin_public_traffic_hours(date,date)', 'EXECUTE')
    or has_table_privilege('authenticated', 'public.site_analytics_hourly', 'SELECT')
  then raise exception 'Hourly data must stay private'; end if;
end
$$;
rollback;
