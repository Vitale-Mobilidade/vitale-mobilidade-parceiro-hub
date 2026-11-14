begin;

create table public.offers_group_funnel_daily (
  day date not null,
  campaign text not null,
  origin text not null,
  event_name text not null,
  surface text not null,
  bike_id text not null,
  event_count bigint not null check (event_count > 0),
  check (
    (campaign = 'vitale_grupo_ofertas' and origin in ('google', 'meta'))
    or (campaign = 'unattributed' and origin = 'unattributed')
  ),
  check (
    (event_name in ('offers_landing_view', 'offers_cta_click') and surface = '' and bike_id = '')
    or (event_name = 'offers_offer_click' and surface in ('hero', 'grid')
        and bike_id ~ '^[a-z0-9_]{1,64}$')
  ),
  primary key (day, campaign, origin, event_name, surface, bike_id)
);

alter table public.offers_group_funnel_daily enable row level security;
revoke all on table public.offers_group_funnel_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.offers_group_funnel_daily to service_role;
create policy offers_funnel_service_access on public.offers_group_funnel_daily
  for all to service_role using (true) with check (true);

create function public.record_offers_group_funnel(
  p_event_name text, p_origin text, p_surface text, p_bike_id text
)
returns void language sql security invoker set search_path = '' as $$
  insert into public.offers_group_funnel_daily
    (day, campaign, origin, event_name, surface, bike_id, event_count)
  values (
    (now() at time zone 'America/Sao_Paulo')::date,
    case when p_origin in ('google', 'meta') then 'vitale_grupo_ofertas' else 'unattributed' end,
    p_origin, p_event_name, p_surface, p_bike_id, 1
  )
  on conflict (day, campaign, origin, event_name, surface, bike_id)
  do update set event_count = public.offers_group_funnel_daily.event_count + 1;

  delete from public.offers_group_funnel_daily
  where day < (now() at time zone 'America/Sao_Paulo')::date - 365;
$$;

revoke all on function public.record_offers_group_funnel(text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_offers_group_funnel(text,text,text,text) to service_role;

create function public.admin_offers_group_funnel(p_start date, p_end date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'observedDays', count(distinct daily.day),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(aggregate) order by campaign, origin, event_name, surface, bike_id)
      from (
        select campaign, origin, event_name, surface, bike_id, sum(event_count)::bigint as count
        from public.offers_group_funnel_daily
        where day between p_start and p_end
        group by campaign, origin, event_name, surface, bike_id
      ) aggregate
    ), '[]'::jsonb)
  )
  from public.offers_group_funnel_daily daily
  where daily.day between p_start and p_end
    and p_end - p_start between 0 and 365
  having p_end - p_start between 0 and 365;
$$;

revoke all on function public.admin_offers_group_funnel(date,date) from public, anon, authenticated;
grant execute on function public.admin_offers_group_funnel(date,date) to service_role;

commit;
