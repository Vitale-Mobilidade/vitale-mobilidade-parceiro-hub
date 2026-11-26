-- Adição isolada. Aplicar somente pelo mecanismo oficial após autorização.
create table public.wosi_campaign_clicks_daily (
  day date not null,
  source_path text not null check (length(source_path) between 1 and 220 and source_path ~ '^/[a-z0-9/_-]*$' and source_path !~ '^/(admin|api|conta|painel-bikes)(/|$)'),
  surface text not null check (surface in ('site', 'article')),
  clicks bigint not null default 0 check (clicks >= 0),
  primary key (day, source_path, surface)
);
alter table public.wosi_campaign_clicks_daily enable row level security;
revoke all on table public.wosi_campaign_clicks_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.wosi_campaign_clicks_daily to service_role;

create function public.record_wosi_campaign_click(p_source_path text, p_surface text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.wosi_campaign_clicks_daily(day, source_path, surface, clicks)
  values ((now() at time zone 'America/Sao_Paulo')::date, p_source_path, p_surface, 1)
  on conflict (day, source_path, surface) do update
  set clicks = public.wosi_campaign_clicks_daily.clicks + 1;
  delete from public.wosi_campaign_clicks_daily
    where day < (now() at time zone 'America/Sao_Paulo')::date - 365;
end;
$$;
revoke all on function public.record_wosi_campaign_click(text,text) from public, anon, authenticated;
grant execute on function public.record_wosi_campaign_click(text,text) to service_role;

create function public.admin_wosi_campaign(p_start date, p_end date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare report jsonb;
begin
  if p_start is null or p_end is null or p_start > p_end or p_end - p_start > 365 then
    raise exception 'invalid_period';
  end if;
  with scoped as (
    select * from public.wosi_campaign_clicks_daily where day between p_start and p_end
  ), days as (
    select day, sum(clicks) as clicks from scoped group by day
  )
  select jsonb_build_object(
    'startDate', p_start, 'endDate', p_end,
    'clicks', coalesce((select sum(clicks) from scoped),0),
    'surfaces', jsonb_build_object(
      'site', coalesce((select sum(clicks) from scoped where surface = 'site'),0),
      'article', coalesce((select sum(clicks) from scoped where surface = 'article'),0)),
    'days', coalesce((select jsonb_agg(jsonb_build_object('date',day,'clicks',clicks) order by day) from days),'[]'::jsonb)
  ) into report;
  return report;
end;
$$;
revoke all on function public.admin_wosi_campaign(date,date) from public, anon, authenticated;
grant execute on function public.admin_wosi_campaign(date,date) to service_role;
