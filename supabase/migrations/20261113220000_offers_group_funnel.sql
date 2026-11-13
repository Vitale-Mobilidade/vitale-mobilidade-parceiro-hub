create table public.offers_group_funnel_daily (
  day date not null,
  origin text not null check (origin in ('google', 'meta', 'unattributed')),
  event_name text not null check (event_name in ('offers_landing_view', 'offers_cta_click')),
  event_count bigint not null check (event_count > 0),
  primary key (day, origin, event_name)
);

alter table public.offers_group_funnel_daily enable row level security;
revoke all on table public.offers_group_funnel_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.offers_group_funnel_daily to service_role;

create function public.record_offers_group_funnel(p_event_name text, p_origin text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.offers_group_funnel_daily (day, origin, event_name, event_count)
  values ((now() at time zone 'America/Sao_Paulo')::date, p_origin, p_event_name, 1)
  on conflict (day, origin, event_name)
  do update set event_count = public.offers_group_funnel_daily.event_count + 1;

  delete from public.offers_group_funnel_daily
  where day < (now() at time zone 'America/Sao_Paulo')::date - 365;
$$;

revoke all on function public.record_offers_group_funnel(text, text) from public, anon, authenticated;
grant execute on function public.record_offers_group_funnel(text, text) to service_role;

create function public.admin_offers_group_funnel(p_start date, p_end date)
returns table (origin text, views bigint, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    daily.origin,
    coalesce(sum(daily.event_count) filter (where daily.event_name = 'offers_landing_view'), 0)::bigint,
    coalesce(sum(daily.event_count) filter (where daily.event_name = 'offers_cta_click'), 0)::bigint
  from public.offers_group_funnel_daily as daily
  where daily.day between p_start and p_end
    and p_end - p_start between 0 and 365
  group by daily.origin;
$$;

revoke all on function public.admin_offers_group_funnel(date, date) from public, anon, authenticated;
grant execute on function public.admin_offers_group_funnel(date, date) to service_role;
