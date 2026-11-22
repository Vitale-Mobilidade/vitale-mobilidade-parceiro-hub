-- Additive, staged only. Activate through the official migration flow after approval.
set local lock_timeout = '2s';
set local statement_timeout = '15s';
create table public.links_journey_events (
  session_id uuid not null,
  sequence integer not null check (sequence between 0 and 99),
  stage text not null check (stage in ('landing','button_click','page_view','quiz_started','quiz_completed','newsletter_subscribed','offer_click')),
  path text not null check (length(path) between 1 and 220 and path !~ '[?#]' and path ~ '^(/(links|quiz|radar|newsletter|grupodeofertas|conteudos|ferramentas)?|/radar/[a-z0-9_]{1,64}|/conteudos/[a-z0-9]+(-[a-z0-9]+)*|/ferramentas/[a-z0-9-]+)$'),
  choice text not null default '',
  bike_id text not null default '' check (bike_id = '' or bike_id ~ '^[a-z0-9_]{1,64}$'),
  created_at timestamptz not null default now(),
  primary key (session_id, sequence),
  check ((stage='landing' and sequence=0 and path='/links') or (stage<>'landing' and sequence>0)),
  check ((stage='button_click' and path='/links' and choice in ('youtube_video','quiz','whatsapp','radar','newsletter','youtube_channel','instagram','spotify')) or (stage<>'button_click' and choice='')),
  check (stage not in ('quiz_started','quiz_completed') or path='/quiz'),
  check ((stage='offer_click' and bike_id<>'' and path<>'/links') or (stage<>'offer_click' and bike_id=''))
);
grant select,insert,delete on public.links_journey_events to service_role;
create index links_journey_created on public.links_journey_events(created_at);
create index links_journey_landings on public.links_journey_events(created_at,session_id) where stage='landing';
alter table public.links_journey_events enable row level security;
revoke all on public.links_journey_events from public,anon,authenticated;
create policy links_journey_service on public.links_journey_events for all to service_role using (true) with check (true);

create function public.record_links_journey(p_session uuid,p_sequence integer,p_stage text,p_path text,p_choice text,p_bike_id text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  -- Stop long-lived/malformed cohorts even when clients bypass the normal expiry.
  perform pg_advisory_xact_lock(hashtextextended(p_session::text,0));
  if exists (select 1 from public.links_journey_events where session_id=p_session and created_at < now()-interval '2 hours') then return; end if;
  insert into public.links_journey_events(session_id,sequence,stage,path,choice,bike_id)
  values(p_session,p_sequence,p_stage,p_path,p_choice,p_bike_id)
  on conflict(session_id,sequence) do nothing;
  delete from public.links_journey_events where created_at<now()-interval '30 days';
end;
$$;
revoke all on function public.record_links_journey(uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_links_journey(uuid,integer,text,text,text,text) to service_role;

create function public.admin_links_journeys(p_start date,p_end date,p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (
  select p_start::timestamp at time zone 'America/Sao_Paulo' as since, (p_end+1)::timestamp at time zone 'America/Sao_Paulo' as until
  where p_end-p_start between 0 and 365 and p_start >= date '2020-01-01' and p_end <= (now() at time zone 'America/Sao_Paulo')::date
    and p_offset between 0 and 10000 and p_offset%20=0
), cohorts as (
  select e.session_id,e.created_at as started from public.links_journey_events e,bounds b
  where e.stage='landing' and e.created_at>=b.since and e.created_at<b.until and e.created_at>=now()-interval '30 days'
), events as (
  select e.* from public.links_journey_events e join cohorts c using(session_id)
), clicks as (
  select c.*, (select min(sequence) from events e where e.session_id=c.session_id and e.stage='button_click') as first_click
  from cohorts c
), continued as (
  select c.*, (select min(sequence) from events e where e.session_id=c.session_id and e.stage='page_view' and e.path<>'/links' and e.sequence>c.first_click) as next_page
  from clicks c
), sessions as (
  select c.*, exists(select 1 from events e where e.session_id=c.session_id and e.sequence>c.next_page and e.stage in ('quiz_completed','newsletter_subscribed','offer_click')) as converted
  from continued c
), choice_counts as (
  select e.choice,count(distinct e.session_id)::int as sessions,count(*)::int as clicks,
    count(distinct e.session_id) filter(where exists(select 1 from events n where n.session_id=e.session_id and n.sequence>e.sequence and n.stage='page_view' and n.path<>'/links'))::int as continued,
    count(distinct e.session_id) filter(where exists(select 1 from events n where n.session_id=e.session_id and n.sequence>e.sequence and n.stage in ('quiz_completed','newsletter_subscribed','offer_click')))::int as converted
  from events e where e.stage='button_click' group by e.choice
), conversion_counts as (
  select e.stage,count(distinct e.session_id)::int as sessions from events e join clicks c using(session_id)
  where e.stage in ('quiz_started','quiz_completed','newsletter_subscribed','offer_click') and e.sequence>c.first_click group by e.stage
), recent as (
  select * from sessions order by started desc,session_id limit 20 offset p_offset
)
select jsonb_build_object(
  'coverageSince',(select case when min(created_at)<(select until from bounds) then min(created_at) end from public.links_journey_events where stage='landing' and created_at>=now()-interval '30 days'),
  'sessions',(select count(*)::int from sessions),
  'clicked',(select count(*)::int from sessions where first_click is not null),
  'continued',(select count(*)::int from sessions where next_page is not null),
  'converted',(select count(*)::int from sessions where converted),
  'choices',coalesce((select jsonb_agg(jsonb_build_object('choice',choice,'sessions',sessions,'clicks',clicks,'continued',continued,'converted',converted) order by sessions desc,choice) from choice_counts),'[]'::jsonb),
  'conversions',coalesce((select jsonb_agg(jsonb_build_object('stage',stage,'sessions',sessions) order by stage) from conversion_counts),'[]'::jsonb),
  'journeys',coalesce((select jsonb_agg(jsonb_build_object('session',r.session_id,'startedAt',r.started,'steps',(
    select jsonb_agg(jsonb_build_object('sequence',e.sequence,'stage',e.stage,'path',e.path,'choice',e.choice,'bikeId',e.bike_id,'at',e.created_at) order by e.sequence) from events e where e.session_id=r.session_id
  )) order by r.started desc,r.session_id) from recent r),'[]'::jsonb),
  'offset',p_offset
) from bounds;
$$;
revoke all on function public.admin_links_journeys(date,date,integer) from public,anon,authenticated;
grant execute on function public.admin_links_journeys(date,date,integer) to service_role;
