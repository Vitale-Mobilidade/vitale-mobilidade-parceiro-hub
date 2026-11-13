-- Run after the base analytics and public traffic migrations in a disposable database.
begin;
truncate public.site_analytics_daily;
insert into public.site_analytics_daily (day, event_name, source_path, event_count)
values
  ('2026-10-01', 'page_view', '/admin', 999),
  ('2026-10-02', 'page_view', '/', 10),
  ('2026-10-04', 'page_view', '/quiz', 20),
  ('2026-10-04', 'page_view', '/admin/growth', 999),
  ('2026-10-04', 'page_view', '/ADMIN', 999),
  ('2026-10-04', 'page_view', '/painel-bikes', 999),
  ('2026-10-04', 'page_view', '/conta/anuncios', 999),
  ('2026-10-04', 'page_view', '/newsletter/confirmar', 999),
  ('2026-10-04', 'page_view', '/', 5),
  ('2026-10-06', 'page_view', '/radar', 8);
insert into public.site_analytics_daily (day, event_name, source_path, bike_id, position, event_count)
values ('2026-10-05', 'affiliate_click', '/', 'bike', 'home', 50);

do $$
declare
  traffic jsonb := public.admin_public_traffic('2026-10-04', '2026-10-06');
begin
  if traffic is distinct from '{
    "coverageSince": "2026-10-02",
    "days": [
      {"date":"2026-10-04","views":25,"previousDate":"2026-10-01","previousViews":null},
      {"date":"2026-10-05","views":0,"previousDate":"2026-10-02","previousViews":10},
      {"date":"2026-10-06","views":8,"previousDate":"2026-10-03","previousViews":0}
    ]
  }'::jsonb then
    raise exception 'Unexpected comparison: %', traffic;
  end if;
  if public.admin_public_traffic('2026-10-07', '2026-10-07') #> '{days,0,views}' is distinct from 'null'::jsonb then
    raise exception 'A day after the latest record must have unknown coverage';
  end if;
  if jsonb_array_length(public.admin_public_traffic('2025-10-06', '2026-10-06')->'days') <> 366
    or public.admin_public_traffic('2025-10-05', '2026-10-06')->'days' <> '[]'::jsonb
    or public.admin_public_traffic('2026-10-06', '2026-10-05')->'days' <> '[]'::jsonb
  then
    raise exception 'Window bounds incorrect';
  end if;
  if has_function_privilege('anon', 'public.admin_public_traffic(date,date)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.admin_public_traffic(date,date)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.admin_public_traffic(date,date)', 'EXECUTE')
  then
    raise exception 'Unexpected RPC privileges';
  end if;
end
$$;

-- Exercise invocation as the same database role used by the Edge Function.
alter role service_role bypassrls;
set local role service_role;
select public.admin_public_traffic('2026-10-04', '2026-10-06');
rollback;
