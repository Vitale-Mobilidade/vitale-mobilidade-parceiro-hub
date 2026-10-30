-- Synthetic data only. Run exclusively in the cluster created by the test script.
create role anon;
create role authenticated;
create role service_role;
create table public.bikes (bike_id text primary key);
create table public.bike_offers (bike_id text, is_current boolean, ended_at timestamptz, price numeric, url text);
create table public.quiz_events (field_value text, event_name text, created_at timestamptz);
create table public.site_analytics_daily (bike_id text, event_name text, day date, event_count bigint, position text, source_path text);
revoke all on all tables in schema public from public, anon, authenticated;

insert into public.bikes values ('a'),('b'),('c'),('no_clicks'),('archived'),('ended'),('unsafe');
insert into public.bike_offers
select bike_id, true, case when bike_id='ended' then now() end, 6000,
  case when bike_id='unsafe' then 'https://example.test/offer' else 'https://meli.la/FixtureOnly' end
from public.bikes where bike_id<>'archived';

-- A: 3 Quiz CTA clicks + 2 site clicks = 5. Exclude old/future/non-CTA.
insert into public.quiz_events values
('a','buy_button_clicked', (((now() at time zone 'America/Sao_Paulo')::date-29)::timestamp at time zone 'America/Sao_Paulo')),
('a','secondary_option_clicked',now()-interval '2 hours'),
('a','buy_button_clicked',now()-interval '3 hours'),
('b','buy_button_clicked',now()-interval '1 hour'),
('b','secondary_option_clicked',now()-interval '1 hour'),
('c','buy_button_clicked',now()-interval '1 hour'),
('c','secondary_option_clicked',now()-interval '1 hour'),
('c','buy_button_clicked',now()-interval '2 hours'),
('../a','buy_button_clicked',now()-interval '1 hour'),
('archived','buy_button_clicked',now()-interval '1 hour'),
('ended','buy_button_clicked',now()-interval '1 hour'),
('unsafe','buy_button_clicked',now()-interval '1 hour');

-- Each exclusion would make no_clicks overtake A if it regressed.
insert into public.quiz_events
select 'no_clicks', bad.event_name, bad.created_at
from (values
  ('buy_button_clicked', (((now() at time zone 'America/Sao_Paulo')::date-29)::timestamp at time zone 'America/Sao_Paulo')-interval '1 millisecond'),
  ('buy_button_clicked',now()+interval '1 day'),
  ('primary_offer_popup_clicked',now()-interval '1 hour'),
  ('sdr_purchase_link_clicked',now()-interval '1 hour'),
  ('recommendation_generated',now()-interval '1 hour')
) bad(event_name,created_at) cross join generate_series(1,10);

insert into public.site_analytics_daily values
('a','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date-29,1,'radar_detail','/radar/a'),
('a','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date,1,'radar_detail','/radar/a'),
('no_clicks','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date-30,100,'radar_detail','/radar/no_clicks'),
('no_clicks','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date+1,100,'radar_detail','/radar/no_clicks'),
('no_clicks','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date,100,'quiz_primary','/radar/no_clicks'),
('no_clicks','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date,100,'quiz_secondary','/radar/no_clicks'),
('no_clicks','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date,100,'radar_detail','/quiz'),
('no_clicks','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date,100,'radar_detail','/escolherbike'),
('no_clicks','page_view',(now() at time zone 'America/Sao_Paulo')::date,100,'','/radar/no_clicks'),
('no_clicks','bike_click',(now() at time zone 'America/Sao_Paulo')::date,100,'','/radar'),
('b','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date,2,'content_article','/conteudos/fixture'),
('c','affiliate_click',(now() at time zone 'America/Sao_Paulo')::date,1,'ferramenta_meta_entregas','/ferramentas/meta-entregas');
